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

## Cara A — `npm install -g` dari npm registry ⭐ (rekomendasi)

```bash
npm install -g aegis-agentic-security
```

> Kalau prefix npm Anda ada di `/usr/local/`, butuh `sudo`. Lebih aman:
> ```bash
> # Set prefix ke home (sekali saja)
> npm config set prefix "$HOME/.npm-global"
> export PATH="$HOME/.npm-global/bin:$PATH"   # tambah ke ~/.bashrc / ~/.zshrc
>
> npm install -g aegis-agentic-security
> ```

Update: `npm update -g aegis-agentic-security`
Uninstall: `npm uninstall -g aegis-agentic-security`

---

## Cara B — One-liner installer script (tanpa npm publish dependency)

Kalau paket belum/tidak di-publish ke registry, pakai installer langsung dari GitHub:

```bash
curl -fsSL https://raw.githubusercontent.com/langss1/OpenClaw2026_Boleh-yang-Anomali_Aegis-Agentic-Security/feat/vps-integration/install.sh | bash
```

Yang dilakukan installer:

1. Clone repo ke `~/.aegis` (shallow, branch `feat/vps-integration`)
2. `npm install --omit=dev` di dalamnya
3. Bikin symlink `aegis` & `openclaw` di `~/.local/bin/`
4. Cek PATH; kasih instruksi append kalau belum ada

Override default installer (Cara B):

```bash
# Branch lain (mis. main saat sudah merge)
curl -fsSL https://raw.githubusercontent.com/.../install.sh | AEGIS_BRANCH=main bash

# Install dir custom
curl -fsSL ... | AEGIS_INSTALL_DIR=/opt/aegis-cli bash

# Bin dir custom
curl -fsSL ... | AEGIS_BIN_DIR=/usr/local/bin bash
```

---

## Cara C — `npm install -g` langsung dari GitHub (tanpa registry)

Bypass npm registry, install langsung dari Git:

```bash
npm install -g github:langss1/OpenClaw2026_Boleh-yang-Anomali_Aegis-Agentic-Security#feat/vps-integration
```

Untuk uninstall:

```bash
npm uninstall -g aegis-agentic-security
```

---

## Cara D — Dev mode (clone + npm link)

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

## Cara E — `npx` (run sekali tanpa install)

Untuk eksekusi one-shot tanpa download permanen:

```bash
# Dari npm registry
npx -p aegis-agentic-security aegis list

# Atau dari GitHub langsung
npx -p github:langss1/OpenClaw2026_Boleh-yang-Anomali_Aegis-Agentic-Security#feat/vps-integration aegis list
```

Lambat di run pertama (download), tapi nol footprint disk.

---

## Cara F — Alias SSH ke VPS (nol install di laptop)

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

**Uninstall (Cara A/C):**

```bash
npm uninstall -g aegis-agentic-security
```

---

## Untuk Maintainer — Cara Publish ke npm Registry

> Section ini untuk pemilik repo / yang ingin re-publish.

### Sekali setup

1. Buat akun di https://www.npmjs.com (verify email).
2. Pastikan nama paket `aegis-agentic-security` masih tersedia (atau ganti di
   `package.json#name`). Cek dengan:
   ```bash
   npm view aegis-agentic-security 2>/dev/null && echo "TAKEN" || echo "AVAILABLE"
   ```
3. (Opsional, recommended) Aktifkan 2FA di npm: Settings → Two-Factor Authentication.
4. Login dari mesin local:
   ```bash
   npm login                          # masukkan username/password/email/OTP
   npm whoami                         # verifikasi akun
   ```

### Publish

```bash
# 1. Pastikan di branch yang benar dan working tree bersih
git status

# 2. Dry-run untuk lihat file apa yang akan masuk tarball
npm pack --dry-run

# 3. Bump version (semver). Pilih salah satu:
npm version patch    # 3.1.0 → 3.1.1  (bugfix)
npm version minor    # 3.1.0 → 3.2.0  (fitur baru)
npm version major    # 3.1.0 → 4.0.0  (breaking)

# 4. Publish (scope publik)
npm publish --access public

# 5. Push tag yang dibuat oleh `npm version`
git push --follow-tags
```

`prepublishOnly` script otomatis akan validate shebang di bin files
sebelum publish — jadi tidak akan ada paket yang broken di registry.

### Verifikasi setelah publish

```bash
# Cek di registry
npm view aegis-agentic-security

# Test install di mesin lain (atau via npx)
npx aegis-agentic-security aegis list
```

### Unpublish (dalam 72 jam, kalau salah publish)

```bash
npm unpublish aegis-agentic-security@<version>      # 1 versi
# atau (HATI-HATI — ireversibel):
npm unpublish aegis-agentic-security --force
```

### Tips

- File yang **selalu** ikut: `package.json`, `README.md`, `LICENSE`, file di `main`,
  file di `bin`.
- File lainnya dikontrol oleh `files` array di `package.json` + `.npmignore`.
- `.env`, `node_modules/`, `logs/`, `reports/`, `deploy/`, `Dockerfile` —
  **dijamin** tidak ikut karena sudah di-exclude di `.npmignore` dan tidak di `files`.
- Untuk paket scoped (`@username/aegis`), butuh `--access public` kalau mau
  paket gratis publik (default scoped = private = bayar).
