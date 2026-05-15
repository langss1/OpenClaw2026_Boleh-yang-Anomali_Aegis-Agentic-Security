# 🛡️ Aegis Project Control Center (Aegis Professional)

Welcome, Agent. This directory is the central nervous system for the **Aegis** autonomous security ecosystem.

## 🤖 Mandatory Instructions for AI Agents
If you are an AI assistant working on this project, you **MUST** adhere to the following protocols:

1.  **Read Before Writing:** Always read `docs/plan.md`, `docs/feature.md`, and `docs/agent.md` to understand the current architecture.
2.  **Persistent Progress:** Every update you make **MUST** be recorded in the appropriate `docs/progres_[module].md` file.
3.  **Modular Development:** All code must reside in the `/src` directory under its respective module or agent folder.

---

## 📂 Unified Project Structure

### 💻 Source Code (`/src`)
- **[/cli](./src/cli)**: Entry point for the unified Aegis terminal interface.
- **[/core](./src/core)**: Core logic, base classes, and orchestrator.
- **[/modules](./src/modules)**: The 4 core products — **SecurityCode** (SAST), **QA** (auto-remediation), **LocalPentest** (DAST/OWASP Top-10), **Ask** (AI security chat).
- **[/agents](./src/agents)**: Reusable AI agents (Recon, Security, Patch, etc.).

### 📖 Documentation (`/docs`)
- [**Plan.md**](./plan.md) - Project roadmap & architecture.
- [**Feature.md**](./feature.md) - Detailed module specifications.
- [**Agent.md**](./agent.md) - Agent roles & collaboration rules.
- [**Progress Logs**](./) - Real-time tracking of module development.

### 🛡️ Operational Folders
- **[/backups](./backups)**: Automatic security backups (.bak) created during patching.

---

## 🚀 Getting Started
Jalankan perintah berikut di terminal Anda:
- `aegis help` - Untuk melihat menu bantuan.
- `aegis autopilot` - Untuk menjalankan pipeline penuh secara otonom.

---

## ☁️ Deploy ke VPS (OpenCloudOS 9 / RHEL 9 family)
Lihat **[`docs/VPS_DEPLOYMENT.md`](./docs/VPS_DEPLOYMENT.md)** untuk panduan lengkap.

Ringkas:
```bash
cp .env.example .env                            # isi VPS_HOST, VPS_USER, MIDTRANS_*
scp deploy/setup-vps.sh $VPS_USER@$VPS_HOST:/tmp/
ssh $VPS_USER@$VPS_HOST bash /tmp/setup-vps.sh  # bootstrap sekali
npm run deploy                                  # docker compose (default)
# atau:
npm run deploy:systemd                          # native node + systemd
```

Endpoint health: `GET /api/health` · Webhook Midtrans: `POST /api/payment/webhook`.

*This ecosystem is managed by the Aegis Planning Agent.*

