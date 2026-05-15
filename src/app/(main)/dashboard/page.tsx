'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import styles from '../dashboard.module.css'
import { getDashboardStats, getRecentRuns } from '@/app/actions/projects'

export default function DashboardPage() {
  const [dbStats, setDbStats] = useState<any>(null)
  const [recentRuns, setRecentRuns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const stats = await getDashboardStats()
      const runs = await getRecentRuns()
      setDbStats(stats)
      setRecentRuns(runs)
      setLoading(false)
    }
    loadData()
  }, [])

  const statsDisplay = [
    { 
      label: 'Overall Risk Score', 
      value: dbStats ? `${dbStats.avgScore}/100` : '--/100', 
      desc: dbStats?.avgScore > 80 ? 'Posture: Strong' : 'Posture: Moderate', 
      color: 'textGreen' 
    },
    { 
      label: 'Active Projects', 
      value: dbStats?.projectCount.toString() || '0', 
      desc: 'Live infrastructure', 
      color: 'textGreen' 
    },
    { 
      label: 'Critical Vulnerabilities', 
      value: dbStats?.vulnerableCount.toString() || '0', 
      desc: 'Action required', 
      color: dbStats?.vulnerableCount > 0 ? 'textRed' : 'textGreen' 
    },
  ]

  return (
    <div className={styles.content}>
      <div className={styles.pageHeader}>
        <h1>Dashboard Overview</h1>
        <p>Monitor your security pipeline and autonomous agent health.</p>
      </div>

      <div className={styles.statsRow}>
        {statsDisplay.map((stat, idx) => (
          <div key={idx} className={styles.card}>
            <div className={styles.cardLabel}>
              {stat.label}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.5 }}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>
              </svg>
            </div>
            <div className={styles.cardValue}>{stat.value}</div>
            <div className={`${styles.cardDesc} ${styles[stat.color]}`}>
              {stat.desc}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.tableCard}>
        <div className={styles.cardHeader}>
          <h3>Recent Security Runs</h3>
          <button className={styles.viewAllBtn}>View All</button>
        </div>
        
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>Syncing logs...</div>
        ) : recentRuns.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#3f3f46' }}>No recent activity detected.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Status</th>
                <th>Security Score</th>
                <th>Last Scanned</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((run, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 700, color: '#fff' }}>{run.projects?.name}</td>
                  <td>
                    <span className={`${styles.statusPill} ${run.status === 'Healthy' ? styles.pillGreen : styles.pillRed}`}>
                      {run.status}
                    </span>
                  </td>
                  <td>
                    <div className={styles.scoreTrack}>
                      <div className={`${styles.scoreBar} ${run.score > 80 ? styles.scoreGreen : styles.scoreAmber}`} style={{ width: `${run.score}%` }} />
                    </div>
                    <span style={{ fontWeight: 800, color: '#fff', fontSize: '14px' }}>{run.score}</span>
                  </td>
                  <td style={{ color: '#3f3f46' }}>{new Date(run.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
