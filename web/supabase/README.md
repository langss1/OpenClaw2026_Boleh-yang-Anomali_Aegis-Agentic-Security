# Supabase setup (web marketing)

## 1. Buat project di [supabase.com](https://supabase.com)

## 2. Auth → URL configuration

- Site URL: `http://localhost:3000`
- Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/**`

## 3. Salin keys ke `web/.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
API_URL=http://localhost:4000
```

## 4. (Opsional) Tabel profil

Jalankan `schema.sql` di SQL Editor jika ingin menyimpan metadata user.

## 5. Alur app

- Login/register → Supabase Auth
- `user.id` dipakai sebagai `userId` di `/api/payment/create` dan subscription JSON di server
