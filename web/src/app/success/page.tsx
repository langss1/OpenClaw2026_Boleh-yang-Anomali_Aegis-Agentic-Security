'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const PENDING_ORDER_KEY = 'aegis_pending_order';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderIdFromUrl =
    searchParams.get('order_id') ||
    searchParams.get('orderId') ||
    searchParams.get('order');
  const [orderId, setOrderId] = useState<string | null>(orderIdFromUrl);

  useEffect(() => {
    const stored = sessionStorage.getItem(PENDING_ORDER_KEY);
    const urlOk = orderIdFromUrl?.startsWith('AEG-');
    if (urlOk) {
      setOrderId(orderIdFromUrl);
      return;
    }
    if (stored?.startsWith('AEG-')) {
      setOrderId(stored);
      return;
    }
    if (orderIdFromUrl) setOrderId(orderIdFromUrl);
  }, [orderIdFromUrl]);
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [planName, setPlanName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    fetch(`/api/order/${encodeURIComponent(orderId)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok && data.error) throw new Error(data.error);
        return data;
      })
      .then((data) => {
        setPaid(!!data.paid);
        if (data.subscription?.licenseKey) setLicenseKey(data.subscription.licenseKey);
        if (data.subscription?.planName) setPlanName(data.subscription.planName);
        if (data.error) setError(data.error);
        if (data.paid) sessionStorage.removeItem(PENDING_ORDER_KEY);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [orderId]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#030000',
        padding: 40,
        fontFamily: 'var(--font-poppins), sans-serif',
        color: '#fff',
        maxWidth: 560,
        margin: '0 auto',
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Pembayaran</h1>
      {!orderId && (
        <p style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
          Halaman ini dipakai setelah bayar di Midtrans. Buka dari{' '}
          <Link href="/pricing" style={{ color: '#fca5a5' }}>
            /pricing
          </Link>
          , pilih paket, selesaikan pembayaran — Midtrans akan mengarahkan ke sini dengan{' '}
          <code style={{ color: '#f87171' }}>?order_id=...</code> di URL.
        </p>
      )}
      {loading && <p style={{ color: 'rgba(255,255,255,0.5)' }}>Memverifikasi pembayaran...</p>}
      {!loading && paid && (
        <>
          <p style={{ color: '#22c55e', fontWeight: 600, marginBottom: 16 }}>Pembayaran berhasil</p>
          {planName && <p style={{ marginBottom: 8 }}>Paket: {planName}</p>}
          {licenseKey && (
            <div
              style={{
                background: '#111',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <p style={{ fontSize: 11, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
                License key (CLI)
              </p>
              <code style={{ fontSize: 16, color: '#f87171', wordBreak: 'break-all' }}>{licenseKey}</code>
            </div>
          )}
        </>
      )}
      {!loading && !paid && orderId && (
        <p style={{ color: '#fbbf24', lineHeight: 1.6 }}>
          {error ||
            'Transaksi belum selesai. Selesaikan pembayaran di Midtrans lalu refresh halaman ini.'}
          {orderId && !orderId.startsWith('AEG-') && (
            <>
              {' '}
              <span style={{ display: 'block', marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                URL Anda memakai order_id yang salah ({orderId}). Order asli bentuknya seperti{' '}
                <code style={{ color: '#f87171' }}>AEG-PRO-...</code> — ulangi dari /pricing.
              </span>
            </>
          )}
        </p>
      )}
      <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
        <Link
          href="/pricing"
          style={{
            padding: '10px 18px',
            background: '#ef4444',
            borderRadius: 10,
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          Ke Langganan
        </Link>
        <Link
          href="/"
          style={{
            padding: '10px 18px',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            color: 'rgba(255,255,255,0.6)',
            textDecoration: 'none',
          }}
        >
          Beranda
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', background: '#030000', color: '#fff', padding: 40 }}>
          Loading...
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
