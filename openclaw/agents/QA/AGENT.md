# 🤖 OpenClaw Agent — QA (Auto-Fix Specialist)

Agen QA adalah **persona OpenClaw** yang bertanggung jawab atas siklus remediasi: menerima daftar kerentanan, memutuskan apakah patch boleh diterapkan, lalu memanggil skill QA untuk eksekusi.

> **Tupoksi:** hanya QA. Agen tidak melakukan pemindaian (skill SecurityCode), simulasi serangan (skill LocalPentest), atau membangun arsitektur (skill Development).

---

## 1. Hubungan dengan Skill & Worker

```
┌─────────────────────────────────────┐
│   openclaw/agents/QA  (persona)     │  ← di sini: kebijakan, keputusan, AI nanti
│                                     │
│   - terima findings                 │
│   - putuskan: human-loop / auto     │
│   - emit events ke gateway          │
│   - (nanti) panggil AI untuk fix    │
└───────────────┬─────────────────────┘
                │ memakai
                ▼
┌─────────────────────────────────────┐
│   openclaw/skills/QA  (kapabilitas) │  ← kontrak, validasi, logging
└───────────────┬─────────────────────┘
                │ memakai
                ▼
┌─────────────────────────────────────┐
│   src/agents/PatchAgent  (worker)   │  ← eksekusi byte-level patch
└─────────────────────────────────────┘
```

Pemisahan ini penting: kalau besok kita ganti backend AI atau policy autoConfirm, **hanya `openclaw/agents/QA` yang berubah** — skill dan worker tetap.

## 2. Mode Eksekusi (semua diatur di `agent.json`)

Mode diambil dari `policies.autoConfirm.modes`. Default dari `policies.autoConfirm.default`.

| Mode | Perilaku |
| --- | --- |
| `never` | semua patch perlu konfirmasi `y/n` (perilaku lama) |
| `safe-only` | patch berisiko-rendah otomatis diterapkan; sisanya tetap perlu konfirmasi |
| `all` | semua patch otomatis (khusus CI, harus eksplisit) |

**Definisi "berisiko-rendah"** sepenuhnya berada di `policies.safePatch` (tidak ada di kode):

```json
{
  "requireFixedCodePattern": "process\\.env\\.",
  "allowedSeverities": ["Critical", "High"],
  "denyPathPattern": "\\b(routes|api|middleware|auth)\\b"
}
```

Mengubah aturan = **edit `agent.json`**, tidak perlu sentuh JS. Tambah severity baru? Tambahkan ke array. Mau perketat path sensitif? Ubah regex `denyPathPattern`.

## 3. Event yang Diemit

Nama event diambil dari `events.*` di `agent.json`. Tanpa `onEvent` listener, agen tetap berjalan (event diabaikan). Listener yang melempar exception **tidak akan mematikan agent**.

| Key di manifest | Nilai default | Payload |
| --- | --- | --- |
| `events.start` | `agent:start` | `{ runId, targetDir, findingsCount, mode, startedAt }` |
| `events.finding` | `agent:finding` | `{ runId, index, finding }` |
| `events.decision` | `agent:decision` | `{ runId, index, decision }` |
| `events.patchApplied` | `agent:patch-applied` | `{ runId, index, file, line, mode }` |
| `events.patchRejected` | `agent:patch-rejected` | `{ runId, index, reason }` |
| `events.complete` | `agent:complete` | `{ runId, healed, total, score }` |
| `events.error` | `agent:error` | `{ runId, message, stack }` |

## 4. Run-ID & Audit

Setiap pemanggilan menghasilkan `runId` (UUID v4) yang disertakan di:
- Nama file log: `logs/QA/run-<ISO>-<runId-short>.log`
- Header `docs/REPORT_QA.md`
- Setiap event

Memudahkan tracing kalau ada keluhan "kapan patch ini diterapkan?".

## 5. AI Backend (placeholder)

Field `ai.enabled` di `agent.json` masih `false`. Saat diaktifkan:
- Backend dipilih via env `AEGIS_AI_BACKEND` (`ollama` / `openai` / `deepseek` / `mock`).
- Tugas AI dalam QA: **menyusun ulang `fixedCode` berdasarkan konteks** (file, kode sekitar, framework) — bukan menggantikan keputusan user, kecuali di mode `safe-only`/`all`.
- Backend di-load **lazily** agar agen tetap jalan tanpa AI.

## 6. Cara Dipanggil

### Dari OpenClaw gateway
```js
const { runQAAgent } = require('./openclaw/agents/QA');

const result = await runQAAgent({
    targetDir: '/path/to/project',
    findings,                       // dari skill SecurityCode
    autoConfirm: 'never',
    onEvent: (evt) => gateway.emit(evt),
});
```

### Dari CLI (perintah baru, opsional)
Belum diwire ke `aegis QA` agar tidak mengubah perilaku lama. Akan ditambahkan di iterasi berikutnya bila kamu setuju (`aegis QA --agent` atau `aegis QA --auto safe-only`).

## 7. Filosofi: Manifest-Driven, Bukan Code-Driven

Mulai versi 1.1.0:

- **Aturan policy** (modes, safePatch, severities, sensitive paths) → `agent.json`
- **Pesan error & template** (termasuk variabel `{value}`, `{modes}`, `{targetDir}`) → `agent.json`
- **Nama event** → `agent.json`
- **Path skill yang dipakai** → `agent.json`

Yang tetap di JS hanyalah **kerangka eksekusi** (validasi input, generate run-id, panggil skill/worker, agregasi). Mengubah perilaku agent **tidak harus** menyentuh `index.js`.

## 8. Gap yang Diakui (akan dikerjakan bertahap)

- AI backend belum diimplementasi — `agent.json` punya placeholder `ai.systemPromptFile` siap pakai.
- Memory per-repo (preferensi user) belum ada — direncanakan di `logs/QA/preferences.json`.
