'use client';

export const dynamic = 'force-dynamic';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import styles from './login.module.css';
import ParticleField from '@/components/ParticleField';
import { login } from '../auth/actions';

function LoginForm() {
  const [copied, setCopied] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const message = searchParams.get('message');
  const next = searchParams.get('next') || '/pricing';

  const copyCommand = () => {
    navigator.clipboard.writeText('npx aegis-security@latest init');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.container}>
      <div className={styles.particles}>
        <ParticleField />
      </div>
      <div className={styles.glow} />

      <Link href="/" className={styles.backBtn}>
        Beranda
      </Link>

      <div className={styles.loginHeader}>
        <h1 className={styles.mainTitle}>Masuk</h1>
        <p className={styles.mainSubtitle}>
          Untuk berlangganan dan license key CLI. Pemindaian kode tetap di terminal lokal.
        </p>
      </div>

      <div className={styles.authWrapper}>
        <div className={styles.authCard}>
          {error && <div className={styles.errorMessage}>{error}</div>}
          {message && <div className={styles.successMessage}>{message}</div>}

          <form action={login} className={styles.form}>
            <input type="hidden" name="next" value={next} />
            <div className={styles.inputGroup}>
              <label htmlFor="email">Email</label>
              <input name="email" id="email" type="email" placeholder="name@company.com" required />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="password">Password</label>
              <input name="password" id="password" type="password" placeholder="••••••••" required />
            </div>
            <button type="submit" className={styles.submitBtn}>
              Masuk
            </button>
          </form>

          <p className={styles.footerText}>
            Belum punya akun? <Link href="/register">Daftar</Link>
          </p>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>CLI lokal</h2>
          <p className={styles.cardSubtitle}>Tanpa dashboard — langsung di terminal</p>
          <div className={styles.commandCard}>
            <div className={styles.cmdHeader}>
              <span>Install</span>
              <button type="button" onClick={copyCommand} className={styles.copyBtn}>
                {copied ? 'Tersalin' : 'Salin'}
              </button>
            </div>
            <div className={styles.cmdBody}>
              <span className={styles.prompt}>&gt;</span>
              <span className={styles.command}>npx aegis-security@latest init</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className={styles.container} />}>
      <LoginForm />
    </Suspense>
  );
}

