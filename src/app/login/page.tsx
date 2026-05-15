'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import styles from './login.module.css'
import ParticleField from '@/components/ParticleField'
import { login, signInWithGitHub } from '../auth/actions'

export default function LoginPage() {
  const [view, setView] = useState<'choice' | 'login'>('choice')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const message = searchParams.get('message')

  const handleGitHubLogin = async () => {
    setLoading(true)
    await signInWithGitHub()
  }

  const copyCommand = () => {
    navigator.clipboard.writeText('npx aegis-security@latest init')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={styles.container}>
      <div className={styles.particles}>
        <ParticleField />
      </div>

      <div className={styles.glow} />

      <Link href="/" className={styles.backBtn}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back to Home
      </Link>

      {view === 'choice' ? (
        <>
          <div className={styles.loginHeader}>
            <h1 className={styles.mainTitle}>Choose your preference:</h1>
            <p className={styles.mainSubtitle}>Select how you want to experience AEGIS security</p>
          </div>

          <div className={styles.dualWrapper}>
            {/* Choice 1: Web Version */}
            <div className={styles.card}>
              <div className={styles.header}>
                <div className={styles.logoWrap}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" stroke="#ef4444" strokeWidth="2" fill="rgba(239, 68, 68, 0.2)"/>
                    <path d="M12 22V12M12 12l9-5M12 12L3 7" stroke="white" strokeWidth="1" strokeOpacity="0.5"/>
                  </svg>
                </div>
                <h2 className={styles.cardTitle}>Web Dashboard</h2>
                <p className={styles.cardSubtitle}>Centralized security for your team</p>
              </div>

              <div className={styles.messageBox}>
                <p>For easy access, just up your repo, GitHub repository, or your public URL for instant automated scanning and monitoring.</p>
              </div>

              <div className={styles.actions}>
                <button className={styles.enterBtn} onClick={() => setView('login')}>
                  Access Web Dashboard
                </button>
              </div>
            </div>

            {/* Choice 2: CLI Version */}
            <div className={styles.card}>
              <div className={styles.header}>
                <div className={styles.logoWrap}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                    <path d="M4 17l6-6-6-6M12 19h8" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2 className={styles.cardTitle}>CLI Local Agent</h2>
                <p className={styles.cardSubtitle}>Privacy-first local processing</p>
              </div>

              <div className={styles.messageBox}>
                <p>For you who prioritize security and data, your process is local in your computer device and personalized.</p>
                <p className={styles.smallMsg}>— USE IN IDE OR ANTIGRAVITY COMMAND</p>
              </div>

              <div className={styles.commandCard}>
                <div className={styles.cmdHeader}>
                  <span>Command Prompt</span>
                  <button onClick={copyCommand} className={styles.copyBtn}>
                    {copied ? '✓ Copied' : 'Copy Command'}
                  </button>
                </div>
                <div className={styles.cmdBody}>
                  <span className={styles.prompt}>&gt;</span>
                  <span className={styles.command}>npx aegis-security@latest init</span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className={styles.loginHeader}>
            <h1 className={styles.mainTitle}>Secure Access</h1>
            <p className={styles.mainSubtitle}>Sign in to your AEGIS security vault</p>
          </div>

          <div className={styles.authWrapper}>
            <div className={styles.authCard}>
              <button className={styles.backToChoice} onClick={() => setView('choice')}>
                ← Back to choices
              </button>
              
              {error && <div className={styles.errorMessage}>{error}</div>}
              {message && <div className={styles.successMessage}>{message}</div>}

              <form action={login} className={styles.form}>
                <div className={styles.inputGroup}>
                  <label htmlFor="email">Email Address</label>
                  <input name="email" id="email" type="email" placeholder="name@company.com" required />
                </div>
                
                <div className={styles.inputGroup}>
                  <label htmlFor="password">Password</label>
                  <input name="password" id="password" type="password" placeholder="••••••••" required />
                </div>

                <button type="submit" className={styles.submitBtn}>Sign In</button>
              </form>

              <div className={styles.divider}><span>OR</span></div>

              <button className={styles.githubBtn} onClick={handleGitHubLogin} disabled={loading}>
                {loading ? <div className={styles.spinner} /> : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                    </svg>
                    Continue with GitHub
                  </>
                )}
              </button>

              <p className={styles.footerText}>
                Don't have an account? <Link href="/register">Create one</Link>
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
