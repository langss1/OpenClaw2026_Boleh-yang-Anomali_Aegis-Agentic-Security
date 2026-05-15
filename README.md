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
- **[/modules](./src/modules)**: The 5 core products (Security, Testing, Pentest, Dev, Ask).
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

*This ecosystem is managed by the Aegis Planning Agent.*

