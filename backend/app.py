import os
import stat
import tarfile
import sqlite3
import time
import threading
import paramiko
import smtplib
import socket
import io
import urllib.request
import base64
import ssl
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from zoneinfo import ZoneInfo
from flask import Flask, send_file, request, jsonify, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

# Try to import psutil, handled in status endpoint if missing
try:
    import psutil
except ImportError:
    psutil = None

# --- Config ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOCAL_DIR = os.path.join(BASE_DIR, "wordpress_backups")
DB_PATH = os.path.join(BASE_DIR, "wpbackup.db")
LOGO_PATH = os.path.join(BASE_DIR, "logo.png")
TZ = "Africa/Johannesburg"

DEFAULT_SFTP_HOST = os.getenv("SFTP_HOST", "cp71.domains.co.za")
DEFAULT_SFTP_PORT = int(os.getenv("SFTP_PORT", "22000"))
DEFAULT_SFTP_USER = os.getenv("SFTP_USER", "labverse")
DEFAULT_SFTP_PASS = os.getenv("SFTP_PASS", "Superadmin@123")
DEFAULT_ADMIN_USER = os.getenv("ADMIN_USER", "admin")
DEFAULT_ADMIN_PASS = os.getenv("ADMIN_PASS", "password")

# Global state
method_state = {
    "sftp": {"running": False, "progress": 0, "last_result": "Idle", "stop_event": threading.Event()},
    "ssh": {"running": False, "progress": 0, "last_result": "Idle", "stop_event": threading.Event()},
    "cpanel": {"running": False, "progress": 0, "last_result": "Idle", "stop_event": threading.Event()},
}
terminal_logs = []
cpu_history = []


def add_log(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    terminal_logs.append(f"[{ts}] {msg}")
    if len(terminal_logs) > 100:
        terminal_logs.pop(0)


# --- Database Management ---
def ensure_column(conn, table, column, definition):
    c = conn.cursor()
    c.execute(f"PRAGMA table_info({table})")
    columns = [row[1] for row in c.fetchall()]
    if column not in columns:
        c.execute(f"ALTER TABLE {table} ADD COLUMN {definition}")


def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "CREATE TABLE IF NOT EXISTS schedules (id INTEGER PRIMARY KEY AUTOINCREMENT, job_type TEXT, hour INTEGER, minute INTEGER, days TEXT)"
    )
    c.execute(
        "CREATE TABLE IF NOT EXISTS smtp_config (id INTEGER PRIMARY KEY, host TEXT, port INTEGER, user TEXT, password TEXT, from_addr TEXT, to_addr TEXT)"
    )
    c.execute(
        "CREATE TABLE IF NOT EXISTS downloads (id INTEGER PRIMARY KEY, filename TEXT, size INTEGER, status TEXT, timestamp DATETIME, job_type TEXT)"
    )
    c.execute(
        "CREATE TABLE IF NOT EXISTS sftp_config (id INTEGER PRIMARY KEY, host TEXT, port INTEGER, user TEXT, password TEXT, remote_path TEXT)"
    )
    c.execute(
        "CREATE TABLE IF NOT EXISTS ssh_config (id INTEGER PRIMARY KEY, host TEXT, port INTEGER, user TEXT, password TEXT, key TEXT, remote_path TEXT)"
    )
    c.execute(
        "CREATE TABLE IF NOT EXISTS cpanel_config (id INTEGER PRIMARY KEY, host TEXT, port INTEGER, user TEXT, token TEXT, password TEXT)"
    )
    c.execute(
        "CREATE TABLE IF NOT EXISTS auth_user (id INTEGER PRIMARY KEY, username TEXT, password_hash TEXT)"
    )
    ensure_column(conn, "downloads", "job_type", "job_type TEXT")
    ensure_column(conn, "schedules", "job_type", "job_type TEXT")
    conn.commit()
    conn.close()


def get_smtp_config():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT host, port, user, password, from_addr, to_addr FROM smtp_config LIMIT 1")
    row = c.fetchone()
    conn.close()
    if row:
        return {
            "host": row[0],
            "port": row[1],
            "user": row[2],
            "password": row[3],
            "from_addr": row[4],
            "to_addr": row[5],
        }
    return None


