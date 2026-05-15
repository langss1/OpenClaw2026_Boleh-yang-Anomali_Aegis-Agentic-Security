# 🤖 Aegis Agent Protocols (Unified Environment)

Selamat datang di lingkungan kolaborasi Aegis. Dokumen ini adalah panduan wajib bagi semua Agen AI dan kontributor manusia yang bekerja dalam sistem ini.

## 📜 Protokol Wajib (PENTING!)
Sebelum mulai mengerjakan tugas apapun, setiap Agen **WAJIB**:
1.  **Pelajari Seluruh Dokumentasi:** Baca `docs/plan.md`, `docs/feature.md`, dan `docs/agent.md` untuk memahami konteks dan tujuan fitur.
2.  **Kirim Progres Berkala:** Setiap pembaruan harus dicatat di file `progres_[NamaModul].md` yang sesuai.
3.  **Hanya Tambahkan (Append-Only):** Jangan pernah menghapus log lama. Tambahkan log baru di akhir file dengan timestamp yang jelas.

---

## 👥 Daftar Agen & Tanggung Jawab

| Modul Utama | Tanggung Jawab | File Progres |
| :--- | :--- | :--- |
| **SecurityCode** | Analisis kode berbahaya & celah keamanan. | `docs/progres_SecurityCode.md` |
| **QA** | Perbaikan kode otomatis (Auto-Fix) & kualitas. | `docs/progres_QA.md` |
| **LocalPentest** | Simulasi serangan hacker secara lokal. | `docs/progres_LocalPentest.md` |
| **Development** | Pembuatan arsitektur & boilerplate aman. | `docs/progres_Development.md` |
| **Ask** | Konsultasi keamanan AI kontekstual. | `docs/progres_Ask.md` |

---

## 🛠️ Workflow Kolaborasi (Environment Teman-Teman)
1.  **Reconnaissance**: Agen mengidentifikasi stack proyek.
2.  **Analysis**: Agen `SecurityCode` memindai celah.
3.  **Remediation**: Agen `QA` memperbaiki celah yang ditemukan.
4.  **Simulation**: Agen `LocalPentest` menguji kekuatan patch.
5.  **Logging**: Semua aktivitas dicatat secara detail di folder `docs/`.

---
*Dokumen ini dikelola oleh Aegis Planning Agent.*
