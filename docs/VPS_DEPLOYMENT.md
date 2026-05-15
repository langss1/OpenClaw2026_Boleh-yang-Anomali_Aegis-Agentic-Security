# Aegis SaaS — Panduan Deploy ke VPS (OpenCloudOS 9)

Panduan ini fokus untuk VPS **OpenCloudOS 9** (kernel `6.6.117-45.1.oc9.x86_64`), namun
script juga kompatibel dengan AlmaLinux 9 / Rocky 9 / CentOS Stream 9.

Dua mode deployment didukung:

| Mode | Pakai kapan | Manajemen |
| :--- | :--- | :--- |
| **Docker** *(default)* | Cepat, isolated, mudah rollback | `docker compose` |
| **Systemd** | Resource VPS terbatas / tidak boleh pasang Docker | `systemctl` unit `aegis.service` |

---

## 1. Persiapan lokal

```bash
cd /opt/aegis-project   # folder hasil clone integrasivps
cp .env.example .env
# Isi minimal:
#   VPS_HOST=ip.atau.host.vps
#   VPS_USER=root            (atau user sudo lain)
#   MIDTRANS_SERVER_KEY=...
#   MIDTRANS_CLIENT_KEY=...
#   AEGIS_PUBLIC_URL=https://aegis.domain.anda   (atau http://IP:3000 saat awal)
```

Pastikan SSH key Anda sudah ada di `~/.ssh/authorized_keys` VPS (atau gunakan password-based SSH sementara).

---

## 2. Bootstrap VPS (jalan sekali)

Di mesin lokal:

```bash
# Salin & jalankan setup-vps.sh di VPS sebagai root
scp -P "${VPS_PORT:-22}" deploy/setup-vps.sh ${VPS_USER}@${VPS_HOST}:/tmp/
ssh -p "${VPS_PORT:-22}" ${VPS_USER}@${VPS_HOST} 'bash /tmp/setup-vps.sh'
```

Script ini akan:

- Memasang `node 20`, `docker`, `nginx` deps, `firewalld`, `rsync`, `jq`
- Membuat user system `aegis` (uid khusus, tanpa login interaktif default)
- Membuat `/opt/aegis` dengan owner `aegis:aegis`
- Membuka firewall port `80,443/tcp` via `firewall-cmd`
- Menangani **SELinux** (`Enforcing`): set boolean `httpd_can_network_connect=1` dan
  daftarkan port `3000/tcp` sebagai `http_port_t` agar nginx bisa proxy ke app

Override:

```bash
APP_USER=aegis APP_DIR=/srv/aegis INSTALL_DOCKER=false bash setup-vps.sh
```

---

## 3. Deploy aplikasi

### 3a. Mode Docker (default)

```bash
npm run deploy            # = bash deploy/deploy.sh (DEPLOY_MODE=docker)
```

Yang terjadi:

1. `rsync` source → `${VPS_APP_DIR}` (default `/opt/aegis`), exclude `.git`, `node_modules`, `logs`, `backups`, `.env`
2. `scp` `.env` lokal → `${VPS_APP_DIR}/.env` (chmod 600)
3. `docker compose build aegis && docker compose up -d aegis`
4. Health check: `curl http://127.0.0.1:3000/api/health`

Cek log:

```bash
ssh ${VPS_USER}@${VPS_HOST} 'cd /opt/aegis && docker compose logs -f aegis'
```

### 3b. Mode Systemd (native Node)

```bash
npm run deploy:systemd
```

Yang terjadi:

1. `rsync` source
2. `npm ci --omit=dev` di VPS
3. Install `/etc/systemd/system/aegis.service` dari `deploy/aegis.service`
4. `systemctl daemon-reload && enable --now aegis`

Cek log:

```bash
npm run vps:logs       # journalctl -u aegis -e -f
npm run vps:status
```

---

## 4. Reverse proxy + HTTPS

Aplikasi by default bind ke `127.0.0.1:3000` (saat mode Docker) sehingga **tidak** terekspos ke internet.
Untuk go-public lewat domain + TLS:

### Opsi A — nginx dalam docker compose

