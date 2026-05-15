# Progress Log — VPS Integration

> Append-only log sesuai protokol Aegis (`docs/agent.md`).

## 2026-05-15 10:36 (Aegis Planning Agent)
- Target VPS: **OpenCloudOS 9** (`6.6.117-45.1.oc9.x86_64`, x86_64).
- Ditambahkan variabel env baru di `.env.example`: `HOST`, `AEGIS_PUBLIC_URL`,
  `VPS_HOST/USER/PORT/APP_DIR/SERVICE_NAME`, `VPS_DOMAIN`, `VPS_LETSENCRYPT_EMAIL`,
  `AEGIS_AI_BACKEND`, `QA_AEGIS_*`.
- `server/config.js` sekarang membaca `HOST` dan `AEGIS_PUBLIC_URL`; `cfg.midtrans.finishUrl`
  dihitung di satu tempat untuk konsistensi callback Midtrans.
- `server/index.js` bind eksplisit ke `cfg.host` (default `0.0.0.0`) dan log menyertakan
  `Public URL` agar tidak ambigu di environment headless.
- `server/payment/midtrans.js` membaca `finishUrl` dari config (bukan langsung env)
  sehingga override `AEGIS_PUBLIC_URL` otomatis terpakai.

## 2026-05-15 10:38 (Aegis Planning Agent)
- `Dockerfile` multi-stage (builder + runtime Alpine) ditambahkan; non-root user
  `aegis`, `tini` sebagai PID 1, HEALTHCHECK `/api/health`.
- `.dockerignore` menyaring `.git`, `node_modules`, `.env`, `logs/*`, `backups/`, dll.
- `docker-compose.yml` dengan service `aegis` (bind `127.0.0.1:3000`) + profile opsional
  `proxy` untuk nginx, volumes persisten untuk `server/subscription/data` & `logs`.

## 2026-05-15 10:40 (Aegis Planning Agent)
- Folder `deploy/` dibuat:
  - `setup-vps.sh` — bootstrap OpenCloudOS 9: `dnf` deps, NodeSource 20, Docker CE,
    user `aegis`, `firewalld` port 80/443, `semanage` port 3000, SELinux boolean
    `httpd_can_network_connect=1`.
  - `deploy.sh` — `rsync` source → VPS, push `.env` (chmod 600), mode `docker` atau
    `systemd`, health check post-deploy.
  - `aegis.service` — systemd unit ter-hardened (NoNewPrivileges, ProtectSystem=strict,
    ReadWritePaths terbatas pada `logs/` & `subscription/data/`, MemoryDenyWriteExecute,
    journald output).
  - `nginx/aegis.conf` + `aegis_proxy.inc` — template reverse proxy (HTTP→app, blok
    HTTPS comment-out untuk diaktifkan setelah certbot).
  - `issue-cert.sh` — install certbot + nginx plugin via `dnf`, klaim sertifikat
    Let's Encrypt non-interactive.

## 2026-05-15 10:42 (Aegis Planning Agent)
- `package.json` ditambahi script: `docker:*`, `vps:setup`, `deploy[:docker|:systemd]`,
  `vps:cert`, `vps:logs`, `vps:status`.
- Dokumen `docs/VPS_DEPLOYMENT.md` dibuat dengan 9 section: persiapan, bootstrap,
  deploy (docker/systemd), reverse proxy, TLS, env publik, verifikasi, integrasi
  OpenClaw agent di VPS (menghormati policy `targetSafety.denyPublic`), troubleshooting
  spesifik OpenCloudOS 9 (SELinux, firewalld, NodeSource), update/rollback.

## Catatan kompatibilitas OpenClaw Agent
- `openclaw/agents/Pentest/agent.json` → `policies.targetSafety.denyPublic: true`.
  Saat deploy ke VPS publik, agent Pentest **tidak** boleh diarahkan ke domain publik
  VPS itu sendiri. Workflow yang aman: agent menjalankan probing terhadap upstream
  `127.0.0.1` (loopback) di dalam VPS yang sama, lalu hasilnya disurvey lewat report.
- `errorRouting.qaAegisEndpoint` diatur lewat env `QA_AEGIS_ENDPOINT` (sudah ada di
  `.env.example`).
