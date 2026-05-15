'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './findings.module.css'

export default function ReviewFindingsPage() {
  const [patched, setPatched] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handlePatch = (id: string) => {
    setPatched(prev => [...prev, id])
  }

  const handleContinue = () => {
    setLoading(true)
    setTimeout(() => {
      router.push('/phases/phase2')
    }, 1500)
  }

  const vulnerabilities = [
    {
      id: 'v1',
      file: 'db.py',
      line: 45,
      issue: 'SQL Injection via unsanitized user input in query string.',
      severity: 'Critical',
      oldCode: 'cursor.execute("SELECT * FROM users WHERE id = " + user_id)',
      newCode: 'cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))'
    },
    {
      id: 'v2',
      file: 'auth.py',
      line: 12,
      issue: 'MD5 used for password hashing. Transition to Argon2 recommended.',
      severity: 'High',
      oldCode: 'hash = hashlib.md5(password.encode()).hexdigest()',
      newCode: 'hash = argon2.PasswordHasher().hash(password)'
    }
  ]

  return (
    <div className={styles.content}>
      <header className={styles.header}>
        <div className={styles.badge}>Human in the loop</div>
        <h1 className={styles.title}>Review Findings & AI Patches</h1>
        <p className={styles.subtitle}>Review the vulnerabilities detected by SAST and apply suggested AI auto-healing patches.</p>
      </header>

      <div className={styles.findingList}>
        {vulnerabilities.map((v) => (
          <div key={v.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.vInfo}>
                <span className={styles.severityTag} data-severity={v.severity}>{v.severity}</span>
                <span className={styles.vLocation}>{v.file}:{v.line}</span>
              </div>
              <div className={styles.vIssue}>{v.issue}</div>
            </div>

            <div className={styles.diffContainer}>
              <div className={styles.diffHeader}>AI Suggested Patch</div>
              <div className={styles.diffBody}>
                <div className={styles.diffLineOld}>- {v.oldCode}</div>
                <div className={styles.diffLineNew}>+ {v.newCode}</div>
              </div>
            </div>

            <div className={styles.cardActions}>
              {patched.includes(v.id) ? (
                <span className={styles.patchApplied}>✓ Patch Applied</span>
              ) : (
                <button className={styles.patchBtn} onClick={() => handlePatch(v.id)}>Apply AI Patch</button>
              )}
              <button className={styles.ignoreBtn}>Ignore</button>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <button 
          className={styles.continueBtn} 
          onClick={handleContinue} 
          disabled={loading || patched.length < vulnerabilities.length}
        >
          {loading ? 'Moving to Phase 2...' : 'Continue to Phase 2: Active Pentest'}
        </button>
        {patched.length < vulnerabilities.length && (
          <p className={styles.footerHint}>Please review and apply all critical patches before proceeding.</p>
        )}
      </div>
    </div>
  )
}
