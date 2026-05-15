'use client'
import { useState, useEffect } from 'react'
import styles from './reports.module.css'
import { getReports } from '@/app/actions/projects'

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadReports() {
      setLoading(true)
      const data = await getReports()
      setReports(data)
      setLoading(false)
    }
    loadReports()
  }, [])

  return (
    <div className={styles.content}>
      <header className={styles.header}>
        <h1 className={styles.title}>Security Reports</h1>
        <p className={styles.subtitle}>Access and export comprehensive security analysis reports for all your projects.</p>
      </header>

      <div className={styles.tableCard}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>Loading reports...</div>
        ) : reports.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#3f3f46' }}>
            No security reports available yet. Run a scan to generate your first report.
          </div>
        ) : (
          <div className={styles.table}>
            <div className={styles.tHead}>
              <span>Report ID</span>
              <span>Project</span>
              <span>Date</span>
              <span>Score</span>
              <span>Status</span>
              <span>Action</span>
            </div>
            {reports.map((r, i) => (
              <div key={r.id} className={styles.tRow}>
                <span className={styles.rId}>R-{new Date(r.created_at).getFullYear()}-{i + 101}</span>
                <span className={styles.rProject}>{r.projects?.name}</span>
                <span className={styles.rDate}>{new Date(r.created_at).toLocaleDateString()}</span>
                <span className={styles.rType} style={{ fontWeight: 800, color: r.score > 80 ? '#22c55e' : '#f59e0b' }}>
                  {r.score}% Secure
                </span>
                <span className={styles.rStatus} data-status={r.status}>{r.status}</span>
                <button className={styles.downloadBtn}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                  </svg>
                  PDF
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
