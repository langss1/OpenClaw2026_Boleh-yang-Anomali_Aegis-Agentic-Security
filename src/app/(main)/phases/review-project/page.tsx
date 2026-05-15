'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './review.module.css'

export default function ReviewProjectPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleConfirm = () => {
    setLoading(true)
    setTimeout(() => {
      router.push('/phases/phase1')
    }, 1500)
  }

  return (
    <div className={styles.content}>
      <header className={styles.header}>
        <div className={styles.badge}>Human in the loop</div>
        <h1 className={styles.title}>Review Ingested Project</h1>
        <p className={styles.subtitle}>Verify the detected language and project structure before starting security analysis.</p>
      </header>

      <div className={styles.mainGrid}>
        <div className={styles.left}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3>Project Structure</h3>
              <span className={styles.statusOk}>Detected</span>
            </div>
            <div className={styles.fileTree}>
              <div className={styles.treeItem}>📁 src/</div>
              <div className={styles.treeItem}>&nbsp;&nbsp;📁 api/</div>
              <div className={styles.treeItem}>&nbsp;&nbsp;📁 models/</div>
              <div className={styles.treeItem}>&nbsp;&nbsp;📄 main.py</div>
              <div className={styles.treeItem}>📄 requirements.txt</div>
              <div className={styles.treeItem}>📄 config.json</div>
            </div>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.card}>
            <h3>Analysis Configuration</h3>
            <div className={styles.metaRow}>
              <span>Primary Language</span>
              <span className={styles.val}>Python 3.10</span>
            </div>
            <div className={styles.metaRow}>
              <span>Estimated Files</span>
              <span className={styles.val}>124 files</span>
            </div>
            <div className={styles.metaRow}>
              <span>Dependencies</span>
              <span className={styles.val}>18 detected</span>
            </div>
            
            <div className={styles.actionBox}>
              <p>Everything looks correct? Proceed to Static Analysis (Phase 1).</p>
              <button className={styles.confirmBtn} onClick={handleConfirm} disabled={loading}>
                {loading ? 'Starting Phase 1...' : 'Confirm & Start SAST'}
              </button>
              <button className={styles.editBtn}>Re-configure Ingestion</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
