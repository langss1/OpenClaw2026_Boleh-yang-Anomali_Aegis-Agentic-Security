#!/usr/bin/env bash
# Issue Let's Encrypt cert via certbot di OpenCloudOS 9.
# Pra-syarat: VPS_DOMAIN sudah point ke IP VPS, port 80 terbuka.
set -euo pipefail

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
: "${VPS_DOMAIN:?VPS_DOMAIN belum diset}"
: "${VPS_LETSENCRYPT_EMAIL:?VPS_LETSENCRYPT_EMAIL belum diset}"

dnf -y install epel-release
dnf -y install certbot python3-certbot-nginx

certbot --nginx \
  -d "$VPS_DOMAIN" \
  --non-interactive --agree-tos \
  -m "$VPS_LETSENCRYPT_EMAIL" \
  --redirect

systemctl reload nginx || true
echo "[ok] Sertifikat terpasang untuk $VPS_DOMAIN"