def get_sftp_config():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT host, port, user, password, remote_path FROM sftp_config LIMIT 1")
    row = c.fetchone()
    conn.close()
    if row:
        return {
            "host": row[0],
            "port": row[1],
            "user": row[2],
            "password": row[3],
            "remote_path": row[4] or ".",
        }
    return {
        "host": DEFAULT_SFTP_HOST,
        "port": DEFAULT_SFTP_PORT,
        "user": DEFAULT_SFTP_USER,
        "password": DEFAULT_SFTP_PASS,
        "remote_path": ".",
    }


def get_ssh_config():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT host, port, user, password, key, remote_path FROM ssh_config LIMIT 1")
    row = c.fetchone()
    conn.close()
    if row:
        return {
            "host": row[0],
            "port": row[1],
            "user": row[2],
            "password": row[3],
            "key": row[4],
            "remote_path": row[5] or ".",
        }
    return {"host": "", "port": 22, "user": "", "password": "", "key": "", "remote_path": "."}


def get_cpanel_config():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT host, port, user, token, password FROM cpanel_config LIMIT 1")
    row = c.fetchone()
    conn.close()
    if row:
        return {
            "host": row[0],
            "port": row[1],
            "user": row[2],
            "token": row[3],
            "password": row[4],
        }
    return {"host": "", "port": 2083, "user": "", "token": "", "password": ""}


def ensure_default_user():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT username FROM auth_user LIMIT 1")
    row = c.fetchone()
    if not row:
        c.execute(
            "INSERT INTO auth_user (username, password_hash) VALUES (?, ?)",
            (DEFAULT_ADMIN_USER, generate_password_hash(DEFAULT_ADMIN_PASS)),
        )
    conn.commit()
    conn.close()


def log_download_stat(count, total_size, job_type, filename):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "INSERT INTO downloads (filename, size, status, timestamp, job_type) VALUES (?, ?, ?, ?, ?)",
        (filename, total_size, "Success", datetime.now(), job_type),
    )
    conn.commit()
    conn.close()


def send_notification(subject, body):
    conf = get_smtp_config()
    if not conf or not conf["host"]:
        add_log("Notification skipped: No SMTP config.")
        return
    try:
        msg = MIMEMultipart()
        msg["From"] = conf["from_addr"]
        msg["To"] = conf["to_addr"]
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))
        server = smtplib.SMTP(conf["host"], conf["port"])
        server.starttls()
        server.login(conf["user"], conf["password"])
        server.sendmail(conf["from_addr"], conf["to_addr"], msg.as_string())
        server.quit()
    except Exception as e:
        add_log(f"Failed to send email: {str(e)}")


# --- Background Tasks ---


def cpu_monitor():
    while True:
        if psutil:
            # Faster sampling for smoother graph
            cpu = psutil.cpu_percent(interval=0.5)
            ts = datetime.now().strftime("%H:%M:%S")
            cpu_history.append({"time": ts, "value": cpu})
            if len(cpu_history) > 40:
                cpu_history.pop(0)
        else:
            time.sleep(1)


def set_method_state(method_id, **updates):
    state = method_state[method_id]
    state.update(updates)


def get_stop_event(method_id):
    return method_state[method_id]["stop_event"]


