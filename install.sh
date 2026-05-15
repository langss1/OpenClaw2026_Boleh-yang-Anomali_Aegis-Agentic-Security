#!/usr/bin/env bash
# ============================================================
# Aegis CLI installer
#
# Pemakaian:
#   curl -fsSL https://raw.githubusercontent.com/langss1/OpenClaw2026_Boleh-yang-Anomali_Aegis-Agentic-Security/feat/vps-integration/install.sh | bash
#
# Atau dengan opsi:
#   curl -fsSL ... | AEGIS_BRANCH=main bash
#   curl -fsSL ... | AEGIS_INSTALL_DIR=/opt/aegis-cli bash
#
# Yang dilakukan:
#   1. Clone repo Aegis ke ~/.aegis (atau AEGIS_INSTALL_DIR)
#   2. npm install dependency
#   3. Bikin symlink `aegis` & `openclaw` di ~/.local/bin (atau AEGIS_BIN_DIR)
#   4. Cek PATH; kasih instruksi append kalau belum ada
#
# Update di kemudian hari: jalankan ulang installer (idempotent).
# Uninstall: rm -rf ~/.aegis ~/.local/bin/aegis ~/.local/bin/openclaw
# ============================================================
set -euo pipefail

REPO_URL="https://github.com/langss1/OpenClaw2026_Boleh-yang-Anomali_Aegis-Agentic-Security.git"
BRANCH="${AEGIS_BRANCH:-feat/vps-integration}"
INSTALL_DIR="${AEGIS_INSTALL_DIR:-$HOME/.aegis}"
BIN_DIR="${AEGIS_BIN_DIR:-$HOME/.local/bin}"

# Warna (skip kalau tidak ke terminal)
if [ -t 1 ]; then
    C_GREEN='\033[32m'; C_RED='\033[31m'; C_YELLOW='\033[33m'
    C_CYAN='\033[36m'; C_BOLD='\033[1m'; C_RESET='\033[0m'
else
    C_GREEN=''; C_RED=''; C_YELLOW=''; C_CYAN=''; C_BOLD=''; C_RESET=''
fi

log()  { printf "${C_CYAN}[aegis]${C_RESET} %s\n" "$*"; }
warn() { printf "${C_YELLOW}[warn]${C_RESET}  %s\n" "$*"; }
err()  { printf "${C_RED}[err]${C_RESET}   %s\n" "$*" >&2; }
ok()   { printf "${C_GREEN}[ok]${C_RESET}    %s\n" "$*"; }

# ─── Prereq check ──────────────────────────────────────────
need_cmd() {
    command -v "$1" >/dev/null 2>&1 || { err "perintah '$1' tidak ditemukan. $2"; exit 1; }
}
need_cmd git  "Install git dulu (apt/dnf/brew install git)."
need_cmd node "Install Node.js 18+ dari https://nodejs.org atau via nvm."
need_cmd npm  "Install npm (biasanya ikut Node.js)."

NODE_MAJOR=$(node -v | sed 's/^v//;s/\..*$//')
if [ "$NODE_MAJOR" -lt 18 ]; then
    err "Node.js $NODE_MAJOR terdeteksi — Aegis butuh Node 18+."
    exit 1
fi

printf "${C_BOLD}${C_CYAN}"
cat <<'BANNER'
  ╔══════════════════════════════════════════════╗
  ║  Aegis CLI Installer · OpenClaw Edition      ║
  ╚══════════════════════════════════════════════╝
BANNER
printf "${C_RESET}\n"

log "Repo       : $REPO_URL"
log "Branch     : $BRANCH"
log "Install dir: $INSTALL_DIR"
log "Bin dir    : $BIN_DIR"
log "Node       : $(node -v) · npm $(npm -v)"
echo ""

# ─── Clone / update ────────────────────────────────────────
if [ -d "$INSTALL_DIR/.git" ]; then
    log "Update repo existing..."
    cd "$INSTALL_DIR"
    # Pastikan remote benar (kalau-kalau di-fork)
    git remote set-url origin "$REPO_URL" || true
    git fetch --depth 1 origin "$BRANCH"
    git checkout -B "$BRANCH" "origin/$BRANCH" 2>/dev/null || git checkout "$BRANCH"
    git reset --hard "origin/$BRANCH"
else
    log "Clone repo (shallow, branch $BRANCH)..."
    mkdir -p "$(dirname "$INSTALL_DIR")"
    git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# ─── Install deps ──────────────────────────────────────────
log "Install dependency (npm install --omit=dev)..."
npm install --omit=dev --no-audit --no-fund --silent

# ─── Symlink ───────────────────────────────────────────────
log "Pasang binary di $BIN_DIR..."
mkdir -p "$BIN_DIR"
chmod +x "$INSTALL_DIR/src/cli/main.js" "$INSTALL_DIR/openclaw/bin/openclaw.js"
ln -sf "$INSTALL_DIR/src/cli/main.js"           "$BIN_DIR/aegis"
ln -sf "$INSTALL_DIR/openclaw/bin/openclaw.js"  "$BIN_DIR/openclaw"

# ─── PATH check ────────────────────────────────────────────
if ! echo ":$PATH:" | grep -q ":$BIN_DIR:"; then
    warn "$BIN_DIR belum ada di \$PATH."
    echo ""
    echo "Tambahkan baris berikut ke ~/.bashrc atau ~/.zshrc:"
    printf "  ${C_BOLD}export PATH=\"\$HOME/.local/bin:\$PATH\"${C_RESET}\n"
    echo ""
    echo "Lalu jalankan: source ~/.bashrc (atau buka terminal baru)."
    echo ""
fi

# ─── Selesai ───────────────────────────────────────────────
ok "Aegis CLI terpasang."
echo ""
printf "${C_BOLD}Coba:${C_RESET}\n"
echo "  aegis help"
echo "  aegis list"
echo "  aegis describe --agent pentest"
echo "  aegis run --agent pentest --task \"scan http://localhost:3000 untuk SQLi\""
echo ""
printf "${C_BOLD}Update di masa depan:${C_RESET}\n"
echo "  curl -fsSL https://raw.githubusercontent.com/langss1/OpenClaw2026_Boleh-yang-Anomali_Aegis-Agentic-Security/$BRANCH/install.sh | bash"
echo ""
printf "${C_BOLD}Uninstall:${C_RESET}\n"
echo "  rm -rf $INSTALL_DIR $BIN_DIR/aegis $BIN_DIR/openclaw"