```bash
# Edit deploy/nginx/aegis.conf — ganti server_name ke VPS_DOMAIN Anda
ssh ${VPS_USER}@${VPS_HOST} 'cd /opt/aegis && docker compose --profile proxy up -d'
```

### Opsi B — nginx native + certbot (lebih simpel untuk TLS otomatis)

Di VPS:

```bash
dnf -y install nginx
cp /opt/aegis/deploy/nginx/aegis.conf       /etc/nginx/conf.d/aegis.conf
cp /opt/aegis/deploy/nginx/aegis_proxy.inc  /etc/nginx/conf.d/aegis_proxy.inc
# Ganti `server aegis:3000;` menjadi `server 127.0.0.1:3000;`
# Ganti `server_name` ke domain Anda
nginx -t && systemctl enable --now nginx
firewall-cmd --permanent --add-service=http --add-service=https
firewall-cmd --reload
```

Lalu terbitkan sertifikat (dari lokal):

```bash
npm run vps:cert       # menjalankan deploy/issue-cert.sh di VPS
```

---

## 5. Konfigurasi `.env` saat sudah punya domain

Setelah TLS aktif, perbarui:

```env
AEGIS_PUBLIC_URL=https://aegis.domain.anda
MIDTRANS_FINISH_URL=        # biarkan kosong, otomatis pakai AEGIS_PUBLIC_URL/success
```

Lalu deploy ulang: `npm run deploy`.

Daftarkan **Payment Notification URL** ke Midtrans dashboard:

```
https://aegis.domain.anda/api/payment/webhook
```

---

## 6. Verifikasi end-to-end

```bash
curl https://aegis.domain.anda/api/health
curl https://aegis.domain.anda/api/plans
```

---

## 7. Integrasi OpenClaw Agent di VPS

Agent **Pentest** (`openclaw/agents/Pentest`) bisa dijalankan di VPS untuk pentest
aplikasi lokal yang juga berjalan di VPS itu (`targetUrl: http://127.0.0.1:8080`).
Catatan kebijakan `targetSafety` di `agent.json`:

```json
"targetSafety": {
  "allowLocalhost": true,
  "allowRFC1918": true,
  "denyPublic": true
}
```

Artinya agent ini sengaja **menolak target publik** demi keamanan. Jangan paksa override
di production VPS — jalankan probing terhadap upstream `127.0.0.1` saja.

Cara menjalankan di VPS (mode docker):

```bash
ssh ${VPS_USER}@${VPS_HOST} 'cd /opt/aegis && docker compose exec aegis npm run test:pentest'
```

Cara menjalankan native:

```bash
ssh ${VPS_USER}@${VPS_HOST} 'cd /opt/aegis && sudo -u aegis npm run test:pentest'
```

---

## 8. Troubleshooting OpenCloudOS 9

| Gejala | Penyebab umum | Solusi |
| :--- | :--- | :--- |
| `Permission denied` saat nginx → app | SELinux memblokir | `setsebool -P httpd_can_network_connect 1` (sudah otomatis di `setup-vps.sh`) |
| Port 3000 tidak bisa di-bind oleh nginx | SELinux label port | `semanage port -a -t http_port_t -p tcp 3000` |
| Firewall menolak 80/443 | firewalld | `firewall-cmd --permanent --add-service=http && --reload` |
| `node: command not found` setelah setup | Repo NodeSource gagal | Re-run `dnf module install nodejs:20/common` |
| Docker pull lambat di region CN | Default registry | Tambahkan mirror di `/etc/docker/daemon.json` |
| `aegis.service` exit 203/EXEC | path node beda | Edit `ExecStart=` di `deploy/aegis.service` (cari path: `which node`) |

---

## 9. Update / rollback

Update:

```bash
git pull
npm run deploy
```

Rollback cepat (Docker):

```bash
ssh ${VPS_USER}@${VPS_HOST} 'cd /opt/aegis && docker compose rollback aegis || docker compose up -d aegis@sha256:<previous>'
```

Rollback systemd: `git checkout <commit-sebelumnya> && npm run deploy:systemd`.