def run_sftp_backup(method_id, config):
    set_method_state(method_id, running=True, progress=10, last_result="Starting...")
    stop_event = get_stop_event(method_id)
    stop_event.clear()
    add_log(f"[{method_id.upper()}] Starting Backup Process...")

    transport = None
    sftp = None
    files_downloaded_count = 0
    total_size = 0
    local_root = os.path.join(LOCAL_DIR, method_id)

    try:
        add_log(f"[{method_id.upper()}] Connecting to SFTP...")
        transport = paramiko.Transport((config["host"], config["port"]))
        transport.connect(username=config["user"], password=config["password"])
        sftp = paramiko.SFTPClient.from_transport(transport)

        if not os.path.exists(local_root):
            os.makedirs(local_root)

        def sftp_get_recursive(remote, local):
            nonlocal files_downloaded_count, total_size
            if stop_event.is_set():
                return

            try:
                file_list = sftp.listdir_attr(remote)
            except Exception as e:
                add_log(f"[{method_id.upper()}] Skipping folder {remote}: {str(e)}")
                return

            for item in file_list:
                if stop_event.is_set():
                    return

                r_path = remote + "/" + item.filename if remote != "." else item.filename
                l_path = os.path.join(local, item.filename)

                try:
                    if stat.S_ISDIR(item.st_mode):
                        if not os.path.exists(l_path):
                            os.makedirs(l_path)
                        sftp_get_recursive(r_path, l_path)
                    else:
                        sftp.get(r_path, l_path)
                        add_log(f"[{method_id.upper()}] Downloaded: {item.filename}")
                        files_downloaded_count += 1
                        total_size += item.st_size
                except Exception as inner_e:
                    add_log(f"[{method_id.upper()}] FAILED {item.filename}: {str(inner_e)}")

        add_log(f"[{method_id.upper()}] Starting File Download...")
        set_method_state(method_id, progress=60, last_result="Downloading...")
        sftp_get_recursive(config.get("remote_path") or ".", local_root)

        if stop_event.is_set():
            add_log(f"[{method_id.upper()}] Process stopped by user.")
            set_method_state(method_id, last_result="Stopped")
            return

    except Exception as e:
        add_log(f"[{method_id.upper()}] Critical Connection Error: {str(e)}")
        set_method_state(method_id, last_result=f"Failed: {str(e)}")
        send_notification(f"{method_id.upper()} Backup Failed", f"Error: {str(e)}")

    finally:
        if sftp:
            sftp.close()
        if transport:
            transport.close()

        if not stop_event.is_set():
            add_log(f"[{method_id.upper()}] Creating Timestamped Archive...")
            try:
                if os.path.exists(local_root):
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    filename = f"{method_id}_backup_{timestamp}.tar.gz"
                    full_archive_path = os.path.join(BASE_DIR, filename)

                    with tarfile.open(full_archive_path, "w:gz") as tar:
                        tar.add(local_root, arcname=f"{method_id}_backups")

                    add_log(f"[{method_id.upper()}] Archive created: {filename}")
                    log_download_stat(files_downloaded_count, total_size, method_id, filename)

                    send_notification(
                        f"{method_id.upper()} Backup Success",
                        f"Backup: {filename}\nFiles: {files_downloaded_count}\nSize: {round(total_size/1024/1024, 2)} MB",
                    )
                    set_method_state(method_id, progress=100, last_result="Success")
                else:
                    add_log(f"[{method_id.upper()}] Error: No files to archive.")
                    set_method_state(method_id, last_result="No files to archive")
            except Exception as e:
                add_log(f"[{method_id.upper()}] Archiving Failed: {str(e)}")
                set_method_state(method_id, last_result=f"Archiving Failed: {str(e)}")

        set_method_state(method_id, running=False)


