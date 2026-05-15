# 🛡️ Aegis: Daftar Fitur & Modul

Aegis adalah ekosistem otonom yang membagi tugas keamanan menjadi 5 fitur utama yang mudah dimengerti:

## 1. 🛡️ SecurityCode
- **Tugas:** Menganalisis kode sumber (SAST).
- **Output:** `docs/REPORT_SecurityCode.md` (Daftar celah keamanan).
- **Mode:** Identifikasi celah berbahaya.

## 2. 🧪 QA
- **Tugas:** Perbaikan kode otomatis (*Auto-Fix*).
- **Output:** `docs/REPORT_QA.md` (Daftar file yang diperbaiki).
- **Kontrol:** **WAJIB Konfirmasi Manusia** sebelum melakukan perubahan kode.

## 3. 💣 LocalPentest
*Dulu: Pentest*
- **Tugas:** Mensimulasikan serangan dunia nyata di lingkungan lokal untuk memastikan celah benar-benar bisa dieksploitasi.
- **Tujuan:** Memberikan bukti nyata kerentanan kepada pengembang.

## 4. 🏗️ Development
- **Tugas:** Membangun fondasi aplikasi yang aman dari nol.
- **Fitur:** Membuat *secure-by-default boilerplate* dan konfigurasi middleware keamanan (Helmet, CSP, dll).

## 5. 💬 Ask
- **Tugas:** Konsultan keamanan pribadi Anda di dalam terminal.
- **Fitur:** Menjawab pertanyaan teknis soal keamanan berdasarkan konteks kode proyek Anda sendiri.

---

## 🚀 Perintah CLI
- `aegis SecurityCode`
- `aegis QA`
- `aegis LocalPentest`
- `aegis Development`
- `aegis Ask "pertanyaan"`
- `aegis autopilot` (Menjalankan semua fitur secara berurutan)
