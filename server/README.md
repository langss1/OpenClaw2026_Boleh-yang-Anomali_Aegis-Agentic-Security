# Aegis SaaS Backend

Layer SaaS untuk membungkus produk Aegis (CLI + Agen OpenClaw) menjadi layanan berbayar. Fokus pertama: **demo kompetisi** dengan Midtrans sandbox.

> **Scope**: ini bukan modul keamanan (skill/agent). Ini adalah **product layer** yang mengelola subscription dan pembayaran. Pemilik: tim secara umum (bukan QA only).

---

## 1. Struktur

```
server/
├── README.md                 ← file ini
├── index.js                  ← Express app entry
├── config.js                 ← loader env + plans
├── plans.json                ← MANIFEST pricing tier (edit untuk ubah harga/fitur)
├── routes.js                 ← register semua routes
├── payment/
│   ├── midtrans.js           ← Midtrans SDK wrapper
│   └── handlers.js           ← endpoint /api/payment/*
└── subscription/
    ├── store.js              ← read/write JSON store
    ├── handlers.js           ← endpoint /api/subscription/*
    └── data/                 ← state runtime (gitignored)
        └── .gitkeep
```

## 2. Cara Menjalankan

### Setup env

```powershell
Copy-Item .env.example .env
# edit .env → isi MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY
```

Daftar sandbox: <https://dashboard.sandbox.midtrans.com> (gratis, tanpa verifikasi bisnis).
Setelah register → Settings → Access Keys → copy `Server Key` dan `Client Key`.

### Start server

```powershell
npm run server         # production-style
npm run server:dev     # auto-reload saat file berubah
```

Output:

```
[AEGIS SaaS] listening on http://localhost:3000
  Midtrans  : configured (sandbox)
  Plans     : free, pro, enterprise
```

## 3. Endpoint

| Method | Path | Body / Param | Response |
| --- | --- | --- | --- |
| GET | `/api/health` | — | `{ ok, service }` |
| GET | `/api/plans` | — | daftar tier dari `plans.json` |
| GET | `/api/subscription/:userId` | userId di path | subscription user (Free kalau belum ada) |
| POST | `/api/subscription/:userId/deactivate` | userId di path | tandai non-aktif |
| POST | `/api/payment/create` | `{ userId, planId, customerEmail? }` | `{ snapToken, redirectUrl, orderId }` |
| POST | `/api/payment/webhook` | Midtrans notification payload | `{ ok: true }` |

## 4. Cara Demo End-to-End

### Skenario yang disarankan untuk pitch

```powershell
# Terminal 1 — start server
npm run server

# Terminal 2 — coba flow
# Langkah 1: lihat plan
curl http://localhost:3000/api/plans

# Langkah 2: status user (default free)
curl http://localhost:3000/api/subscription/demo-user

# Langkah 3: buat transaksi Pro
curl -X POST http://localhost:3000/api/payment/create `
     -H "Content-Type: application/json" `
     -d '{ "userId": "demo-user", "planId": "pro" }'
# response berisi snapToken + redirectUrl
# buka redirectUrl di browser → bayar pakai sandbox (Gopay/BCA test)

# Langkah 4: webhook akan otomatis dipanggil oleh Midtrans
# (atau untuk demo offline, POST manual ke /api/payment/webhook dengan body sandbox)

# Langkah 5: status user setelah bayar
curl http://localhost:3000/api/subscription/demo-user
# tier sekarang "pro", license key terbit
```

### Untuk demo tanpa internet

Webhook sandbox butuh callback ke endpoint kita. Kalau pitch offline:

1. Pakai **Midtrans simulator** (di dashboard sandbox) untuk trigger webhook manual.
2. Atau **POST manual** ke `/api/payment/webhook` dengan body contoh dari `https://docs.midtrans.com`.

## 5. Filosofi yang Dipertahankan

Sama seperti pattern di `openclaw/agents/QA/`:

- **Data-driven**: pricing tier (`plans.json`), env (`.env`) — **bukan** hardcoded di JS.
- **Manifest = single source of truth**: edit `plans.json` untuk ubah harga/fitur, tidak perlu sentuh kode.
- **Failure-safe**: kalau Midtrans tidak dikonfigurasi, endpoint `/api/payment/create` return 503 dengan pesan jelas, bukan crash.
- **Audit trail**: setiap order tersimpan di `subscriptions.json` dengan timestamp.

## 6. Untuk Tim

Komponen ini terbuka untuk diperluas oleh siapapun. Beberapa arah lanjutan:

- **Tambah payment gateway lain** (Stripe, Xendit, DOKU): tinggal buat file baru di `payment/<provider>.js` dengan interface yang sama (`createTransaction`, `verifyNotification`, `isPaid`).
- **Pindah ke database**: ganti `subscription/store.js` dengan implementasi Postgres/MongoDB. API permukaan sama.
- **Tambah auth**: tambahkan middleware di `routes.js`, masing-masing endpoint terima token. Sekarang sengaja tidak ada auth karena demo.

## 7. Yang **Belum** Diimplementasikan (sengaja)

- Auth/login (untuk demo, `userId` diasumsikan trusted).
- Database production (file JSON cukup untuk demo).
- Refund / cancel subscription.
- Multi-tenant resource isolation.
- Rate limiting.
- HTTPS / SSL (deployment concern).
- Integrasi CLI (akan dibahas terpisah kalau diinginkan).

## 8. Cara Integrasi Frontend

Setelah frontend siap (Next.js / React / dst.):

1. **Render daftar plan**: GET `/api/plans` → tampilkan kartu pricing.
2. **Klik subscribe**: POST `/api/payment/create` → terima `snapToken`.
3. **Buka Snap popup**: load Midtrans Snap.js, panggil `snap.pay(snapToken)`.
4. **Setelah bayar**: refresh GET `/api/subscription/:userId` → tampilkan license key.

Library Snap.js: `https://app.sandbox.midtrans.com/snap/snap.js` (untuk sandbox) atau `https://app.midtrans.com/snap/snap.js` (production).

```html
<script src="https://app.sandbox.midtrans.com/snap/snap.js"
        data-client-key="YOUR_CLIENT_KEY"></script>

<script>
snap.pay(snapToken, {
    onSuccess: () => location.href = '/success',
    onPending: () => alert('Menunggu pembayaran'),
    onError:   () => alert('Pembayaran gagal'),
});
</script>
```

---

*Dokumen ini akan diperbarui saat fitur baru ditambahkan.*