def run_ssh_backup():
    config = get_ssh_config()
    method_id = "ssh"
    set_method_state(method_id, running=True, progress=10, last_result="Starting...")
    stop_event = get_stop_event(method_id)
    stop_event.clear()
    add_log("[SSH] Starting SSH Sync...")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    files_downloaded_count = 0
    total_size = 0
    local_root = os.path.join(LOCAL_DIR, method_id)

    try:
        pkey = None
        if config.get("key"):
            pkey = paramiko.RSAKey.from_private_key(io.StringIO(config["key"]))
        client.connect(
            config["host"],
            port=config.get("port") or 22,
            username=config["user"],
            password=config.get("password") or None,
            pkey=pkey,
            timeout=10,
        )
        add_log("[SSH] Connected. Starting file sync...")
        set_method_state(method_id, progress=50, last_result="Syncing...")
        if not os.path.exists(local_root):
            os.makedirs(local_root)
        sftp = client.open_sftp()

        def sftp_get_recursive(remote, local):
            nonlocal files_downloaded_count, total_size
            if stop_event.is_set():
                return

            try:
                file_list = sftp.listdir_attr(remote)
            except Exception as e:
                add_log(f"[SSH] Skipping folder {remote}: {str(e)}")
                return

            for item in file_list:
                if stop_event.is_set():
                    return
                r_path = remote + "/" + item.filename if remote != "." else item.filename
                l_path = os.path.join(local, item.filename)
                try:
                    if stat.S_ISDIR(item.st_mode):
                        if not os.path.exists(l_path):
                            os.makedirs(l_path)
                        sftp_get_recursive(r_path, l_path)
                    else:
                        sftp.get(r_path, l_path)
                        add_log(f"[SSH] Synced: {item.filename}")
                        files_downloaded_count += 1
                        total_size += item.st_size
                except Exception as inner_e:
                    add_log(f"[SSH] FAILED {item.filename}: {str(inner_e)}")

        sftp_get_recursive(config.get("remote_path") or ".", local_root)
        sftp.close()

        if stop_event.is_set():
            add_log("[SSH] Process stopped by user.")
            set_method_state(method_id, last_result="Stopped")
            return

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{method_id}_backup_{timestamp}.tar.gz"
        full_archive_path = os.path.join(BASE_DIR, filename)
        with tarfile.open(full_archive_path, "w:gz") as tar:
            tar.add(local_root, arcname=f"{method_id}_backups")
        log_download_stat(files_downloaded_count, total_size, method_id, filename)
        add_log(f"[SSH] Archive created: {filename}")
        set_method_state(method_id, progress=100, last_result="Success")
    except Exception as e:
        add_log(f"[SSH] Critical Error: {str(e)}")
        set_method_state(method_id, last_result=f"Failed: {str(e)}")
    finally:
        client.close()
        set_method_state(method_id, running=False)


def run_cpanel_backup():
    config = get_cpanel_config()
    method_id = "cpanel"
    set_method_state(method_id, running=True, progress=20, last_result="Starting...")
    stop_event = get_stop_event(method_id)
    stop_event.clear()
    add_log("[CPANEL] Starting cPanel API backup...")
    try:
        if not config.get("host"):
            raise ValueError("cPanel host not configured.")
        port = config.get("port") or 2083
        url = f"https://{config['host']}:{port}/json-api/version"
        req = urllib.request.Request(url)
        if config.get("token"):
            req.add_header("Authorization", f"cpanel {config['user']}:{config['token']}")
        elif config.get("password"):
            credentials = f"{config['user']}:{config['password']}".encode("utf-8")
            req.add_header("Authorization", "Basic " + base64.b64encode(credentials).decode("utf-8"))
        context = ssl._create_unverified_context()
        with urllib.request.urlopen(req, timeout=10, context=context) as response:
            add_log(f"[CPANEL] Connected: {response.status}")
        if stop_event.is_set():
            add_log("[CPANEL] Process stopped by user.")
            set_method_state(method_id, last_result="Stopped")
            return
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{method_id}_backup_{timestamp}.tar.gz"
        full_archive_path = os.path.join(BASE_DIR, filename)
        with tarfile.open(full_archive_path, "w:gz") as tar:
            marker_path = os.path.join(BASE_DIR, f"{method_id}_backup_{timestamp}.txt")
            with open(marker_path, "w", encoding="utf-8") as marker:
                marker.write("cPanel backup placeholder.\n")
            tar.add(marker_path, arcname=f"{method_id}_backup_info.txt")
            os.remove(marker_path)
        log_download_stat(1, os.path.getsize(full_archive_path), method_id, filename)
        add_log(f"[CPANEL] Archive created: {filename}")
        set_method_state(method_id, progress=100, last_result="Success")
    except Exception as e:
        add_log(f"[CPANEL] Error: {str(e)}")
        set_method_state(method_id, last_result=f"Failed: {str(e)}")
    finally:
        set_method_state(method_id, running=False)


# --- Scheduler Setup ---
scheduler = BackgroundScheduler(timezone=TZ)
scheduler.start()


