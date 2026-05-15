# Agent: SecurityCode

**Tupoksi:** menjalankan skill **SecurityCode** untuk SAST pada `targetDir` dan mengembalikan daftar findings plus path laporan/read-only artifact.

**Tidak:** auto-fix kode (itu **QA** untuk quality-only), ataupun tes dinamis (itu **LocalPentest**).

Pipeline yang disarankan di dokumentasi proyek: SecurityCode → (opsional Pentest / QA sesuai jenis finding).
