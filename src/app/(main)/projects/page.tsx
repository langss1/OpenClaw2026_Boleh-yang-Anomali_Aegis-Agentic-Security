'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './projects.module.css'
import { getProjects, deleteProject } from '@/app/actions/projects'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    setLoading(true)
    const data = await getProjects()
    setProjects(data)
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this project?')) {
      await deleteProject(id)
      loadProjects()
    }
  }

  return (
    <div className={styles.content}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>All Projects</h1>
          <p className={styles.subtitle}>Manage and monitor your security posture across all environments.</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.filterGroup}>
            <button className={styles.filterBtn} data-active="true">All</button>
            <button className={styles.filterBtn}>Vulnerable</button>
            <button className={styles.filterBtn}>Healthy</button>
          </div>
        </div>
      </header>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>Loading projects...</div>
      ) : projects.length === 0 ? (
        <div style={{ padding: '80px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>📁</div>
          <h3 style={{ color: '#fff', marginBottom: '8px' }}>No Projects Yet</h3>
          <p style={{ color: '#71717a', marginBottom: '24px' }}>Start by importing a repository from GitHub.</p>
          <Link href="/phases/phase0" className={styles.addBtn} style={{ display: 'inline-flex' }}>Import Repository</Link>
        </div>
      ) : (
        <div className={styles.projectGrid}>
          {projects.map((p, i) => (
            <div 
              key={p.id} 
              className={styles.projectCard} 
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className={styles.cardGlow} data-status={p.status} />
              
              <div className={styles.pHeader}>
                <div className={styles.pBrand}>
                  <div className={styles.pIcon}>{p.language ? p.language[0] : 'A'}</div>
                  <div className={styles.pTitleInfo}>
                    <h3 className={styles.pName}>{p.name}</h3>
                    <div className={styles.pMeta}>
                      <span className={styles.pLang}>{p.language || 'Unknown'}</span>
                      <span className={styles.pDot} />
                      <span className={styles.pTime}>
                        {p.last_scan ? `Last scan: ${new Date(p.last_scan).toLocaleDateString()}` : 'Never scanned'}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div className={`${styles.statusIndicator} ${styles[p.status.toLowerCase()]}`}>
                    <div className={styles.statusDot} />
                    {p.status}
                  </div>
                  <button 
                    onClick={() => handleDelete(p.id)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', opacity: 0.5 }}
                    title="Delete Project"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className={styles.pBody}>
                <div className={styles.mainScore}>
                  <div className={styles.scoreCircle}>
                    <svg viewBox="0 0 36 36" className={styles.circularChart}>
                      <path className={styles.circleBg} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path 
                        className={styles.circle} 
                        style={{ strokeDasharray: `${p.score}, 100` }}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                      />
                    </svg>
                    <div className={styles.scoreText}>
                      <span className={styles.scoreVal}>{p.score}</span>
                      <span className={styles.scorePerc}>%</span>
                    </div>
                  </div>
                  <div className={styles.scoreLabel}>Security Score</div>
                </div>

                <div className={styles.quickStats}>
                  <div className={styles.qStat}>
                    <span className={styles.qsLabel}>Runs</span>
                    <span className={styles.qsVal}>0</span>
                  </div>
                  <div className={styles.qStat}>
                    <span className={styles.qsLabel}>Threats</span>
                    <span className={styles.qsVal}>0</span>
                  </div>
                  <div className={styles.qStat}>
                    <span className={styles.qsLabel}>Vulns</span>
                    <span className={styles.qsVal}>0</span>
                  </div>
                </div>
              </div>

              <div className={styles.pActions}>
                <Link href="/phases/phase3" className={styles.viewBtn}>
                  <span>Enter Terminal View</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