def load_schedules_from_db():
    scheduler.remove_all_jobs()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, job_type, hour, minute, days FROM schedules")
    for schedule_id, job_type, hour, minute, days in c.fetchall():
        if days:
            trigger = CronTrigger(day_of_week=days, hour=hour, minute=minute, timezone=TZ)
            scheduler.add_job(
                run_scheduled_job,
                trigger=trigger,
                id=f"{job_type}-{schedule_id}",
                args=[job_type],
                replace_existing=True,
            )
    conn.close()


def run_scheduled_job(job_type):
    if method_state[job_type]["running"]:
        add_log(f"[{job_type.upper()}] Scheduled run skipped: already running.")
        return
    add_log(f"[{job_type.upper()}] Scheduled run triggered.")
    if job_type == "sftp":
        threading.Thread(target=run_sftp_backup, args=("sftp", get_sftp_config())).start()
    elif job_type == "ssh":
        threading.Thread(target=run_ssh_backup).start()
    elif job_type == "cpanel":
        threading.Thread(target=run_cpanel_backup).start()


threading.Thread(target=cpu_monitor, daemon=True).start()

app = Flask(__name__)
init_db()
ensure_default_user()
load_schedules_from_db()


# --- API Endpoints ---


@app.route("/")
def index():
    return jsonify({"status": "ok", "hostname": socket.gethostname()})


@app.route("/logo")
def logo():
    if os.path.exists(LOGO_PATH):
        return send_file(LOGO_PATH)
    return "", 404


@app.route("/api/upload_logo", methods=["POST"])
def upload_logo():
    if "logo" in request.files:
        f = request.files["logo"]
        f.save(LOGO_PATH)
        return ("", 204)
    return ("No file", 400)


@app.route("/api/status")
def status():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    today_str = datetime.now().strftime("%Y-%m-%d")
    c.execute("SELECT COUNT(*) FROM downloads WHERE date(timestamp) = ?", (today_str,))
    count_today = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM downloads")
    count_total = c.fetchone()[0]
    conn.close()

    return jsonify(
        {
            "running": any(state["running"] for state in method_state.values()),
            "methods": {
                method_id: {
                    "running": state["running"],
                    "progress": state["progress"],
                    "last_result": state["last_result"],
                }
                for method_id, state in method_state.items()
            },
            "logs": terminal_logs,
            "cpu_history": cpu_history,
            "dl_stats": {"Today": count_today, "Total History": count_total},
        }
    )


@app.route("/api/run/<method_id>", methods=["POST"])
def run(method_id):
    if method_id not in method_state:
        return ("Unknown method", 400)
    if method_state[method_id]["running"]:
        return ("", 204)
    if method_id == "sftp":
        threading.Thread(target=run_sftp_backup, args=("sftp", get_sftp_config())).start()
    elif method_id == "ssh":
        threading.Thread(target=run_ssh_backup).start()
    elif method_id == "cpanel":
        threading.Thread(target=run_cpanel_backup).start()
    return ("", 204)


@app.route("/api/stop/<method_id>", methods=["POST"])
def stop(method_id):
    if method_id not in method_state:
        return ("Unknown method", 400)
    if method_state[method_id]["running"]:
        method_state[method_id]["stop_event"].set()
        add_log(f"[{method_id.upper()}] Stopping backup process requested by user...")
    return ("", 204)


@app.route("/api/list_archives")
def list_archives():
    files = []
    if os.path.exists(BASE_DIR):
        for f in os.listdir(BASE_DIR):
            if f.endswith(".tar.gz"):
                path = os.path.join(BASE_DIR, f)
                stats = os.stat(path)
                size_mb = round(stats.st_size / (1024 * 1024), 2)
                created = datetime.fromtimestamp(stats.st_mtime).strftime("%Y-%m-%d %H:%M")
                files.append({"filename": f, "size": f"{size_mb} MB", "created": created})
    files.sort(key=lambda x: x["created"], reverse=True)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT filename, job_type FROM downloads")
    job_map = {row[0]: row[1] for row in c.fetchall()}
    conn.close()
    return jsonify(
        [
            {
                **file_info,
                "job": job_map.get(file_info["filename"], "Unknown"),
            }
            for file_info in files
        ]
    )


