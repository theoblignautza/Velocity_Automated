import os
import stat
import tarfile
import sqlite3
import time
import threading
import paramiko
import smtplib
import socket
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, send_file, request, jsonify, send_from_directory
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

SFTP_HOST = os.getenv("SFTP_HOST", "cp71.domains.co.za")
SFTP_PORT = int(os.getenv("SFTP_PORT", "22000"))
SFTP_USER = os.getenv("SFTP_USER", "labverse")
SFTP_PASS = os.getenv("SFTP_PASS", "Superadmin@123")

# Global state
is_downloading = False
stop_event = threading.Event()
terminal_logs = []
cpu_history = []


def add_log(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    terminal_logs.append(f"[{ts}] {msg}")
    if len(terminal_logs) > 100:
        terminal_logs.pop(0)


# --- Database Management ---
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "CREATE TABLE IF NOT EXISTS schedules (id INTEGER PRIMARY KEY, hour INTEGER, minute INTEGER, days TEXT)"
    )
    c.execute(
        "CREATE TABLE IF NOT EXISTS smtp_config (id INTEGER PRIMARY KEY, host TEXT, port INTEGER, user TEXT, password TEXT, from_addr TEXT, to_addr TEXT)"
    )
    c.execute(
        "CREATE TABLE IF NOT EXISTS downloads (id INTEGER PRIMARY KEY, filename TEXT, size INTEGER, status TEXT, timestamp DATETIME)"
    )
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


def log_download_stat(count, total_size):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "INSERT INTO downloads (filename, size, status, timestamp) VALUES (?, ?, ?, ?)",
        ("BATCH_BACKUP", total_size, "Success", datetime.now()),
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


def download_task():
    global is_downloading
    is_downloading = True
    stop_event.clear()
    terminal_logs.clear()
    add_log("Starting Backup Process...")

    transport = None
    sftp = None
    files_downloaded_count = 0
    total_size = 0
    archive_name = ""

    try:
        add_log("Connecting to SFTP...")
        transport = paramiko.Transport((SFTP_HOST, SFTP_PORT))
        transport.connect(username=SFTP_USER, password=SFTP_PASS)
        sftp = paramiko.SFTPClient.from_transport(transport)

        if not os.path.exists(LOCAL_DIR):
            os.makedirs(LOCAL_DIR)

        def sftp_get_recursive(remote, local):
            nonlocal files_downloaded_count, total_size
            if stop_event.is_set():
                return

            try:
                file_list = sftp.listdir_attr(remote)
            except Exception as e:
                add_log(f"Skipping folder {remote}: {str(e)}")
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
                        add_log(f"Downloaded: {item.filename}")
                        files_downloaded_count += 1
                        total_size += item.st_size
                except Exception as inner_e:
                    add_log(f"FAILED {item.filename}: {str(inner_e)}")

        add_log("Starting File Download...")
        sftp_get_recursive(".", LOCAL_DIR)

        if stop_event.is_set():
            add_log("Process stopped by user.")
            return

    except Exception as e:
        add_log(f"Critical Connection Error: {str(e)}")
        send_notification("WP Backup Failed", f"Error: {str(e)}")

    finally:
        if sftp:
            sftp.close()
        if transport:
            transport.close()

        if not stop_event.is_set():
            add_log("Creating Timestamped Archive...")
            try:
                if os.path.exists(LOCAL_DIR):
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    filename = f"backup_{timestamp}.tar.gz"
                    full_archive_path = os.path.join(BASE_DIR, filename)

                    with tarfile.open(full_archive_path, "w:gz") as tar:
                        tar.add(LOCAL_DIR, arcname="wordpress_backups")

                    add_log(f"Archive created: {filename}")
                    archive_name = filename

                    log_download_stat(files_downloaded_count, total_size)

                    send_notification(
                        "WP Backup Success",
                        f"Backup: {filename}\nFiles: {files_downloaded_count}\nSize: {round(total_size/1024/1024, 2)} MB",
                    )
                else:
                    add_log("Error: No files to archive.")
            except Exception as e:
                add_log(f"Archiving Failed: {str(e)}")

        is_downloading = False


# --- Scheduler Setup ---
scheduler = BackgroundScheduler(timezone=TZ)
scheduler.start()


def load_schedules_from_db():
    scheduler.remove_all_jobs()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT hour, minute, days FROM schedules")
    for hour, minute, days in c.fetchall():
        if days:
            trigger = CronTrigger(day_of_week=days, hour=hour, minute=minute, timezone=TZ)
            scheduler.add_job(download_task, trigger=trigger)
    conn.close()


threading.Thread(target=cpu_monitor, daemon=True).start()

app = Flask(__name__)
init_db()
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
            "running": is_downloading,
            "logs": terminal_logs,
            "cpu_history": cpu_history,
            "dl_stats": {"Today": count_today, "Total History": count_total},
        }
    )


@app.route("/api/run", methods=["POST"])
def run():
    if not is_downloading:
        threading.Thread(target=download_task).start()
    return ("", 204)


@app.route("/api/stop", methods=["POST"])
def stop():
    global stop_event
    if is_downloading:
        stop_event.set()
        add_log("Stopping backup process requested by user...")
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
    return jsonify(files)


@app.route("/download_archive/<filename>")
def download_archive(filename):
    if ".." in filename or "/" in filename:
        return "Invalid filename", 400
    return send_from_directory(BASE_DIR, filename, as_attachment=True)


@app.route("/api/schedules", methods=["GET", "POST", "DELETE"])
def api_schedules():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    if request.method == "POST":
        data = request.json
        c.execute("DELETE FROM schedules")
        c.execute(
            "INSERT INTO schedules (hour, minute, days) VALUES (?, ?, ?)",
            (data["hour"], data["minute"], data["days"]),
        )
        conn.commit()
        conn.close()
        load_schedules_from_db()
        return ("", 204)

    if request.method == "DELETE":
        c.execute("DELETE FROM schedules")
        conn.commit()
        conn.close()
        load_schedules_from_db()
        return ("", 204)

    c.execute("SELECT hour, minute, days FROM schedules LIMIT 1")
    row = c.fetchone()
    conn.close()
    if row:
        return jsonify({"hour": row[0], "minute": row[1], "days": row[2].split(",")})
    return jsonify({})


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


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=8080)
