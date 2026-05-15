#!/usr/bin/env bash
# ============================================================
# Aegis SaaS — deploy.sh
# Sinkronkan source code dari mesin lokal ke VPS lalu (re)start service.
#
# Mode (pilih lewat env DEPLOY_MODE):
#   docker   -> deploy via docker compose di VPS (default)
#   systemd  -> deploy native Node + systemd unit
#
# Konfigurasi via .env atau ENV inline:
#   VPS_HOST, VPS_USER, VPS_PORT, VPS_APP_DIR, VPS_SERVICE_NAME
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Muat .env bila ada (export semua variabel).
if [[ -f .env ]]; then
  set -a; . ./.env; set +a
fi

: "${VPS_HOST:?VPS_HOST belum diset (lihat .env.example)}"
VPS_USER="${VPS_USER:-root}"
VPS_PORT="${VPS_PORT:-22}"
VPS_APP_DIR="${VPS_APP_DIR:-/opt/aegis}"
VPS_SERVICE_NAME="${VPS_SERVICE_NAME:-aegis}"
DEPLOY_MODE="${DEPLOY_MODE:-docker}"
SSH_OPTS=( -p "$VPS_PORT" -o StrictHostKeyChecking=accept-new )

log()  { printf "\033[36m[deploy]\033[0m %s\n" "$*"; }
warn() { printf "\033[33m[warn]\033[0m   %s\n" "$*"; }

ssh_run() {
  ssh "${SSH_OPTS[@]}" "${VPS_USER}@${VPS_HOST}" "$@"
}

scp_file() {
  scp -P "$VPS_PORT" -o StrictHostKeyChecking=accept-new "$1" "${VPS_USER}@${VPS_HOST}:$2"
}

rsync_project() {
  log "Sinkronisasi source ke ${VPS_USER}@${VPS_HOST}:${VPS_APP_DIR} ..."
  rsync -az --delete \
    --exclude '.git/' \
    --exclude 'node_modules/' \
    --exclude '.env' \
    --exclude 'logs/*' \
    --exclude 'backups/' \
    --exclude '*.bak' \
    --exclude 'server/subscription/data/' \
    -e "ssh -p $VPS_PORT -o StrictHostKeyChecking=accept-new" \
    ./ "${VPS_USER}@${VPS_HOST}:${VPS_APP_DIR}/"
}

push_env() {
  if [[ -f .env ]]; then
    log "Mengunggah .env (mode 600) ..."
    scp_file .env "${VPS_APP_DIR}/.env"
    ssh_run "chmod 600 ${VPS_APP_DIR}/.env"
  else
    warn "Tidak ada .env lokal — pastikan ${VPS_APP_DIR}/.env sudah disiapkan di VPS."
  fi
}

deploy_docker() {
  log "Mode: docker compose"
  ssh_run "cd ${VPS_APP_DIR} && docker compose pull 2>/dev/null || true"
  ssh_run "cd ${VPS_APP_DIR} && docker compose build aegis web"
  ssh_run "cd ${VPS_APP_DIR} && docker compose up -d aegis web"
  ssh_run "cd ${VPS_APP_DIR} && docker compose ps"
}

deploy_systemd() {
  log "Mode: systemd (native node)"
  ssh_run "cd ${VPS_APP_DIR} && npm ci --omit=dev"
  log "Memasang unit systemd '${VPS_SERVICE_NAME}.service'..."
  ssh_run "install -m 0644 ${VPS_APP_DIR}/deploy/aegis.service /etc/systemd/system/${VPS_SERVICE_NAME}.service"
  ssh_run "systemctl daemon-reload"
  ssh_run "systemctl enable --now ${VPS_SERVICE_NAME}.service"
  ssh_run "systemctl restart ${VPS_SERVICE_NAME}.service"
  ssh_run "systemctl status --no-pager ${VPS_SERVICE_NAME}.service || true"
}

health_check() {
  log "Health check via SSH ..."
  if [[ "${DEPLOY_MODE}" == "docker" ]]; then
    # Frontend Next di :3000; /api/* di-proxy ke backend Express (:4000 internal).
    ssh_run "curl -fsS http://127.0.0.1:3000/api/health" \
      && log "OK — web + API merespons." \
      || warn "Health check gagal. Lihat log: docker compose logs -f web aegis"
  else
    ssh_run "curl -fsS http://127.0.0.1:${PORT:-3000}/api/health" \
      && log "OK — service merespons." \
      || warn "Health check gagal. Lihat log: 'journalctl -u ${VPS_SERVICE_NAME} -e' atau 'docker compose logs aegis web'."
  fi
}

main() {
  rsync_project
  push_env
  case "$DEPLOY_MODE" in
    docker)  deploy_docker  ;;
    systemd) deploy_systemd ;;
    *) echo "DEPLOY_MODE harus 'docker' atau 'systemd' (got: $DEPLOY_MODE)"; exit 2 ;;
  esac
  health_check
  log "Deploy selesai."
}

main "$@"