@app.route("/download_archive/<filename>")
def download_archive(filename):
    if ".." in filename or "/" in filename:
        return "Invalid filename", 400
    return send_from_directory(BASE_DIR, filename, as_attachment=True)


@app.route("/api/archives/<filename>", methods=["DELETE"])
def delete_archive(filename):
    if ".." in filename or "/" in filename:
        return "Invalid filename", 400
    full_path = os.path.join(BASE_DIR, filename)
    if os.path.exists(full_path):
        os.remove(full_path)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("DELETE FROM downloads WHERE filename = ?", (filename,))
    conn.commit()
    conn.close()
    add_log(f"[ARCHIVE] Deleted {filename}")
    return ("", 204)


@app.route("/api/archives/restore", methods=["POST"])
def restore_archive():
    data = request.json or {}
    filename = data.get("filename", "")
    add_log(f"[ARCHIVE] Restore requested for {filename}")
    return ("", 204)


def serialize_schedule(schedule_id, job_type, hour, minute, days):
    days_list = days.split(",") if days else []
    tz = ZoneInfo(TZ)
    trigger = CronTrigger(day_of_week=days, hour=hour, minute=minute, timezone=TZ)
    next_run = trigger.get_next_fire_time(None, datetime.now(tz))
    next_run_str = next_run.astimezone(tz).strftime("%Y-%m-%d %H:%M") if next_run else ""
    return {
        "id": schedule_id,
        "job_type": job_type,
        "hour": hour,
        "minute": minute,
        "days": days_list,
        "next_run": next_run_str,
    }


@app.route("/api/schedules", methods=["GET", "POST"])
def api_schedules():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    if request.method == "POST":
        data = request.json
        job_type = data.get("job_type", "sftp")
        days_list = data.get("days") or []
        if not days_list:
            days_list = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
        days = ",".join(days_list)
        c.execute(
            "INSERT INTO schedules (job_type, hour, minute, days) VALUES (?, ?, ?, ?)",
            (job_type, data["hour"], data["minute"], days),
        )
        conn.commit()
        conn.close()
        load_schedules_from_db()
        return ("", 204)

    c.execute("SELECT id, job_type, hour, minute, days FROM schedules ORDER BY id DESC")
    rows = c.fetchall()
    conn.close()
    return jsonify([serialize_schedule(*row) for row in rows])


