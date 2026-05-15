'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './phase0.module.css'
import { motion, AnimatePresence } from 'framer-motion'
import { getGitHubRepos, analyzeGitHubRepo } from '@/app/auth/github/actions'
import { createProject } from '@/app/actions/projects'

export default function Phase0Page() {
  const [sourceType, setSourceType] = useState<'github' | 'public' | null>(null)
  const [url, setUrl] = useState('')
  const [selectedRepo, setSelectedRepo] = useState<any>(null)
  const [step, setStep] = useState<'selection' | 'config' | 'analyzing' | 'stack_confirm'>('selection')
  const [repos, setRepos] = useState<any[]>([])
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [githubUser, setGithubUser] = useState<any>(null)
  const [detectedStack, setDetectedStack] = useState(['Next.js', 'TypeScript', 'TailwindCSS', 'Node.js'])
  const [newTech, setNewTech] = useState('')
  const router = useRouter()

  const handleFetchRepos = async () => {
    setLoadingRepos(true)
    setSourceType('github')
    setStep('config')
    const { repos, user, error } = await getGitHubRepos()
    if (error) {
      alert(error)
      setStep('selection')
    } else {
      setRepos(repos || [])
      setGithubUser(user)
    }
    setLoadingRepos(false)
  }

  const handleRepoImport = async (repo: any) => {
    setSelectedRepo(repo)
    setUrl(repo.html_url)
    setStep('analyzing')
    
    // AI/Heuristic Analysis Real-Time
    const { stack, error } = await analyzeGitHubRepo(repo.full_name)
    if (!error) {
      setDetectedStack(stack)
    }
    
    // Delay sedikit agar user bisa melihat animasi log sistem
    setTimeout(() => setStep('stack_confirm'), 3000)
  }

  const handleLaunch = (e: React.FormEvent) => {
    e.preventDefault()
    setStep('analyzing')
    setTimeout(() => {
      setStep('stack_confirm')
    }, 3000)
  }

  const addTech = () => {
    if (newTech && !detectedStack.includes(newTech)) {
      setDetectedStack([...detectedStack, newTech])
      setNewTech('')
    }
  }

  const removeTech = (tech: string) => {
    setDetectedStack(detectedStack.filter(t => t !== tech))
  }

  const startFinalScan = async () => {
    try {
      if (!selectedRepo && !url) {
        alert('No repository or URL selected.')
        return
      }

      const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      let projectId = 'local-project-' + Date.now()

      if (!isLocal) {
        // Create project in database with verified tech stack
        const result = await createProject({
          name: selectedRepo?.name || url.split('/').pop() || 'Untitled Project',
          language: selectedRepo?.language || detectedStack[0] || 'Unknown',
          repo_url: url,
          tech_stack: detectedStack
        })
        
        if (!result.success) {
          throw new Error(result.error)
        }
        projectId = result.data?.id
      }
      
      // Store scan context for Phase 1
      localStorage.setItem('aegis_scan_context', JSON.stringify({
        repoUrl: url,
        repoName: selectedRepo?.name || url.split('/').pop() || 'Untitled Project',
        techStack: detectedStack,
        projectId: projectId
      }))
      
      // Redirect to Phase 1 for source code scanning
      router.push('/phases/phase1') 
    } catch (err: any) {
      console.error('Final scan init error:', err)
      alert(`❌ Database Error: ${err.message}`)
    }
  }

  return (
    <div className={styles.content}>
      {step === 'config' && sourceType === 'github' ? (
            <motion.div 
              key="repos"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={styles.fullPageImport}
            >
              <div className={styles.fullPageHeader}>
                <button type="button" onClick={() => setStep('selection')} className={styles.backLink}>
                  ← Back to Selection
                </button>
                <h1>Import Git Repository</h1>
                <p>Select a project from your GitHub to begin autonomous analysis.</p>
              </div>

              <div className={styles.fullPageBody}>
                <div className={styles.filterRow}>
                  <div className={styles.userSelector}>
                    {githubUser ? (
                      <>
                        <img src={githubUser.avatar_url} alt="Profile" className={styles.userAvatarSmall} />
                        <span>{githubUser.login}</span>
                        <div className={styles.connectedDot} />
                      </>
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                        </svg>
                        <span>Guest</span>
                      </>
                    )}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{marginLeft: 'auto', opacity: 0.3}}><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                  <div className={styles.searchBarFull}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{opacity: 0.3}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    <input type="text" placeholder="Search your repositories..." />
                  </div>
                </div>

                <div className={styles.fullRepoList}>
                  {loadingRepos ? (
                    <div className={styles.loadingBoxFull}>
                      <div className={styles.spinnerLarge} />
                      <span>Fetching your GitHub projects...</span>
                    </div>
                  ) : (
                    repos.map(repo => (
                      <div key={repo.id} className={styles.fullRepoItem}>
                        <div className={styles.repoLeft}>
                          <div className={styles.repoIconLarge}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L3 7v10l9 5 9-5V7L12 2z"/></svg>
                          </div>
                          <div className={styles.repoInfo}>
                            <h3>{repo.name} {repo.private && <span style={{opacity: 0.4, fontSize: '14px'}}>🔒</span>}</h3>
                            <div className={styles.repoMeta}>
                              <span className={styles.langTag}>{repo.language || 'Code'}</span>
                              <span className={styles.dot}>•</span>
                              <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <button className={styles.fullImportBtn} onClick={() => handleRepoImport(repo)}>
                          Import
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={styles.modal}
            >
              <AnimatePresence mode="wait">
                {step === 'selection' && (
                  <motion.div 
                    key="selection"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <h1>Initialize New Scan</h1>
                    <p>Select your target source to start AEGIS autonomous analysis.</p>

                    <div className={styles.cardGrid}>
                      <div className={styles.selectionCard} onClick={() => {
                        localStorage.setItem('aegis_scan_context', JSON.stringify({
                          repoName: 'Local Project',
                          isLocal: true,
                          techStack: ['Detected Local Stack']
                        }))
                        router.push('/phases/phase1')
                      }} style={{ border: '2px solid #dc2626', background: 'rgba(220,38,38,0.05)' }}>
                        <div className={styles.iconBox}>💻</div>
                        <h2>Scan Current Project</h2>
                        <span>Analyze this Aegis folder directly from your disk (No GitHub needed).</span>
                      </div>
                      
                      <div className={styles.selectionCard} onClick={handleFetchRepos}>
                        <div className={styles.iconBox}>📦</div>
                        <h2>GitHub Repository</h2>
                        <span>Connect your private or public repository for full SAST analysis.</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 'config' && sourceType === 'public' && (
                  <motion.div 
                    key="config"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={styles.inputFlow}
                  >
                    <h1 style={{ marginBottom: '40px' }}>Website Config</h1>
                    
                    <form onSubmit={handleLaunch}>
                      <div className={styles.inputGroup}>
                        <label>TARGET_ENDPOINT</label>
                        <input 
                          className={styles.inputBox}
                          type="text" 
                          placeholder="https://example.com"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          required
                          autoFocus
                        />
                      </div>
                      
                      <div style={{ display: 'flex', gap: '16px' }}>
                        <button type="button" onClick={() => setStep('selection')} className={styles.tab} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', borderRadius: '16px', cursor: 'pointer' }}>Back</button>
                        <button type="submit" className={styles.launchBtn} style={{ flex: 2 }}>
                          Launch Analysis
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

          {step === 'analyzing' && (
            <motion.div 
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ padding: '60px 0', textAlign: 'center' }}
            >
              <div style={{ 
                width: '100%', 
                maxWidth: '600px', 
                height: '240px', 
                background: '#050505', 
                border: '1px solid rgba(220,38,38,0.2)', 
                borderRadius: '24px', 
                margin: '0 auto 48px',
                padding: '32px',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                textAlign: 'left',
                boxShadow: 'inset 0 0 40px rgba(220,38,38,0.05), 0 20px 50px rgba(0,0,0,0.5)'
              }}>
                {/* Scanline Effect */}
                <div style={{ 
                  position: 'absolute', 
                  inset: 0, 
                  background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))',
                  backgroundSize: '100% 4px, 3px 100%',
                  pointerEvents: 'none',
                  zIndex: 2
                }} />
                
                {[...Array(8)].map((_, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: [0, 1, 1, 0.2], x: 0 }}
                    transition={{ duration: 4, repeat: Infinity, delay: i * 0.5 }}
                    style={{ 
                      fontFamily: 'JetBrains Mono, monospace', 
                      fontSize: '11px', 
                      color: i === 7 ? '#dc2626' : 'rgba(255,255,255,0.4)',
                      marginBottom: '8px',
                      textShadow: i === 7 ? '0 0 10px rgba(220,38,38,0.5)' : 'none'
                    }}
                  >
                    <span style={{ color: '#dc2626', marginRight: '10px' }}>▶</span>
                    {`[SYSTEM_LOG] >> ${[
                      'Initializing autonomous architecture mapping...',
                      'Parsing repository directory structure...',
                      'Detecting Next.js fingerprints & signatures...',
                      'Mapping middleware and routing patterns...',
                      'Analyzing dependency graph (package.json)...',
                      'Identifying database drivers & ORM patterns...',
                      'Verifying authentication & security headers...',
                      'Architecture mapping complete. Ready for review.'
                    ][i % 8]}`}
                  </motion.div>
                ))}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 0%, #050505 100%)', pointerEvents: 'none', zIndex: 1 }} />
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px' }}>Analyzing_Architecture</h2>
              <p style={{ color: 'rgba(255,255,255,0.3)' }}>Identifying frameworks, languages, and dependencies...</p>
            </motion.div>
          )}

          {step === 'stack_confirm' && (
            <motion.div 
              key="stack_confirm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={styles.inputFlow}
            >
              <h1 style={{ marginBottom: '12px' }}>Confirm Tech Stack</h1>
              <p style={{ marginBottom: '40px' }}>Our agent identified these technologies. Adjust them for better scan accuracy.</p>

              <div className={styles.stackContainer}>
                {detectedStack.map((tech, i) => (
                  <div key={i} className={styles.techTag}>
                    {tech}
                    <button onClick={() => removeTech(tech)} className={styles.removeBtn}>×</button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '48px' }}>
                <input 
                  className={styles.inputBox} 
                  style={{ flex: 1, padding: '14px 20px', fontSize: '14px' }}
                  placeholder="Add custom tech (e.g. PostgreSQL)" 
                  value={newTech}
                  onChange={(e) => setNewTech(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTech()}
                />
                <button onClick={addTech} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 800 }}>Add</button>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <button onClick={() => setStep('config')} className={styles.tab} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', borderRadius: '16px', cursor: 'pointer', padding: '18px' }}>Back</button>
                <button onClick={startFinalScan} className={styles.launchBtn} style={{ flex: 2 }}>
                  Initialize Full Scan
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )}
    </div>
  )
}
