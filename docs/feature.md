# 🛡️ Aegis: Daftar Fitur & Modul

Aegis adalah ekosistem otonom yang membagi tugas keamanan menjadi 5 fitur utama yang mudah dimengerti:

## 1. 🛡️ SecurityCode
*Dulu: Security*
- **Tugas:** Menganalisis kode sumber secara mendalam untuk menemukan celah keamanan (SAST).
- **Output:** Daftar kerentanan kritis seperti Hardcoded Secrets dan SQL Injection.

## 2. 🧪 QA
*Dulu: Testing*
- **Tugas:** Melakukan perbaikan kode secara otomatis (*Auto-Fix*) tanpa merusak logika aplikasi.
- **Workflow:** Melakukan backup `.bak` secara otomatis sebelum melakukan "pembedahan" kode.

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
