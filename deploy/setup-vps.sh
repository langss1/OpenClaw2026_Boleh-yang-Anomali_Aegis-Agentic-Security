#!/usr/bin/env bash
# ============================================================
# Aegis SaaS — VPS bootstrap script
# Target OS: OpenCloudOS 9 (RHEL 9 family). Compatible: AlmaLinux 9, Rocky 9, CentOS Stream 9.
# Jalankan SEKALI di VPS sebagai user dengan akses sudo:
#   curl -fsSL https://your-host/setup-vps.sh | sudo bash
# atau via deploy.sh (otomatis).
# ============================================================
set -euo pipefail

APP_USER="${APP_USER:-aegis}"
APP_DIR="${APP_DIR:-/opt/aegis}"
INSTALL_DOCKER="${INSTALL_DOCKER:-true}"
INSTALL_NODE="${INSTALL_NODE:-true}"
OPEN_PORTS="${OPEN_PORTS:-80,443}"

log()  { printf "\033[36m[setup]\033[0m %s\n" "$*"; }
warn() { printf "\033[33m[warn]\033[0m  %s\n" "$*"; }
err()  { printf "\033[31m[err]\033[0m   %s\n" "$*" >&2; }

require_root() {
  if [[ $EUID -ne 0 ]]; then
    err "Harus dijalankan sebagai root / sudo."
    exit 1
  fi
}

detect_os() {
  if [[ ! -f /etc/os-release ]]; then
    err "/etc/os-release tidak ditemukan. OS tidak didukung."
    exit 1
  fi
  . /etc/os-release
  log "OS detected: ${PRETTY_NAME:-${ID} ${VERSION_ID}}"
  case "${ID}" in
    opencloudos|almalinux|rocky|centos|rhel) : ;;
    *) warn "OS ${ID} bukan RHEL-family resmi yang dites — lanjut best-effort." ;;
  esac
}

ensure_packages() {
  log "Update sistem & install dependency dasar..."
  # OpenCloudOS sudah menyediakan EPOL (setara EPEL); skip epel-release jika OS=opencloudos.
  if [[ "${ID:-}" != "opencloudos" ]]; then
    dnf -y install epel-release || true
  fi
  dnf -y install \
    curl wget git tar unzip jq rsync openssl ca-certificates \
    policycoreutils-python-utils firewalld
  systemctl enable --now firewalld || true
}

install_node() {
  if command -v node >/dev/null 2>&1; then
    log "Node sudah terpasang: $(node -v)"
    return
  fi

  log "Install Node.js 20..."
  # Coba dnf module dulu (paling kompatibel untuk OpenCloudOS / RHEL 9).
  if dnf module list nodejs 2>/dev/null | grep -qE '^nodejs\s+20'; then
    log "  -> via dnf module nodejs:20"
    dnf module reset -y nodejs || true
    dnf module enable -y nodejs:20
    dnf -y install nodejs npm
    return
  fi

  # Fallback: NodeSource via repo manual (script setup_20.x menolak OpenCloudOS).
  log "  -> via NodeSource (manual repo)"
  rpm --import https://rpm.nodesource.com/gpgkey/ns-operations-public.key || true
  cat >/etc/yum.repos.d/nodesource-nodejs.repo <<'REPO'
[nodesource-nodejs]
name=Node.js Packages - NodeSource pub_20.x
baseurl=https://rpm.nodesource.com/pub_20.x/nodistro/nodejs/x86_64
priority=9
enabled=1
gpgcheck=1
gpgkey=https://rpm.nodesource.com/gpgkey/ns-operations-public.key
module_hotfixes=1
REPO
  dnf -y install nodejs
}

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    log "Docker sudah terpasang: $(docker --version)"
    return
  fi
  log "Install Docker CE (repo CentOS, kompatibel untuk RHEL 9 family)..."
  dnf -y install dnf-plugins-core
  # OpenCloudOS tidak punya repo Docker resmi; pakai repo CentOS (rpm-nya kompatibel).
  if ! [ -f /etc/yum.repos.d/docker-ce.repo ]; then
    dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
  fi
  dnf -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
}

create_user() {
  if id "$APP_USER" >/dev/null 2>&1; then
    log "User '$APP_USER' sudah ada."
  else
    log "Membuat user '$APP_USER'..."
    useradd --system --create-home --shell /bin/bash "$APP_USER"
  fi
  if [[ "$INSTALL_DOCKER" == "true" ]]; then
    usermod -aG docker "$APP_USER" || true
  fi
}

create_app_dir() {
  log "Menyiapkan direktori $APP_DIR..."
  install -d -o "$APP_USER" -g "$APP_USER" -m 0755 "$APP_DIR"
  install -d -o "$APP_USER" -g "$APP_USER" -m 0755 "$APP_DIR/logs"
  install -d -o "$APP_USER" -g "$APP_USER" -m 0755 "$APP_DIR/server/subscription/data"
}

configure_firewall() {
  log "Konfigurasi firewalld (membuka port: $OPEN_PORTS)..."
  IFS=',' read -ra ports <<< "$OPEN_PORTS"
  for p in "${ports[@]}"; do
    firewall-cmd --permanent --add-port="${p}/tcp" || true
  done
  firewall-cmd --reload || true
  firewall-cmd --list-ports || true
}

configure_selinux() {
  if command -v getenforce >/dev/null 2>&1; then
    local mode
    mode=$(getenforce || echo "Disabled")
    log "SELinux mode: $mode"
    if [[ "$mode" == "Enforcing" ]]; then
      log "Mengizinkan httpd_t connect ke port 3000 (untuk nginx -> aegis)..."
      setsebool -P httpd_can_network_connect 1 || true
      semanage port -a -t http_port_t -p tcp 3000 2>/dev/null \
        || semanage port -m -t http_port_t -p tcp 3000 2>/dev/null || true
    fi
  fi
}

summary() {
  cat <<EOF

\033[32m[setup]\033[0m Selesai. Ringkasan:
  - App user      : $APP_USER
  - App dir       : $APP_DIR
  - Node          : $(node -v 2>/dev/null || echo 'not installed')
  - Docker        : $(docker --version 2>/dev/null || echo 'not installed')
  - Firewall open : $(firewall-cmd --list-ports 2>/dev/null || echo 'n/a')

Langkah berikutnya dari mesin lokal:
  npm run deploy            # rsync + restart service di VPS
EOF
}

main() {
  require_root
  detect_os
  ensure_packages
  [[ "$INSTALL_NODE"   == "true" ]] && install_node
  [[ "$INSTALL_DOCKER" == "true" ]] && install_docker
  create_user
  create_app_dir
  configure_firewall
  configure_selinux
  summary
}

main "$@"
