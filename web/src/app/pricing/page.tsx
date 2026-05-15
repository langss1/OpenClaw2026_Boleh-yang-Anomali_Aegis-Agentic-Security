'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getClientAuthUser, type AuthUser } from '@/lib/auth';
import { signOut } from '@/app/auth/actions';
import styles from './pricing.module.css';

interface Plan {
  id: string;
  name: string;
  priceIdr: number;
  tagline: string;
  features: string[];
  highlighted?: boolean;
}

function fmtIdr(n: number): string {
  if (n === 0) return 'Gratis';
  return `Rp ${n.toLocaleString('id-ID')}`;
}

function PricingContent() {
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [status, setStatus] = useState('');
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const devSimulate = process.env.NEXT_PUBLIC_DEV_PAYMENT_SIM === 'true';
  const devAuthSim = process.env.NEXT_PUBLIC_DEV_AUTH_SIM === 'true';

  const resolveUser = useCallback(async () => {
    const user = await getClientAuthUser();
    setAuthUser(user);
  }, []);

  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment === 'cancelled') {
      setStatus('Pembayaran dibatalkan. Anda bisa pilih paket lagi atau coba Subscribe.');
    }
  }, [searchParams]);

  useEffect(() => {
    fetch('/api/plans')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || r.statusText);
        return d;
      })
      .then((d) => {
        const list = d.plans || [];
        if (!list.length) throw new Error('empty');
        setPlans(list);
      })
      .catch(() =>
        setStatus(
          'Gagal memuat paket. Terminal 1: npm run server (port 4000). Terminal 2: cd web && npm run dev.',
        ),
      );

    resolveUser().finally(() => setAuthReady(true));
  }, [resolveUser]);

  const effectiveUserId = authUser?.id || (devSimulate ? 'dev-user' : null);

  const simulatePay = async (planId: string) => {
    if (!effectiveUserId) {
      setStatus('Masuk dulu lewat /login (atau tombol Dev Login).');
      return;
    }
    setBusyPlanId(planId);
    setStatus('Simulasi pembayaran (dev)...');
    try {
      const res = await fetch('/api/payment/dev-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: effectiveUserId, planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || res.statusText;
        setStatus(
          msg.includes('tidak ditemukan')
            ? 'API belum update. Hentikan lalu jalankan ulang: npm run server (harus ada POST /api/payment/dev-simulate di log).'
            : `Error: ${msg}`,
        );
        setBusyPlanId(null);
        return;
      }
      if (data.orderId) sessionStorage.setItem('aegis_pending_order', data.orderId);
      window.location.assign(
        data.successUrl || `/success?order_id=${encodeURIComponent(data.orderId)}`,
      );
    } catch (e: unknown) {
      setStatus(`Network error: ${e instanceof Error ? e.message : String(e)}`);
      setBusyPlanId(null);
    }
  };

  const subscribe = async (planId: string) => {
    if (!effectiveUserId) {
      setStatus('Masuk dulu lewat /login.');
      return;
    }
    setBusyPlanId(planId);
    setStatus('Membuat transaksi...');
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: effectiveUserId, planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(`Error: ${data.error || 'unknown'}`);
        setBusyPlanId(null);
        return;
      }
      setStatus('Membuka Midtrans… batalkan/gagal akan kembali ke halaman ini.');
      if (data.orderId) sessionStorage.setItem('aegis_pending_order', data.orderId);
      window.location.assign(data.redirectUrl);
    } catch (e: unknown) {
      setStatus(`Network error: ${e instanceof Error ? e.message : String(e)}`);
      setBusyPlanId(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            color: 'rgba(255,255,255,0.3)',
            fontSize: 12,
            fontWeight: 600,
            textDecoration: 'none',
            padding: '6px 12px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.05)',
            marginBottom: 40,
            position: 'relative',
            zIndex: 3,
          }}
        >
          ← Beranda
        </Link>

        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ fontSize: 40, fontWeight: 800, color: 'white', marginBottom: 8 }}>
            Pilih paket Aegis
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)' }}>
            License CLI — aktivasi via Midtrans sandbox.
          </p>
          {authReady && authUser && (
            <p style={{ fontSize: 12, color: 'rgba(34,197,94,0.8)', marginTop: 10 }}>
              Masuk sebagai: <code style={{ color: '#86efac' }}>{authUser.email || authUser.id}</code>
              {authUser.source === 'dev' && ' (dev)'}
              {' · '}
              <button
                type="button"
                onClick={() => signOut()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fca5a5',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: 12,
                }}
              >
                Keluar
              </button>
            </p>
          )}
          {authReady && !effectiveUserId && (
            <p style={{ fontSize: 13, color: '#fbbf24', marginTop: 12 }}>
              <Link href="/login?next=/pricing" style={{ color: '#fca5a5' }}>
                Masuk
              </Link>{' '}
              untuk subscribe berbayar.
              {devAuthSim && (
                <>
                  {' '}
                  atau{' '}
                  <Link href="/login?next=/pricing" style={{ color: '#fde68a' }}>
                    Dev Login
                  </Link>
                </>
              )}
            </p>
          )}
        </div>

        <div className={styles.grid}>
          {plans.map((plan) => {
            const isFree = plan.priceIdr === 0;
            const busy = busyPlanId === plan.id;
            return (
              <div
                key={plan.id}
                className={`${styles.card} ${plan.highlighted ? styles.cardHighlight : ''}`}
              >
                <div style={{ fontSize: 24, fontWeight: 700, color: 'white', marginBottom: 4 }}>
                  {plan.name}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 24 }}>
                  {plan.tagline}
                </div>
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 800,
                    color: isFree ? '#22c55e' : 'white',
                    marginBottom: 24,
                  }}
                >
                  {fmtIdr(plan.priceIdr)}
                  {!isFree && (
                    <span style={{ fontSize: 14, fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>
                      {' '}
                      / bulan
                    </span>
                  )}
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', flex: 1 }}>
                  {plan.features.map((f, i) => (
                    <li
                      key={i}
                      style={{
                        display: 'flex',
                        gap: 10,
                        fontSize: 14,
                        color: 'rgba(255,255,255,0.65)',
                        padding: '6px 0',
                      }}
                    >
                      <span style={{ color: '#ef4444' }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {isFree ? (
                  <button
                    type="button"
                    className={styles.btnFree}
                    onClick={() =>
                      setStatus('Paket gratis: jalankan npx aegis-security@latest init di terminal.')
                    }
                  >
                    Pakai Gratis (CLI)
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className={styles.btnPrimary}
                      disabled={!!busyPlanId}
                      onClick={() => subscribe(plan.id)}
                    >
                      {busy ? 'Memproses...' : 'Subscribe'}
                    </button>
                    {devSimulate && (
                      <button
                        type="button"
                        className={styles.btnDev}
                        disabled={!!busyPlanId}
                        onClick={() => simulatePay(plan.id)}
                      >
                        {busy ? 'Memproses...' : 'Simulasi bayar (dev, tanpa Midtrans)'}
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
        {status && (
          <p
            style={{
              marginTop: 32,
              textAlign: 'center',
              fontSize: 14,
              color: status.includes('Error') || status.includes('Gagal') ? '#f87171' : 'rgba(255,255,255,0.5)',
            }}
          >
            {status}
          </p>
        )}
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className={styles.page} />}>
      <PricingContent />
    </Suspense>
  );
}
