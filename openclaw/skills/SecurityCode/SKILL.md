# Skill: SecurityCode

**Tupoksi:** pemindaian keamanan statis (SAST) untuk kode dan file env di dalam `targetDir`, lewat engine `SecurityAgent` di `src/agents/security_agent.js`.

**Bukan tupoksi skill ini:** perbaikan kode (QA), eksploitasi runtime (LocalPentest), atau konsultasi bebas (Ask).

**Output:** laporan utama `logs/Security_Code/REPORT_Security_Code.md` ditulis oleh `SecurityAgent`; skill ini juga menulis log eksekusi di `logs/Security_Code/` dengan prefix konfigurasi di `skill.json`.

**Masukan:** `{ targetDir: string }` — path absolut atau relatif yang wujud di disk.
