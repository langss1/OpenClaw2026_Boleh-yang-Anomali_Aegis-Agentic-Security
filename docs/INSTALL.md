# Install Aegis CLI

Setelah install, perintah `aegis` dan `openclaw` akan tersedia global di terminal Anda.

## Persyaratan

| Tool | Versi minimum | Catatan |
|---|---|---|
| Node.js | **18+** | `node -v` untuk cek; rekomendasi 20 LTS |
| npm | 9+ | biasanya ikut Node |
| git | 2.x | untuk clone |

OS yang dites: **Linux, macOS, WSL2**. Windows native belum dites (kemungkinan butuh installer terpisah).

---

## Cara A — One-liner installer (paling cepat) ⭐

```bash
curl -fsSL https://raw.githubusercontent.com/langss1/OpenClaw2026_Boleh-yang-Anomali_Aegis-Agentic-Security/feat/vps-integration/install.sh | bash
```

Yang dilakukan installer:

1. Clone repo ke `~/.aegis` (shallow, branch `feat/vps-integration`)
2. `npm install --omit=dev` di dalamnya
3. Bikin symlink `aegis` & `openclaw` di `~/.local/bin/`
4. Cek PATH; kasih instruksi append kalau belum ada

Override default:

```bash
# Branch lain (mis. main saat sudah merge)
curl -fsSL https://raw.githubusercontent.com/.../install.sh | AEGIS_BRANCH=main bash

# Install dir custom
curl -fsSL ... | AEGIS_INSTALL_DIR=/opt/aegis-cli bash

# Bin dir custom
curl -fsSL ... | AEGIS_BIN_DIR=/usr/local/bin bash
```

Setelah selesai:

```bash
aegis help
aegis list
aegis run --agent pentest --task "scan http://localhost:3000 untuk SQLi"
```

---

## Cara B — `npm install -g` langsung dari GitHub

Kalau Anda nyaman pakai npm global:

```bash
npm install -g github:langss1/OpenClaw2026_Boleh-yang-Anomali_Aegis-Agentic-Security#feat/vps-integration
```

Perintah ini otomatis menempatkan `aegis` & `openclaw` di npm global bin
(biasanya `/usr/local/bin/` atau `~/.npm-global/bin/` — perlu sudo di Linux
kalau prefix-nya `/usr/local`).

Untuk update:

```bash
npm install -g github:langss1/OpenClaw2026_Boleh-yang-Anomali_Aegis-Agentic-Security#feat/vps-integration
```

Untuk uninstall:

```bash
npm uninstall -g aegis-professional
```

---

## Cara C — Dev mode (clone + npm link)

Pilih ini kalau Anda mau ngedit kode Aegis:

```bash
git clone https://github.com/langss1/OpenClaw2026_Boleh-yang-Anomali_Aegis-Agentic-Security.git ~/aegis
cd ~/aegis
git checkout feat/vps-integration
npm install
npm link        # atau: sudo npm link  (tergantung npm prefix)
```

Perubahan kode langsung kepakai tanpa re-install (symlink hidup).

---

## Cara D — `npx` (run sekali tanpa install)

Untuk eksekusi one-shot tanpa download permanen:

```bash
npx -p github:langss1/OpenClaw2026_Boleh-yang-Anomali_Aegis-Agentic-Security#feat/vps-integration aegis list
```

Lambat di run pertama (download), tapi nol footprint disk.

---

## Cara E — Alias SSH ke VPS (nol install di laptop)

Kalau Anda **tidak mau install apa-apa** di laptop dan cuma mau pakai VPS yang
sudah running:

```bash
# Tambahkan di ~/.bashrc atau ~/.zshrc
alias aegis='ssh aegis-vps docker exec aegis node /app/src/cli/main.js'
alias aegis-it='ssh -t aegis-vps docker exec -it aegis node /app/src/cli/main.js'

source ~/.zshrc   # atau ~/.bashrc
```

Setelah itu `aegis list`, `aegis run ...` di laptop Anda langsung dieksekusi
di container VPS. Hasil scan tersimpan di volume VPS (`/opt/aegis/...`),
**bukan** di laptop Anda — cocok untuk demo, kurang cocok untuk scan project
lokal Anda sendiri.

---

## Verifikasi instalasi

```bash
$ which aegis
/home/you/.local/bin/aegis

$ aegis help | head -5
FITUR UTAMA (AEGIS SKILLS):
  SecurityCode   Pemindaian keamanan (SAST): secret, injection, dll.
  ...

$ aegis list
Agent terdaftar (2):
  • Aegis Pentest Agent (pentest)
  • Aegis QA Agent (qa)
```

## Troubleshooting

| Gejala | Solusi |
|---|---|
| `aegis: command not found` | `~/.local/bin` belum di PATH. Append `export PATH="$HOME/.local/bin:$PATH"` ke shell rc. |
| `npm install` error karena lock out-of-sync | Jalankan `npm install --no-package-lock` atau hapus `package-lock.json` lalu re-install. |
| `EACCES: permission denied` saat `npm install -g` | Pakai Cara A (installer otomatis pakai user-dir), atau set `npm config set prefix ~/.npm-global`. |
| `Node 16` masih ada | `nvm install 20 && nvm use 20`, atau update via package manager. |
| Aegis CLI jalan, tapi `aegis Ask` error `API_KEY_INVALID` | `export GEMINI_API_KEY=...` di shell, atau set di `~/.aegis/.env`. |

## Update / Uninstall

**Update:** ulang installer (Cara A) atau:

```bash
cd ~/.aegis && git pull && npm install --omit=dev
```

**Uninstall (Cara A/C):**

```bash
rm -rf ~/.aegis ~/.local/bin/aegis ~/.local/bin/openclaw
```

**Uninstall (Cara B):**

```bash
npm uninstall -g aegis-professional
```
