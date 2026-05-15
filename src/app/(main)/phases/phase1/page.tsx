'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './phase1.module.css'
import { motion, AnimatePresence } from 'framer-motion'

interface Finding {
  id: number
  file: string
  issue: string
  type?: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  line: number
  currentCode: string
  fixedCode: string
  description: string
  patched?: boolean
}

interface ScanContext {
  repoUrl: string
  repoName: string
  techStack: string[]
  projectId?: string
}

interface ScanSummary {
  critical: number
  high: number
  medium: number
  low: number
}

export default function Phase1Page() {
  const [isScanning, setIsScanning] = useState(true)
  const [progress, setProgress] = useState(0)
  const [findings, setFindings] = useState<Finding[]>([])
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null)
  const [scanContext, setScanContext] = useState<ScanContext | null>(null)
  const [summary, setSummary] = useState<ScanSummary>({ critical: 0, high: 0, medium: 0, low: 0 })
  const [scannedFiles, setScannedFiles] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [scanLogs, setScanLogs] = useState<string[]>([])
  const router = useRouter()

  useEffect(() => {
    // Load scan context from localStorage
    const contextStr = localStorage.getItem('aegis_scan_context')
    if (contextStr) {
      const context = JSON.parse(contextStr)
      setScanContext(context)
      startScan(context.repoUrl)
    } else {
      // Demo mode - use dummy data
      simulateDemoScan()
    }
  }, [])

  const startScan = async (repoUrl: string) => {
    setIsScanning(true)
    setProgress(0)
    setScanLogs([])
    
    // Simulate progress while fetching
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev
        return prev + Math.random() * 15
      })
      setScanLogs(prev => {
        const logs = [
          'Connecting to GitHub API...',
          'Fetching repository tree...',
          'Analyzing directory structure...',
          'Scanning source files for vulnerabilities...',
          'Checking for hardcoded secrets...',
          'Analyzing SQL query patterns...',
          'Detecting XSS vulnerabilities...',
          'Scanning for command injection risks...',
          'Analyzing authentication patterns...',
          'Generating vulnerability report...'
        ]
        if (prev.length < logs.length) {
          return [...prev, logs[prev.length]]
        }
        return prev
      })
    }, 500)

    try {
      const context = JSON.parse(localStorage.getItem('aegis_scan_context') || '{}')
      
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          repoUrl: repoUrl,
          local: context.isLocal
        })
      })

      const data = await response.json()
      
      clearInterval(progressInterval)
      
      if (data.error) {
        setError(data.error)
        setIsScanning(false)
        return
      }

      setFindings(data.findings || [])
      setSummary(data.summary || { critical: 0, high: 0, medium: 0, low: 0 })
      setScannedFiles(data.scannedFiles || 0)
      setProgress(100)
      
      // Store findings for Phase 2
      localStorage.setItem('aegis_scan_findings', JSON.stringify(data.findings || []))
      
      setTimeout(() => setIsScanning(false), 1000)
    } catch (err: any) {
      clearInterval(progressInterval)
      setError(err.message || 'Failed to scan repository')
      setIsScanning(false)
    }
  }
  const simulateDemoScan = () => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsScanning(false)
          setFindings([
            { 
              id: 3, 
              file: 'config/aws.js', 
              issue: 'AWS Credentials Exposed', 
              severity: 'Critical',
              currentCode: `const AWS_KEY = "AKIAIOSFODNN7EXAMPLE"\nconst AWS_SECRET = "wJalrXUtnFEMI/K7MDENG"`,
              fixedCode: `const AWS_KEY = process.env.AWS_ACCESS_KEY_ID\nconst AWS_SECRET = process.env.AWS_SECRET_ACCESS_KEY`,
              line: 3,
              description: 'AWS credentials terekspos! Hacker bisa mengakses semua resource AWS Anda.'
            },
            { 
              id: 4, 
              file: 'db/connection.py', 
              issue: 'SQL Injection Vulnerability', 
              severity: 'High',
              currentCode: `query = f"SELECT * FROM users WHERE id = {user_id}"`,
              fixedCode: `query = "SELECT * FROM users WHERE id = %s", (user_id,)`,
              line: 45,
              description: 'SQL Injection memungkinkan hacker mengakses/menghapus seluruh database.'
            },
            { 
              id: 5, 
              file: 'utils/payment.js', 
              issue: 'Stripe API Key Hardcoded', 
              severity: 'High',
              currentCode: `const STRIPE_KEY = "sk_live_51ABC123xyz..."`,
              fixedCode: `const STRIPE_KEY = process.env.STRIPE_SECRET_KEY`,
              line: 12,
              description: 'Stripe secret key terekspos! Hacker bisa melakukan transaksi ilegal.'
            },
            { 
              id: 6, 
              file: 'config/telegram.py', 
              issue: 'Telegram Bot Token Exposed', 
              severity: 'Medium',
              currentCode: `BOT_TOKEN = "6789012345:AAHdqTcvZ..."`,
              fixedCode: `BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")`,
              line: 5,
              description: 'Token Telegram bot terekspos. Bot bisa diambil alih oleh pihak lain.'
            }
          ])
          setSummary({ critical: 3, high: 2, medium: 1, low: 0 })
          setScannedFiles(124)
          return 100
        }
        return prev + 2
      })
    }, 50)
    return () => clearInterval(interval)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return '#dc2626'
      case 'High': return '#f97316'
      case 'Medium': return '#eab308'
      case 'Low': return '#22c55e'
      default: return '#6b7280'
    }
  }

  const handleApplyPatch = async (finding: Finding) => {
    try {
      const context = JSON.parse(localStorage.getItem('aegis_scan_context') || '{}')
      
      const response = await fetch('/api/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply-fix',
          file: finding.file,
          fixedCode: finding.fixedCode,
          vulnerability: {
            line: finding.line,
            type: finding.issue || finding.type
          },
          repoUrl: context.repoUrl,
          isLocal: context.isLocal
        })
      })

      const data = await response.json()
      if (data.success) {
        setFindings(prev => prev.map(f => 
          f.id === finding.id ? { ...f, patched: true } : f
        ))
        setSelectedFinding(null)
      } else {
        alert('Failed to apply fix: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('Error applying fix:', err)
      alert('Error applying fix. Please check console.')
    }
  }

  const [isPatching, setIsPatching] = useState(false)

  const handlePatchAllAndContinue = async () => {
    if (findings.length === 0) {
      router.push('/phases/phase3')
      return
    }

    setIsPatching(true)
    
    try {
      // Group findings by file for batch patching
      const filesToFix = Array.from(new Set(findings.map(f => f.file)))
      const context = JSON.parse(localStorage.getItem('aegis_scan_context') || '{}')
      
      for (const file of filesToFix) {
        const fileFixes = findings.filter(f => f.file === file).map(f => ({
          line: f.line,
          type: f.issue || f.type,
          fixedCode: f.fixedCode
        }))

        await fetch('/api/fix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'batch-apply',
            file: file,
            fixes: fileFixes,
            repoUrl: context.repoUrl,
            isLocal: context.isLocal
          })
        })
      }

      // Store results
      localStorage.setItem('aegis_fix_results', JSON.stringify({
        total: findings.length,
        fixed: findings.length,
        timestamp: new Date().toISOString()
      }))
      
      router.push('/phases/phase3')
    } catch (err: any) {
      console.error('Patching failed:', err)
      alert('Failed to apply some patches. Moving to Monitoring phase.')
      router.push('/phases/phase3')
    } finally {
      setIsPatching(false)
    }
  }

  const totalFindings = summary.critical + summary.high + summary.medium + summary.low

  return (
    <div className={styles.content}>
      <AnimatePresence mode="wait">
        {isScanning ? (
          <motion.div 
            key="scanning"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className={styles.scanningView}
          >
            <div className={styles.analysisVisual}>
              <div className={styles.codeStream}>
                {scanLogs.slice(-6).map((log, i) => (
                  <motion.div 
                    key={i}
                    className={styles.codeLine}
                    initial={{ x: -100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <span style={{ color: '#dc2626', marginRight: '10px' }}>▶</span>
                    {log}
                  </motion.div>
                ))}
                {scanLogs.length === 0 && ["A1B2C3D4", "E5F6G7H8", "I9J0K1L2", "M3N4O5P6", "Q7R8S9T0", "U1V2W3X4"].map((hex, i) => (
                  <motion.div 
                    key={i}
                    className={styles.codeLine}
                    initial={{ x: -100, opacity: 0 }}
                    animate={{ x: 0, opacity: [0, 1, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                  >
                    {`0x${hex} >> ANALYZING_BLOCK_${i}...`}
                  </motion.div>
                ))}
              </div>
              <motion.div 
                className={styles.magnifier}
                animate={{ 
                  x: [-50, 50, -50],
                  y: [-20, 20, -20]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                🔍
              </motion.div>
            </div>

            <h1 className={styles.scanTitle}>
              {scanContext ? `Scanning ${scanContext.repoName}` : 'Analyzing Code Patterns'}
            </h1>
            <div className={styles.progressBarLarge}>
              <motion.div 
                className={styles.progressFillLarge} 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
            <div className={styles.scanStats}>
              <span>{Math.round(progress)}% COMPLETE</span>
              <span>ENGINE: AEGIS_NEURAL_V2</span>
            </div>
          </motion.div>
        ) : error ? (
          <motion.div 
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={styles.errorView}
            style={{ textAlign: 'center', padding: '60px' }}
          >
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>⚠️</div>
            <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>Scan Failed</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '32px' }}>{error}</p>
            <button 
              onClick={() => router.push('/phases/phase0')} 
              style={{ 
                background: 'rgba(220, 38, 38, 0.2)', 
                border: '1px solid #dc2626',
                color: '#fff',
                padding: '12px 32px',
                borderRadius: '12px',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.dashboard}
          >
            {/* Dashboard Header */}
            <div className={styles.dashboardHeader}>
              <div className={styles.headerLeft}>
                <h1>Security Analysis</h1>
                <p>
                  {scanContext ? scanContext.repoName : 'Demo Project'} • Scanned {scannedFiles} files
                </p>
              </div>
              <div className={styles.headerRight}>
                <div className={styles.aiBadge}>AI HEALING READY</div>
                <button 
                  onClick={handlePatchAllAndContinue} 
                  className={styles.nextPhaseBtn}
                  disabled={isPatching}
                >
                  {isPatching ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className={styles.spinnerSmall} /> Applying Surgical Fixes...
                    </span>
                  ) : (
                    findings.length > 0 ? 'Patch All & Continue' : 'Continue to Monitoring'
                  )}
                </button>
              </div>
            </div>

            {/* Stats Row */}
            <div className={styles.statsRow}>
              <motion.div 
                className={`${styles.statCard} ${styles.critical}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className={styles.statNumber}>{summary.critical}</div>
                <div className={styles.statLabel}>Critical</div>
              </motion.div>
              <motion.div 
                className={`${styles.statCard} ${styles.high}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className={styles.statNumber}>{summary.high}</div>
                <div className={styles.statLabel}>High</div>
              </motion.div>
              <motion.div 
                className={`${styles.statCard} ${styles.medium}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className={styles.statNumber}>{summary.medium}</div>
                <div className={styles.statLabel}>Medium</div>
              </motion.div>
              <motion.div 
                className={`${styles.statCard} ${styles.low}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className={styles.statNumber}>{summary.low}</div>
                <div className={styles.statLabel}>Low</div>
              </motion.div>
              <motion.div 
                className={`${styles.statCard} ${styles.total}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className={styles.statNumber}>{totalFindings}</div>
                <div className={styles.statLabel}>Total Issues</div>
              </motion.div>
            </div>

            {/* Main Content */}
            <div className={styles.mainContent}>
              {/* Vulnerabilities Panel (Wide) */}
              <div className={styles.vulnerabilitiesPanel}>
                <div className={styles.panelHeader}>
                  <h2>
                    Detected Vulnerabilities
                    <span className={styles.badgeCount}>{findings.length}</span>
                  </h2>
                </div>

                {findings.length === 0 ? (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>✅</div>
                    <h3>No Vulnerabilities Found</h3>
                    <p>Your code passed all security checks!</p>
                  </div>
                ) : (
                  <div className={styles.vulnerabilitiesTable}>
                    {/* Table Header */}
                    <div className={styles.tableHeader}>
                      <span>Severity</span>
                      <span>Issue</span>
                      <span>File</span>
                      <span>Line</span>
                      <span>Action</span>
                    </div>

                    {/* Vulnerability Rows */}
                    {findings.map((f, index) => (
                      <motion.div
                        key={f.id}
                        className={`${styles.vulnRow} ${selectedFinding?.id === f.id ? styles.selected : ''} ${f.patched ? styles.patched : ''}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => setSelectedFinding(f)}
                        style={{ opacity: f.patched ? 0.5 : 1 }}
                      >
                        <span 
                          className={styles.sevBadge}
                          style={{ 
                            background: `${getSeverityColor(f.severity)}20`,
                            color: getSeverityColor(f.severity),
                            border: `1px solid ${getSeverityColor(f.severity)}40`
                          }}
                        >
                          {f.severity}
                        </span>
                        <span className={styles.vulnIssue}>
                          {f.patched && '✓ '}{f.issue}
                        </span>
                        <span className={styles.vulnFile}>{f.file}</span>
                        <span className={styles.vulnLine}>Line {f.line}</span>
                        <div className={styles.vulnAction}>
                          <button 
                            className={styles.viewBtn}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedFinding(f)
                            }}
                          >
                            {f.patched ? 'View' : 'Fix'}
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Remediation Panel (Right Side) */}
              <div className={styles.remediationPanel}>
                <div className={styles.panelHeader}>
                  <h2>Remediation</h2>
                  {selectedFinding && <div className={styles.aiBadge}>AI PATCH</div>}
                </div>

                <div className={styles.remediationContent}>
                  {selectedFinding ? (
                    <>
                      {/* Issue Info */}
                      <div className={styles.issueInfo}>
                        <div className={styles.issueHeader}>
                          <span 
                            className={styles.sevBadge}
                            style={{ 
                              background: getSeverityColor(selectedFinding.severity),
                              color: '#fff'
                            }}
                          >
                            {selectedFinding.severity}
                          </span>
                          <span className={styles.issueTitle}>{selectedFinding.issue}</span>
                        </div>
                        <p className={styles.issueDesc}>{selectedFinding.description}</p>
                      </div>

                      {/* Code Diff - Before & After */}
                      <div className={styles.codeDiff}>
                        {/* BEFORE - Kode Lama (Berbahaya) */}
                        <div className={styles.diffBlock}>
                          <div className={styles.diffHeader}>
                            <span className={styles.diffLabel}>
                              <span className={styles.diffIcon}>✕</span>
                              KODE LAMA
                            </span>
                            <span className={styles.diffBadgeDanger}>BERBAHAYA</span>
                          </div>
                          <div className={styles.diffFileInfo}>
                            {selectedFinding.file} (line {selectedFinding.line})
                          </div>
                          <div className={styles.diffCode}>
                            <div className={styles.diffLineRemoved}>
                              {selectedFinding.currentCode.split('\n').map((line, i) => (
                                <div key={i} className={styles.diffLineContent}>
                                  <span className={styles.diffLineNum}>{selectedFinding.line + i}</span>
                                  <span className={styles.diffMinus}>−</span>
                                  <code>{line}</code>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Arrow Indicator */}
                        <div className={styles.diffArrow}>
                          <div className={styles.diffArrowLine}></div>
                          <span className={styles.diffArrowIcon}>▼</span>
                          <span className={styles.diffArrowLabel}>AEGIS AUTO-FIX</span>
                        </div>

                        {/* AFTER - Kode Baru (Aman) */}
                        <div className={styles.diffBlock}>
                          <div className={styles.diffHeaderFixed}>
                            <span className={styles.diffLabel}>
                              <span className={styles.diffIconAdd}>✓</span>
                              KODE BARU
                            </span>
                            <span className={styles.diffBadgeSafe}>100% AMAN - SIAP ACC</span>
                          </div>
                          <div className={styles.diffFileInfo}>
                            {selectedFinding.file} (line {selectedFinding.line})
                          </div>
                          <div className={styles.diffCode}>
                            <div className={styles.diffLineAdded}>
                              {selectedFinding.fixedCode.split('\n').map((line, i) => (
                                <div key={i} className={styles.diffLineContent}>
                                  <span className={styles.diffLineNum}>{selectedFinding.line + i}</span>
                                  <span className={styles.diffPlus}>+</span>
                                  <code>{line}</code>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className={styles.actionButtons}>
                        <button 
                          className={styles.rejectBtn}
                          onClick={() => setSelectedFinding(null)}
                        >
                          Dismiss
                        </button>
                        <button 
                          className={styles.applyBtn}
                          onClick={() => handleApplyPatch(selectedFinding)}
                          disabled={selectedFinding.patched}
                        >
                          {selectedFinding.patched ? 'Applied' : 'Apply Patch'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className={styles.noSelection}>
                      <div className={styles.icon}>🛡️</div>
                      <h3>Select a Vulnerability</h3>
                      <p>Click on any issue to view AI-generated remediation patch</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
