# 🧪 OpenClaw Skill — QA (Auto-Fix)

Skill ini adalah **pintu masuk OpenClaw** untuk modul QA Aegis. Ia adalah **pembungkus tipis** di atas implementasi yang sudah ada di `src/modules/QA.js` agar tidak ada dua jalur logika yang harus dijaga (lihat catatan routing di `docs/agent.md`).

> **Scope tupoksi:** dokumen dan kode di folder ini **hanya** menyangkut skill **QA**. Skill lain (SecurityCode, LocalPentest, Development, Ask) bukan tanggung jawab skill ini.

---

## 1. Tujuan

Menerapkan **Auto-Fix terkontrol** terhadap daftar temuan kerentanan yang dihasilkan oleh skill **SecurityCode**, dengan **konfirmasi manusia** per temuan, lalu menulis laporan ke `docs/REPORT_QA.md`.

## 2. Kontrak I/O

### Input
- `targetDir: string` — direktori proyek target.
- `findings: Finding[]` — temuan dari upstream (SecurityCode). Bentuk tiap item:
  - `file`, `line`, `issue`, `severity`, `currentCode`, `fixedCode`, `description`.

### Output
- `healed: number` — jumlah temuan yang dipatch.
- `reportFile: string` — path relatif `docs/REPORT_QA.md`.

Skill **menolak berjalan** jika `findings` tidak diberikan atau kosong (ia tidak melakukan pemindaian sendiri — itu wewenang skill SecurityCode).

## 3. Protokol Wajib (sesuai `docs/agent.md`)

1. **Human-in-the-loop**: setiap temuan ditampilkan dan menunggu jawaban `y/n`. Tidak ada perubahan kode tanpa `y`.
2. **Laporan wajib**: `docs/REPORT_QA.md` selalu dibuat/diperbarui ketika ada patch.
3. **Append-only progres**: catat ringkasan sesi di `docs/progres_QA.md`.
4. **Backup**: setiap file yang dimodifikasi otomatis dibackup ke `backups/*.bak` (lewat `PatchAgent`).

## 4. Hubungan dengan implementasi inti

```
openclaw/skills/QA/index.js   ─►  src/modules/QA.js  ─►  src/agents/patch_agent.js
        (pintu OpenClaw)            (logika QA)             (eksekusi patch)
```

Path modul yang dipanggil **tidak hardcoded** — dibaca dari `skill.json`:

```json
"implementation": {
  "modulePath": "../../../src/modules/QA",
  "moduleHandler": "runQA"
}
```

Begitu juga `logDir`, `report path`, `logFilePrefix`, dan semua pesan error. Mengubahnya = edit `skill.json`, tidak perlu menyentuh `index.js`. Tujuannya menjaga **satu sumber kebenaran**: perilaku CLI (`aegis QA`) dan perilaku OpenClaw gateway harus identik karena keduanya memanggil module yang sama.

## 5. Cara dipanggil oleh Gateway OpenClaw

```js
const { runQASkill } = require('./openclaw/skills/QA');

await runQASkill({
  targetDir: process.cwd(),
  findings,            // dari skill SecurityCode
});
```

## 6. Catatan QA / Gap Diketahui

- `autopilot` (`src/core/orchestrator.js`) saat ini memanggil `PatchAgent` langsung **tanpa** alur konfirmasi skill QA. Ini **tidak konsisten** dengan §3 di `agent.md`. Penyelarasan autopilot **di luar tupoksi skill QA** — perlu koordinasi dengan agen orchestrator/planning.
- Skill ini tidak memvalidasi build/tes setelah patch. Verifikasi pasca-remediasi adalah pekerjaan berikutnya yang tetap dalam scope QA dan akan ditambahkan terpisah.
