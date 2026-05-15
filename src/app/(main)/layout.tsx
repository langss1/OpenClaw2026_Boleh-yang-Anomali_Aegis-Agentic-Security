'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import styles from './dashboard.module.css'
import { createClient } from '@/utils/supabase/client'
import { signOut } from '../auth/actions'
import { getGitHubRepos } from '../auth/github/actions'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [repos, setRepos] = useState<any[]>([])
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [scanStep, setScanStep] = useState<'options' | 'repos'>('options')
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    // Skip if Supabase not configured
    if (!supabase) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [])

  const handleFetchRepos = async () => {
    setLoadingRepos(true)
    setScanStep('repos')
    const { repos, error } = await getGitHubRepos()
    if (error) {
      alert(error)
      setScanStep('options')
    } else {
      setRepos(repos)
    }
    setLoadingRepos(false)
  }

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: '📊' },
    { name: 'Projects', href: '/projects', icon: '📁' },
    { name: 'Reports', href: '/reports', icon: '📜' },
  ]

  const securityPhases = [
    { name: 'Ingestion', href: '/phases/phase0', phase: '0' },
    { name: 'SAST & Heal', href: '/phases/phase1', phase: '1' },
    { name: 'Monitor', href: '/phases/phase3', phase: '2' },
  ]

  return (
    <div className={styles.appContainer}>
      {/* Sidebar */}
      <aside className={`${styles.sideNav} ${isCollapsed ? styles.collapsed : ''}`}>
        <div className={styles.navHeader}>
          <div 
            className={styles.brand} 
            onClick={() => isCollapsed && setIsCollapsed(false)}
            style={{ cursor: isCollapsed ? 'pointer' : 'default' }}
          >
            <div className={styles.brandIcon}>A</div>
            {!isCollapsed && <span>AEGIS</span>}
          </div>
          
          {!isCollapsed && (
            <button 
              className={styles.menuToggle} 
              onClick={() => setIsCollapsed(true)}
              aria-label="Collapse Menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
          )}
        </div>

        <div className={styles.navSections}>
          <div className={styles.navSection}>
            {!isCollapsed && <label>Platform</label>}
            {navItems.map(item => (
              <Link 
                key={item.href} 
                href={item.href} 
                className={pathname === item.href ? styles.activeNavItem : styles.navLink}
                title={isCollapsed ? item.name : ''}
              >
                <span className={styles.icon}>{item.icon}</span>
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            ))}
          </div>

          <div className={styles.navSection}>
            {!isCollapsed && <label>Security Pipeline</label>}
            <div className={styles.pipelineItems}>
              {securityPhases.map(item => (
                <Link 
                  key={item.href} 
                  href={item.href} 
                  className={pathname === item.href ? styles.activeNavItem : styles.navLink}
                  title={isCollapsed ? item.name : ''}
                >
                  <span className={styles.phaseTag}>P{item.phase}</span>
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.navFooter}>
          <div className={styles.userBrief}>
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} className={styles.userAvatar} alt="Avatar" />
            ) : (
              <div className={styles.userAvatar}>{user?.email?.[0].toUpperCase() || 'A'}</div>
            )}
            {!isCollapsed && (
              <div className={styles.userMeta}>
                <strong>{user?.user_metadata?.full_name || 'Aegis User'}</strong>
                <span>{user?.email}</span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button className={styles.logoutBtn} onClick={() => signOut()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
              Logout
            </button>
          )}
        </div>
      </aside>

      {/* Main Area */}
      <div className={`${styles.viewContainer} ${isCollapsed ? styles.expanded : ''}`}>
        {/* Top Header */}
        <header className={styles.topBar}>
          <div className={styles.searchBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.5 }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <input type="text" placeholder="Search security runs..." />
            <span className={styles.searchKey}>⌘K</span>
          </div>
          <div className={styles.topActions}>
            <div className={styles.notificationBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
              </svg>
              <span className={styles.badge} />
            </div>
            <Link href="/phases/phase0" className={styles.newScanBtn}>
              + New Scan
            </Link>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>

      {/* New Scan Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => { setShowModal(false); setScanStep('options'); }}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.closeModal} onClick={() => { setShowModal(false); setScanStep('options'); }}>✕</button>
            
            <div className={styles.modalHeader}>
              <h2>{scanStep === 'options' ? 'Initialize New Scan' : 'Select Repository'}</h2>
              <p>{scanStep === 'options' ? 'Select your target source to start AEGIS autonomous analysis.' : 'Choose a project from your GitHub to begin scanning.'}</p>
            </div>

            <div className={styles.modalActions}>
              {scanStep === 'options' ? (
                <>
                  <div className={styles.scanOption} onClick={handleFetchRepos}>
                    <div className={styles.optionIcon}>📦</div>
                    <h4>GitHub Repository</h4>
                    <p>Connect your private or public repository for full SAST analysis.</p>
                  </div>

                  <div className={styles.scanOption} onClick={() => setShowModal(false)}>
                    <div className={styles.optionIcon}>🌐</div>
                    <h4>Public Website</h4>
                    <p>Scan a live production URL for DAST and surface vulnerabilities.</p>
                  </div>
                </>
              ) : (
                <div className={styles.importWrapper}>
                  <div className={styles.repoHeader}>
                    <div className={styles.userSelector}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                      </svg>
                      <span>{user?.user_metadata?.user_name || 'langss1'}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{marginLeft: 'auto', opacity: 0.5}}><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                    <div className={styles.searchBar}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{opacity: 0.3}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                      <input type="text" placeholder="Search..." />
                    </div>
                  </div>

                  <div className={styles.repoList}>
                    {loadingRepos ? (
                      <div className={styles.loadingBox}>
                        <div className={styles.spinner} />
                        <span>Fetching repositories...</span>
                      </div>
                    ) : (
                      repos.map(repo => (
                        <div key={repo.id} className={styles.repoItem}>
                          <div className={styles.repoLeft}>
                            <div className={styles.repoIcon}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L3 7v10l9 5 9-5V7L12 2z"/></svg>
                            </div>
                            <div className={styles.repoDetails}>
                              <strong>{repo.name} {repo.private && <span className={styles.privateTag}>🔒</span>}</strong>
                              <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <button className={styles.importBtn} onClick={() => setShowModal(false)}>
                            Import
                          </button>
                        </div>
                      ))
                    )}
                    {!loadingRepos && repos.length === 0 && (
                      <p className={styles.noRepos}>No repositories found.</p>
                    )}
                  </div>
                  <button className={styles.backToOptions} onClick={() => setScanStep('options')}>
                    ← Back to options
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