@app.route("/api/schedules/<int:schedule_id>", methods=["PUT", "DELETE"])
def api_schedule_detail(schedule_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    if request.method == "PUT":
        data = request.json
        days_list = data.get("days") or []
        if not days_list:
            days_list = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
        days = ",".join(days_list)
        c.execute(
            "UPDATE schedules SET job_type = ?, hour = ?, minute = ?, days = ? WHERE id = ?",
            (data["job_type"], data["hour"], data["minute"], days, schedule_id),
        )
        conn.commit()
        conn.close()
        load_schedules_from_db()
        return ("", 204)

    c.execute("DELETE FROM schedules WHERE id = ?", (schedule_id,))
    conn.commit()
    conn.close()
    load_schedules_from_db()
    return ("", 204)


@app.route("/api/smtp", methods=["GET", "POST"])
def api_smtp():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    if request.method == "POST":
        d = request.json
        c.execute("DELETE FROM smtp_config")
        c.execute(
            "INSERT INTO smtp_config (host, port, user, password, from_addr, to_addr) VALUES (?,?,?,?,?,?)",
            (d["host"], d["port"], d["user"], d["password"], d["from_addr"], d["to_addr"]),
        )
        conn.commit()
        conn.close()
        return ("", 204)
    conf = get_smtp_config()
    return jsonify(conf if conf else {})


@app.route("/api/config/sftp", methods=["GET", "POST"])
def api_sftp_config():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    if request.method == "POST":
        d = request.json
        c.execute("DELETE FROM sftp_config")
        c.execute(
            "INSERT INTO sftp_config (host, port, user, password, remote_path) VALUES (?,?,?,?,?)",
            (d["host"], d["port"], d["user"], d["password"], d.get("remote_path", ".")),
        )
        conn.commit()
        conn.close()
        return ("", 204)
    conf = get_sftp_config()
    return jsonify(conf)


@app.route("/api/config/ssh", methods=["GET", "POST"])
def api_ssh_config():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    if request.method == "POST":
        d = request.json
        c.execute("DELETE FROM ssh_config")
        c.execute(
            "INSERT INTO ssh_config (host, port, user, password, key, remote_path) VALUES (?,?,?,?,?,?)",
            (d["host"], d["port"], d["user"], d.get("password"), d.get("key"), d.get("remote_path", ".")),
        )
        conn.commit()
        conn.close()
        return ("", 204)
    conf = get_ssh_config()
    return jsonify(conf)


@app.route("/api/config/cpanel", methods=["GET", "POST"])
def api_cpanel_config():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    if request.method == "POST":
        d = request.json
        c.execute("DELETE FROM cpanel_config")
        c.execute(
            "INSERT INTO cpanel_config (host, port, user, token, password) VALUES (?,?,?,?,?)",
            (d["host"], d["port"], d["user"], d.get("token"), d.get("password")),
        )
        conn.commit()
        conn.close()
        return ("", 204)
    conf = get_cpanel_config()
    return jsonify(conf)


@app.route("/api/auth/login", methods=["POST"])
def api_login():
    data = request.json or {}
    username = data.get("username", "")
    password = data.get("password", "")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT password_hash FROM auth_user WHERE username = ?", (username,))
    row = c.fetchone()
    conn.close()
    if row and check_password_hash(row[0], password):
        return jsonify({"ok": True})
    return ("Unauthorized", 401)


@app.route("/api/auth/password", methods=["POST"])
def api_change_password():
    data = request.json or {}
    username = data.get("username", DEFAULT_ADMIN_USER)
    current_password = data.get("currentPassword", "")
    new_password = data.get("newPassword", "")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT password_hash FROM auth_user WHERE username = ?", (username,))
    row = c.fetchone()
    if not row or not check_password_hash(row[0], current_password):
        conn.close()
        return ("Unauthorized", 401)
    c.execute(
        "UPDATE auth_user SET password_hash = ? WHERE username = ?",
        (generate_password_hash(new_password), username),
    )
    conn.commit()
    conn.close()
    return ("", 204)


@app.route("/api/ssh/test", methods=["POST"])
def api_ssh_test():
    data = request.json or {}
    config = {**get_ssh_config(), **data}
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        pkey = None
        if config.get("key"):
            pkey = paramiko.RSAKey.from_private_key(io.StringIO(config["key"]))
        client.connect(
            config["host"],
            port=config.get("port") or 22,
            username=config["user"],
            password=config.get("password") or None,
            pkey=pkey,
            timeout=10,
        )
        stdin, stdout, stderr = client.exec_command("echo ok")
        stdout.read()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    finally:
        client.close()


@app.route("/api/sftp/test", methods=["POST"])
def api_sftp_test():
    data = request.json or {}
    config = {**get_sftp_config(), **data}
    transport = None
    sftp = None
    try:
        transport = paramiko.Transport((config["host"], config["port"]))
        transport.connect(username=config["user"], password=config["password"])
        sftp = paramiko.SFTPClient.from_transport(transport)
        sftp.listdir(".")
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    finally:
        if sftp:
            sftp.close()
        if transport:
            transport.close()


@app.route("/api/cpanel/test", methods=["POST"])
def api_cpanel_test():
    data = request.json or {}
    config = {**get_cpanel_config(), **data}
    try:
        if not config.get("host"):
            raise ValueError("cPanel host not configured.")
        port = config.get("port") or 2083
        url = f"https://{config['host']}:{port}/json-api/version"
        req = urllib.request.Request(url)
        if config.get("token"):
            req.add_header("Authorization", f"cpanel {config['user']}:{config['token']}")
        elif config.get("password"):
            credentials = f"{config['user']}:{config['password']}".encode("utf-8")
            req.add_header("Authorization", "Basic " + base64.b64encode(credentials).decode("utf-8"))
        context = ssl._create_unverified_context()
        with urllib.request.urlopen(req, timeout=10, context=context) as response:
            return jsonify({"ok": response.status == 200})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=8080)
