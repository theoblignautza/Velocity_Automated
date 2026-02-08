#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() {
  printf "[installer] %s\n" "$1"
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

install_python_packages() {
  if ! command_exists python3; then
    log "Python3 not found. Please install Python 3.11+ and rerun."
    return 1
  fi

  local pip_cmd="python3 -m pip"
  if ! ${pip_cmd} --version >/dev/null 2>&1; then
    log "pip not found for python3. Please install pip and rerun."
    return 1
  fi

  log "Installing Python dependencies..."
  ${pip_cmd} install --upgrade pip
  ${pip_cmd} install -r "${ROOT_DIR}/backend/requirements.txt"
}

install_node_packages() {
  if ! command_exists npm; then
    log "npm not found. Please install Node.js 18+ and rerun."
    return 1
  fi

  log "Installing Node.js dependencies..."
  (cd "${ROOT_DIR}" && npm install)
}

main() {
  log "Starting dependency check..."
  install_python_packages
  install_node_packages
  log "Dependency check complete."
}

main "$@"
