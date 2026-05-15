# Aegis Web (Next.js)

Marketing site + login/pricing/success. **Scan CLI tetap di terminal** — bukan dashboard web.

## Arsitektur

| Proses | Port | Peran |
|--------|------|--------|
| `npm run server` (root) | 4000 | API SaaS: plans, payment, subscription |
| `npm run web:dev` | 3000 | Next.js UI; `/api/*` di-proxy ke :4000 |

## Dev cepat

```bash
# Terminal 1 (root)
npm run server

# Terminal 2
cd web && cp .env.example .env.local && npm install && npm run dev
```

Env: lihat `web/.env.example` dan `.env.example` di root.

## vs `server/web/` (HTML teman)

HTML embedded di Express (`server/web/`) diganti app Next.js ini. API tetap di `server/routes.js`.
