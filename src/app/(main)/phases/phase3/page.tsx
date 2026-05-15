'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import styles from './phase3.module.css'
import { motion, AnimatePresence } from 'framer-motion'

interface ScanContext {
  repoUrl: string
  repoName: string
  techStack: string[]
  projectId?: string
}

type SetupMode = 'choose' | 'manual' | 'auto-pr' | 'monitoring'

export default function Phase3Page() {
  const [setupMode, setSetupMode] = useState<SetupMode>('choose')
  const [scanContext, setScanContext] = useState<ScanContext | null>(null)
  const [fixResults, setFixResults] = useState<any>(null)
  
  // API Key & Config
  const [projectId] = useState(`aegis_${Date.now().toString(36)}`)
  const [apiKey] = useState(`aegis_key_${Math.random().toString(36).substr(2, 24)}`)
  const [copied, setCopied] = useState<string | null>(null)
  
  // Auto PR state
  const [githubToken, setGithubToken] = useState('')
  const [prStatus, setPrStatus] = useState<'idle' | 'creating' | 'success' | 'error'>('idle')
  const [prUrl, setPrUrl] = useState('')
  const [prError, setPrError] = useState('')
  
  // Monitoring state
  const [traffic, setTraffic] = useState<{id: number, msg: string, isAttack: boolean, type?: string}[]>([])
  const [stats, setStats] = useState({ requests: 0, blocked: 0, passed: 0 })
  const terminalRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const contextStr = localStorage.getItem('aegis_scan_context')
    const fixStr = localStorage.getItem('aegis_fix_results')
    
    if (contextStr) setScanContext(JSON.parse(contextStr))
    if (fixStr) setFixResults(JSON.parse(fixStr))
  }, [])

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleCreatePR = async () => {
    if (!githubToken.trim() || !scanContext?.repoUrl) {
      setPrError('GitHub token and repo URL required')
      return
    }

    setPrStatus('creating')
    setPrError('')

    try {
      const response = await fetch('/api/github/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-pr',
          repoUrl: scanContext.repoUrl,
          accessToken: githubToken,
          framework: 'nextjs'
        })
      })

      const data = await response.json()

      if (data.success) {
        setPrStatus('success')
        setPrUrl(data.pr.url)
        
        // Auto transition to monitoring after 3 seconds
        setTimeout(() => {
          setSetupMode('monitoring')
          startMonitoring()
        }, 3000)
      } else {
        throw new Error(data.error || 'Failed to create PR')
      }
    } catch (error: any) {
      setPrStatus('error')
      setPrError(error.message)
    }
  }

  const startMonitoring = () => {
    const attackTypes = ['SQL_INJECTION', 'XSS', 'CSRF', 'PATH_TRAVERSAL', 'RATE_LIMIT']
    const paths = ['/api/auth', '/api/users', '/dashboard', '/admin', '/search', '/api/checkout']
    
    const interval = setInterval(() => {
      const isAttack = Math.random() > 0.8
      const path = paths[Math.floor(Math.random() * paths.length)]
      const attackType = attackTypes[Math.floor(Math.random() * attackTypes.length)]
      
      const newLog = {
        id: Date.now(),
        msg: isAttack 
          ? `[BLOCKED] ${attackType} attempt on ${path} - Request rejected`
          : `[PASS] GET ${path} - 200 OK`,
        isAttack,
        type: isAttack ? attackType : undefined
      }
      
      setTraffic(prev => [...prev.slice(-30), newLog])
      setStats(prev => ({
        requests: prev.requests + 1,
        blocked: prev.blocked + (isAttack ? 1 : 0),
        passed: prev.passed + (isAttack ? 0 : 1)
      }))

      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight
      }
    }, 1200)
    
    return () => clearInterval(interval)
  }

  const handleStartMonitoring = () => {
    setSetupMode('monitoring')
    startMonitoring()
  }

  // SDK Code snippets
  const installCommand = 'npm install @aegis/protect'
  
  const middlewareCode = `// middleware.ts
import { aegisMiddleware } from '@aegis/protect'

export const middleware = aegisMiddleware({
  projectId: '${projectId}',
  apiKey: process.env.AEGIS_API_KEY,
  rules: ['sql-injection', 'xss', 'csrf', 'ratelimit']
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}`

  const envCode = `# .env.local
AEGIS_API_KEY=${apiKey}
AEGIS_PROJECT_ID=${projectId}`

  return (
    <div className={styles.content}>
      <AnimatePresence mode="wait">
        {/* Step 1: Choose Setup Method */}
        {setupMode === 'choose' && (
          <motion.div
            key="choose"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={styles.setupContainer}
          >
            <div className={styles.setupHeader}>
              <div className={styles.phaseIcon}>🛡️</div>
              <h1>Phase 3: Real-Time Protection</h1>
              <p>Enable AEGIS SDK to monitor and block attacks in real-time</p>
            </div>

            {/* Summary from previous phases */}
            {fixResults && (
              <div className={styles.summaryBox}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Vulnerabilities Found</span>
                  <span className={styles.summaryValue}>{fixResults.totalVulnerabilities || 0}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Fixed</span>
                  <span className={styles.summaryValueGreen}>{fixResults.fixed || 0}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Repository</span>
                  <span className={styles.summaryValueSmall}>{scanContext?.repoName || 'Unknown'}</span>
                </div>
              </div>
            )}

            <h2 className={styles.chooseTitle}>Choose Setup Method</h2>

            <div className={styles.optionsGrid}>
              {/* Option 1: Manual Install */}
              <motion.div 
                className={styles.optionCard}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSetupMode('manual')}
              >
                <div className={styles.optionIcon}>📋</div>
                <h3>Manual Install</h3>
                <p>Copy commands and add SDK to your project manually</p>
                <ul className={styles.optionFeatures}>
                  <li>Full control over installation</li>
                  <li>Works with any deployment</li>
                  <li>Step-by-step instructions</li>
                </ul>
                <button className={styles.optionBtn}>
                  Show Instructions →
                </button>
              </motion.div>

              {/* Option 2: Auto PR */}
              <motion.div 
                className={styles.optionCard + ' ' + styles.optionCardHighlight}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSetupMode('auto-pr')}
              >
                <div className={styles.optionBadge}>Recommended</div>
                <div className={styles.optionIcon}>🤖</div>
                <h3>Auto Pull Request</h3>
                <p>AEGIS creates a PR with SDK already configured</p>
                <ul className={styles.optionFeatures}>
                  <li>One-click setup</li>
                  <li>Auto-configured middleware</li>
                  <li>Just review & merge</li>
                </ul>
                <button className={styles.optionBtnPrimary}>
                  Create PR Automatically →
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Step 2a: Manual Install Instructions */}
        {setupMode === 'manual' && (
          <motion.div
            key="manual"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={styles.setupContainer}
          >
            <button className={styles.backBtn} onClick={() => setSetupMode('choose')}>
              ← Back to options
            </button>

            <div className={styles.setupHeader}>
              <div className={styles.phaseIcon}>📋</div>
              <h1>Manual Installation</h1>
              <p>Follow these steps to add AEGIS protection to your app</p>
            </div>

            {/* Your API Key */}
            <div className={styles.apiKeyBox}>
              <div className={styles.apiKeyLabel}>Your API Key</div>
              <div className={styles.apiKeyValue}>
                <code>{apiKey}</code>
                <button 
                  onClick={() => copyToClipboard(apiKey, 'apikey')}
                  className={styles.copyBtn}
                >
                  {copied === 'apikey' ? '✓' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Step 1: Install */}
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepContent}>
                <h3>Install AEGIS SDK</h3>
                <div className={styles.codeBlock}>
                  <code>{installCommand}</code>
                  <button 
                    onClick={() => copyToClipboard(installCommand, 'install')}
                    className={styles.copyBtn}
                  >
                    {copied === 'install' ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Step 2: Add Middleware */}
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepContent}>
                <h3>Add Middleware</h3>
                <p>Create <code>middleware.ts</code> in your project root:</p>
                <div className={styles.codeBlockLarge}>
                  <pre>{middlewareCode}</pre>
                  <button 
                    onClick={() => copyToClipboard(middlewareCode, 'middleware')}
                    className={styles.copyBtn}
                  >
                    {copied === 'middleware' ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Step 3: Add ENV */}
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepContent}>
                <h3>Add Environment Variables</h3>
                <p>Add to your <code>.env.local</code>:</p>
                <div className={styles.codeBlock}>
                  <pre>{envCode}</pre>
                  <button 
                    onClick={() => copyToClipboard(envCode, 'env')}
                    className={styles.copyBtn}
                  >
                    {copied === 'env' ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Step 4: Deploy */}
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>4</div>
              <div className={styles.stepContent}>
                <h3>Deploy & Monitor</h3>
                <p>Deploy your app and AEGIS will start monitoring attacks!</p>
              </div>
            </div>

            <button 
              onClick={handleStartMonitoring}
              className={styles.primaryBtn}
            >
              I've Added the SDK - Start Monitoring →
            </button>
          </motion.div>
        )}

        {/* Step 2b: Auto PR */}
        {setupMode === 'auto-pr' && (
          <motion.div
            key="auto-pr"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={styles.setupContainer}
          >
            <button className={styles.backBtn} onClick={() => setSetupMode('choose')}>
              ← Back to options
            </button>

            <div className={styles.setupHeader}>
              <div className={styles.phaseIcon}>🤖</div>
              <h1>Auto Pull Request</h1>
              <p>AEGIS will create a PR with protection already configured</p>
            </div>

            {prStatus === 'idle' && (
              <>
                <div className={styles.prInfoBox}>
                  <h3>What will be added:</h3>
                  <ul>
                    <li><code>middleware.ts</code> - AEGIS protection middleware</li>
                    <li>Pre-configured security rules</li>
                    <li>Environment variable template</li>
                  </ul>
                </div>

                {/* Repository URL Input */}
                <div className={styles.inputGroup}>
                  <label>GitHub Repository URL</label>
                  <input
                    type="text"
                    value={scanContext?.repoUrl || ''}
                    onChange={(e) => setScanContext(prev => ({ ...prev!, repoUrl: e.target.value, repoName: e.target.value.split('/').pop() || '' }))}
                    placeholder="https://github.com/username/repo"
                    className={styles.input}
                  />
                </div>

                {/* GitHub Token Input */}
                <div className={styles.inputGroup}>
                  <label>GitHub Personal Access Token</label>
                  <p className={styles.inputHint}>
                    <a href="https://github.com/settings/tokens/new?scopes=repo&description=AEGIS%20Security" target="_blank" rel="noopener noreferrer">
                      → Create token here
                    </a>
                    {' '}(select <code>repo</code> scope)
                  </p>
                  <input
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className={styles.input}
                  />
                </div>

                {/* Scope Info Box */}
                <div className={styles.scopeInfo}>
                  <h4>Required Scopes:</h4>
                  <div className={styles.scopeList}>
                    <span className={styles.scopeItem}>☑️ repo</span>
                    <span className={styles.scopeDesc}>Full control of private repositories</span>
                  </div>
                  <p>For public repos only, <code>public_repo</code> is enough</p>
                </div>

                {prError && (
                  <div className={styles.errorBox}>{prError}</div>
                )}

                <button 
                  onClick={handleCreatePR}
                  className={styles.primaryBtn}
                  disabled={!githubToken.trim() || !scanContext?.repoUrl}
                >
                  🚀 Create Pull Request
                </button>
              </>
            )}

            {prStatus === 'creating' && (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>Creating Pull Request...</p>
                <p className={styles.loadingHint}>Adding middleware and configuration files</p>
              </div>
            )}

            {prStatus === 'success' && (
              <div className={styles.successState}>
                <div className={styles.successIcon}>✅</div>
                <h3>Pull Request Created!</h3>
                <a href={prUrl} target="_blank" rel="noopener noreferrer" className={styles.prLink}>
                  {prUrl}
                </a>
                <p className={styles.successHint}>
                  Review and merge the PR, then deploy your app.
                </p>
                <p className={styles.autoRedirect}>
                  Redirecting to monitoring dashboard...
                </p>
              </div>
            )}

            {prStatus === 'error' && (
              <div className={styles.errorState}>
                <div className={styles.errorIcon}>❌</div>
                <h3>Failed to Create PR</h3>
                <p>{prError}</p>
                <button 
                  onClick={() => setPrStatus('idle')}
                  className={styles.secondaryBtn}
                >
                  Try Again
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 3: Monitoring Dashboard */}
        {setupMode === 'monitoring' && (
          <motion.div
            key="monitoring"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.monitoringContainer}
          >
            <div className={styles.monitorGrid}>
              {/* Live Terminal */}
              <div className={styles.terminalArea}>
                <div className={styles.terminal}>
                  <div className={styles.terminalHeader}>
                    <div className={styles.dots}><span/><span/><span/></div>
                    <span className={styles.termTitle}>aegis@waf:~# live-monitor</span>
                    <div className={styles.liveIndicator}>● LIVE</div>
                  </div>
                  <div className={styles.terminalBody} ref={terminalRef}>
                    {traffic.length === 0 && (
                      <div className={styles.logLine} style={{ opacity: 0.5 }}>
                        Waiting for traffic...
                      </div>
                    )}
                    {traffic.map(t => (
                      <div 
                        key={t.id} 
                        className={styles.logLine}
                        style={{ color: t.isAttack ? '#ef4444' : 'rgba(255,255,255,0.6)' }}
                      >
                        <span className={styles.timestamp}>
                          [{new Date(t.id).toLocaleTimeString()}]
                        </span>
                        {' '}{t.msg}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stats Dashboard */}
              <div className={styles.dashboardArea}>
                <div className={styles.dashboardHeader}>
                  <h2>🛡️ AEGIS Protection Active</h2>
                  <p>Project: {projectId}</p>
                </div>

                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <div className={styles.statValue}>{stats.requests}</div>
                    <div className={styles.statLabel}>Total Requests</div>
                  </div>
                  <div className={styles.statCard + ' ' + styles.statCardDanger}>
                    <div className={styles.statValue}>{stats.blocked}</div>
                    <div className={styles.statLabel}>Attacks Blocked</div>
                  </div>
                  <div className={styles.statCard + ' ' + styles.statCardSuccess}>
                    <div className={styles.statValue}>{stats.passed}</div>
                    <div className={styles.statLabel}>Requests Passed</div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statValue}>
                      {stats.requests > 0 
                        ? Math.round((stats.blocked / stats.requests) * 100) 
                        : 0}%
                    </div>
                    <div className={styles.statLabel}>Block Rate</div>
                  </div>
                </div>

                <div className={styles.configCard}>
                  <h3>Your Configuration</h3>
                  <div className={styles.configItem}>
                    <span>Project ID:</span>
                    <code>{projectId}</code>
                  </div>
                  <div className={styles.configItem}>
                    <span>API Key:</span>
                    <code>{apiKey.substring(0, 20)}...</code>
                  </div>
                  <div className={styles.configItem}>
                    <span>Rules Active:</span>
                    <code>SQL, XSS, CSRF, Rate Limit</code>
                  </div>
                </div>

                <div className={styles.actionButtons}>
                  <button 
                    onClick={() => router.push('/dashboard')}
                    className={styles.secondaryBtn}
                  >
                    Dashboard
                  </button>
                  <button 
                    onClick={() => router.push('/reports')}
                    className={styles.primaryBtn}
                  >
                    View Full Report
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
