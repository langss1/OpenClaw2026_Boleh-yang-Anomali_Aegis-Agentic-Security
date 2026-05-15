'use client'
export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import styles from '../login/login.module.css'
import ParticleField from '@/components/ParticleField'
import { signup } from '../auth/actions'

export default function RegisterPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

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

      <div className={styles.loginHeader}>
        <h1 className={styles.mainTitle}>Create Account</h1>
        <p className={styles.mainSubtitle}>Join the next generation of autonomous security</p>
      </div>

      <div className={styles.authWrapper}>
        <div className={styles.authCard}>
          {error && <div className={styles.errorMessage}>{error}</div>}

          <form action={signup} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="name">Full Name</label>
              <input 
                name="name" 
                id="name" 
                type="text" 
                placeholder="John Doe" 
                required 
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="email">Email Address</label>
              <input 
                name="email" 
                id="email" 
                type="email" 
                placeholder="name@company.com" 
                required 
              />
            </div>
            
            <div className={styles.inputGroup}>
              <label htmlFor="password">Password</label>
              <input 
                name="password" 
                id="password" 
                type="password" 
                placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" 
                required 
              />
            </div>

            <button type="submit" className={styles.submitBtn}>
              Create Account
            </button>
          </form>

          <p className={styles.footerText}>
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
