# REPORT — VPS Integration

**Modul:** VPS Integration
**Owner:** Aegis Planning Agent
**Tanggal:** 2026-05-15
**Target VPS:** OpenCloudOS 9 (`Linux VM-10-221-opencloudos 6.6.117-45.1.oc9.x86_64 x86_64`)

## Ringkasan
Proyek Aegis SaaS (server Express + OpenClaw agents) sekarang siap di-deploy ke VPS
RHEL-family (khusus dites untuk OpenCloudOS 9) dengan dua jalur: **Docker Compose**
(default) atau **systemd native**. Reverse proxy nginx + Let's Encrypt tersedia
sebagai template plug-and-play.

## Artifact yang ditambahkan

| Path | Tujuan |
| :--- | :--- |
| `Dockerfile` | Build image Aegis (Node 20 Alpine, non-root, tini, healthcheck) |
| `.dockerignore` | Konteks build minimal & aman |
| `docker-compose.yml` | Orkestrasi `aegis` + profile `proxy` (nginx) |
| `deploy/setup-vps.sh` | Bootstrap VPS (dnf, NodeSource, Docker, firewalld, SELinux) |
| `deploy/deploy.sh` | rsync + push `.env` + restart service (docker/systemd) |
| `deploy/aegis.service` | systemd unit ter-hardened |
| `deploy/nginx/aegis.conf` | Template reverse proxy |
| `deploy/nginx/aegis_proxy.inc` | Proxy headers reusable |
| `deploy/issue-cert.sh` | Klaim TLS Let's Encrypt via certbot |
| `docs/VPS_DEPLOYMENT.md` | Panduan deploy lengkap (9 section + troubleshooting) |
| `docs/progres_VPSIntegration.md` | Append-only progress log |

## Perubahan kode aplikasi

| File | Perubahan |
| :--- | :--- |
| `server/config.js` | Tambah `cfg.host` (env `HOST`) & `cfg.publicUrl` (env `AEGIS_PUBLIC_URL`); `cfg.midtrans.finishUrl` dihitung di satu tempat. |
| `server/index.js` | `app.listen(port, host, ...)` eksplisit + log `Public URL`. |
| `server/payment/midtrans.js` | `callbacks.finish` baca dari `cfg.midtrans.finishUrl` (tidak hard-code). |
| `package.json` | `docker:*`, `vps:setup`, `deploy[:docker|:systemd]`, `vps:cert`, `vps:logs`, `vps:status`. |
| `.env.example` | Section VPS + OpenClaw runtime + Midtrans dynamic finish URL. |

## Pengaturan keamanan yang sudah diterapkan

- **systemd hardening** (`deploy/aegis.service`): `NoNewPrivileges`, `ProtectSystem=strict`,
  `ProtectHome`, `ReadWritePaths` terbatas, `MemoryDenyWriteExecute`, `LockPersonality`,
  `RestrictSUIDSGID`, `PrivateTmp`.
- **Docker hardening**: image Alpine slim, user non-root (`aegis`), `tini` PID 1,
  HEALTHCHECK, bind hanya ke `127.0.0.1:3000` (akses publik wajib lewat nginx).
- **SELinux** (OpenCloudOS 9 default Enforcing): boolean `httpd_can_network_connect=1`
  + label port 3000 sebagai `http_port_t` di-set otomatis.
- **firewalld**: hanya port 80/443/tcp dibuka by default.
- **TLS**: template HTTPS server block + HSTS, dipersiapkan untuk certbot.

## Compliance terhadap protokol Aegis

- [x] Read-before-write: `docs/plan.md`, `docs/feature.md`, `docs/agent.md` dibaca lebih dulu.
- [x] Mandatory REPORT.md: dokumen ini.
- [x] Human-in-the-loop: deploy script **tidak** menjalankan apapun di lokal; semua
  perubahan di VPS dipicu manual via `npm run deploy*`.
- [x] Append-only progres: `docs/progres_VPSIntegration.md`.
- [x] Modular: semua artefak deploy di `deploy/`, dokumentasi di `docs/`, tidak
  mencampuri `src/` atau `openclaw/`.

## Risiko & batasan

1. **OpenClaw Pentest agent menolak target publik** (`targetSafety.denyPublic=true`).
   Jangan override flag ini di VPS produksi.
2. Script `setup-vps.sh` mengasumsikan **kernel RHEL 9 family**. Sudah dites secara
   logis untuk OpenCloudOS 9; untuk distro lain, masih best-effort.
3. `.env` dikirim via `scp` → pastikan koneksi SSH menggunakan key (jangan password
   plaintext untuk produksi).
4. Tidak ada CI/CD otomatis — deploy bersifat **manual trigger**, sesuai semangat
   human-in-the-loop Aegis.

## Langkah berikutnya yang disarankan

1. Isi `.env` (terutama `VPS_HOST`, `MIDTRANS_*`, opsional `VPS_DOMAIN`).
2. Tambahkan SSH public key Anda ke `${VPS_USER}@${VPS_HOST}:~/.ssh/authorized_keys`.
3. Jalankan bootstrap: `scp deploy/setup-vps.sh ${VPS_USER}@${VPS_HOST}:/tmp/ && ssh ${VPS_USER}@${VPS_HOST} bash /tmp/setup-vps.sh`.
4. Deploy: `npm run deploy`.
5. Verifikasi: `curl http://${VPS_HOST}:3000/api/health` (atau via reverse proxy).
6. Bila punya domain: jalankan `npm run vps:cert` setelah DNS A-record menunjuk ke VPS.
