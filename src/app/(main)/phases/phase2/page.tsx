'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import styles from './phase2.module.css'
import { motion, AnimatePresence } from 'framer-motion'

interface Vulnerability {
  id: string
  type: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  file: string
  line: number
  code: string
  description: string
}

interface FixSuggestion {
  vulnerabilityId: string
  originalCode: string
  fixedCode: string
  explanation: string
  confidence: number
  status: 'pending' | 'loading' | 'ready' | 'applied' | 'skipped'
}

interface VulnWithFix extends Vulnerability {
  fix?: FixSuggestion
}

export default function Phase2Page() {
  const [vulnerabilities, setVulnerabilities] = useState<VulnWithFix[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVuln, setSelectedVuln] = useState<VulnWithFix | null>(null)
  const [applyingAll, setApplyingAll] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const terminalRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
    setTimeout(() => {
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight
      }
    }, 100)
  }

  // Load vulnerabilities from Phase 1
  useEffect(() => {
    loadVulnerabilities()
  }, [])

  const loadVulnerabilities = async () => {
    addLog('AEGIS Auto-Fix Engine v2.0')
    addLog('Loading vulnerabilities from Phase 1...')

    // Try to load from localStorage (from Phase 1)
    const savedResults = localStorage.getItem('aegis_scan_findings') || localStorage.getItem('aegis_scan_results')
    
    if (savedResults) {
      try {
        const parsed = JSON.parse(savedResults)
        const vulns = parsed.vulnerabilities || parsed
        
        if (Array.isArray(vulns) && vulns.length > 0) {
          addLog(`Found ${vulns.length} vulnerabilities to fix`)
          setVulnerabilities(vulns.map((v: any) => ({
            ...v,
            id: v.id || `vuln_${Math.random().toString(36).substr(2, 9)}`,
            fix: { status: 'pending' } as FixSuggestion
          })))
          setLoading(false)
          
          // Generate fixes
          setTimeout(() => generateAllFixes(vulns), 500)
          return
        }
      } catch (e) {
        addLog('Error parsing saved results')
      }
    }

    // Demo vulnerabilities if no real data
    addLog('No scan data found, loading demo vulnerabilities...')
    const demoVulns: VulnWithFix[] = [
      {
        id: 'vuln_1',
        type: 'SQL Injection',
        severity: 'critical',
        file: 'src/api/users.ts',
        line: 42,
        code: 'const query = `SELECT * FROM users WHERE id = ${userId}`',
        description: 'User input directly concatenated into SQL query',
        fix: { status: 'pending' } as FixSuggestion
      },
      {
        id: 'vuln_2',
        type: 'XSS',
        severity: 'high',
        file: 'src/components/Comment.tsx',
        line: 15,
        code: '<div dangerouslySetInnerHTML={{ __html: userComment }} />',
        description: 'User input rendered as HTML without sanitization',
        fix: { status: 'pending' } as FixSuggestion
      },
      {
        id: 'vuln_3',
        type: 'Hardcoded Secret',
        severity: 'critical',
        file: 'src/lib/api.ts',
        line: 8,
        code: 'const API_KEY = "sk-1234567890abcdef"',
        description: 'API key hardcoded in source code',
        fix: { status: 'pending' } as FixSuggestion
      },
      {
        id: 'vuln_4',
        type: 'Missing Security Headers',
        severity: 'medium',
        file: 'next.config.js',
        line: 1,
        code: 'module.exports = { /* no security headers */ }',
        description: 'No security headers configured (CSP, HSTS, etc)',
        fix: { status: 'pending' } as FixSuggestion
      },
      {
        id: 'vuln_5',
        type: 'Insecure Random',
        severity: 'medium',
        file: 'src/utils/token.ts',
        line: 5,
        code: 'const token = Math.random().toString(36).substring(7)',
        description: 'Using Math.random() for security-sensitive token generation',
        fix: { status: 'pending' } as FixSuggestion
      }
    ]

    setVulnerabilities(demoVulns)
    setLoading(false)
    
    setTimeout(() => generateAllFixes(demoVulns), 500)
  }

  const generateAllFixes = async (vulns: Vulnerability[]) => {
    addLog('═══════════════════════════════════════')
    addLog('AI FIX GENERATION - Analyzing vulnerabilities...')
    addLog('═══════════════════════════════════════')

    for (const vuln of vulns) {
      await generateFix(vuln)
    }

    addLog('═══════════════════════════════════════')
    addLog('All fixes generated! Review and apply.')
    addLog('═══════════════════════════════════════')
  }

  const generateFix = async (vuln: Vulnerability) => {
    // Update status to loading
    setVulnerabilities(prev => prev.map(v => 
      v.id === vuln.id ? { ...v, fix: { ...v.fix, status: 'loading' } as FixSuggestion } : v
    ))

    addLog(`[AI] Generating fix for ${vuln.type}...`)

    try {
      const response = await fetch('/api/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-fix',
          vulnerability: vuln
        })
      })

      const data = await response.json()

      if (data.success && data.fix) {
        setVulnerabilities(prev => prev.map(v => 
          v.id === vuln.id ? { 
            ...v, 
            fix: { ...data.fix, status: 'ready' } 
          } : v
        ))
        addLog(`[AI] ✓ Fix ready for ${vuln.type} (${Math.round(data.fix.confidence * 100)}% confidence)`)
      } else {
        throw new Error(data.error || 'Failed to generate fix')
      }
    } catch (error: any) {
      addLog(`[ERROR] Failed to generate fix: ${error.message}`)
      // Set generic fix
      setVulnerabilities(prev => prev.map(v => 
        v.id === vuln.id ? { 
          ...v, 
          fix: {
            vulnerabilityId: vuln.id,
            originalCode: vuln.code,
            fixedCode: `// TODO: Fix ${vuln.type}\n${vuln.code}`,
            explanation: `Please review and fix this ${vuln.type} vulnerability manually.`,
            confidence: 0.5,
            status: 'ready'
          }
        } : v
      ))
    }
  }

  const applyFix = async (vuln: VulnWithFix) => {
    if (!vuln.fix || vuln.fix.status !== 'ready') return

    addLog(`[FIX] Applying fix for ${vuln.type} in ${vuln.file}...`)
    
    try {
      const scanContext = JSON.parse(localStorage.getItem('aegis_scan_context') || '{}')

      const response = await fetch('/api/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply-fix',
          file: vuln.file,
          fixedCode: vuln.fix.fixedCode,
          vulnerability: vuln,
          repoUrl: scanContext.repoUrl,
          isLocal: scanContext.isLocal
        })
      })

      const data = await response.json()

      if (data.success) {
        setVulnerabilities(prev => prev.map(v => 
          v.id === vuln.id ? { 
            ...v, 
            fix: { ...v.fix!, status: 'applied' }
          } : v
        ))

        addLog(`[FIX] ✓ ${vuln.file}:${vuln.line} - Fixed!`)
        if (data.github_url) {
          addLog(`[GIT] ✓ Successfully pushed to GitHub: ${data.message}`)
        } else {
          addLog(`[LOCAL] ✓ Successfully patched local file: ${data.message}`)
        }
        setSelectedVuln(null)
      } else {
        throw new Error(data.error || 'Failed to apply fix')
      }
    } catch (error: any) {
      addLog(`[ERROR] Failed to apply fix: ${error.message}`)
    }
  }

  const skipFix = (vuln: VulnWithFix) => {
    setVulnerabilities(prev => prev.map(v => 
      v.id === vuln.id ? { 
        ...v, 
        fix: { ...v.fix!, status: 'skipped' }
      } : v
    ))
          addLog(`[SKIP] Skipped fix for ${vuln.type}`)
    setSelectedVuln(null)
  }

  const applyAllFixes = async () => {
    const readyFixes = vulnerabilities.filter(v => v.fix && v.fix.status === 'ready')
    if (readyFixes.length === 0) return

    addLog(`[12.11.54] AEGIS AUTO-FIX - Applying all ${readyFixes.length} fixes...`)
    setApplyingAll(true)

    try {
      const scanContext = JSON.parse(localStorage.getItem('aegis_scan_context') || '{}')
      const filesToFix = Array.from(new Set(readyFixes.map(v => v.file)))

      for (const file of filesToFix) {
        const fileFixes = readyFixes.filter(v => v.file === file).map(v => ({
          line: v.line,
          type: v.type,
          fixedCode: v.fix!.fixedCode
        }))

        addLog(`[FIX] Batch applying fixes for ${file}...`)
        
        const response = await fetch('/api/fix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'batch-apply',
            file,
            fixes: fileFixes,
            repoUrl: scanContext.repoUrl,
            isLocal: scanContext.isLocal
          })
        })

        const data = await response.json()
        if (!data.success) throw new Error(data.error || `Failed to fix ${file}`)
        
        addLog(`[GIT] ✓ ${data.message}`)
      }

      setVulnerabilities(prev => prev.map(v => 
        v.fix && v.fix.status === 'ready' ? { ...v, fix: { ...v.fix, status: 'applied' } } : v
      ))
      
      addLog(`[12.12.12] ALL FIXES APPLIED!`)
    } catch (error: any) {
      addLog(`[ERROR] Batch fix failed: ${error.message}`)
    } finally {
      setApplyingAll(false)
    }
  }

  const proceedToPhase3 = () => {
    // Save fixed results
    const results = {
      totalVulnerabilities: vulnerabilities.length,
      fixed: vulnerabilities.filter(v => v.fix?.status === 'applied').length,
      skipped: vulnerabilities.filter(v => v.fix?.status === 'skipped').length,
      vulnerabilities: vulnerabilities.map(v => ({
        ...v,
        status: v.fix?.status === 'applied' ? 'fixed' : 
                v.fix?.status === 'skipped' ? 'skipped' : 'pending'
      }))
    }
    localStorage.setItem('aegis_fix_results', JSON.stringify(results))
    router.push('/phases/phase3')
  }

  // Stats
  const readyCount = vulnerabilities.filter(v => v.fix?.status === 'ready').length
  const appliedCount = vulnerabilities.filter(v => v.fix?.status === 'applied').length
  const skippedCount = vulnerabilities.filter(v => v.fix?.status === 'skipped').length
  const loadingCount = vulnerabilities.filter(v => v.fix?.status === 'loading').length
  const totalCount = vulnerabilities.length

  const allProcessed = readyCount === 0 && loadingCount === 0 && totalCount > 0

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc2626'
      case 'high': return '#f97316'
      case 'medium': return '#eab308'
      case 'low': return '#22c55e'
      default: return '#6b7280'
    }
  }

  return (
    <div className={styles.content}>
      <div className={styles.deployGrid}>
        {/* Left: Terminal */}
        <div className={styles.terminalArea}>
          <div className={styles.terminal}>
            <div className={styles.terminalHeader}>
              <div className={styles.dots}><span/><span/><span/></div>
              <span className={styles.termTitle}>aegis@fix:~$ ./autofix.sh</span>
            </div>
            <div className={styles.terminalBody} ref={terminalRef}>
              {logs.map((line, i) => (
                <div 
                  key={i} 
                  className={`${styles.logLine} ${
                    line.includes('ERROR') ? styles.logError : 
                    line.includes('✓') ? styles.logPass : 
                    line.includes('FIX') ? styles.logFix :
                    line.includes('AI') ? styles.logAI :
                    line.includes('SKIP') ? styles.logSkip : ''
                  }`}
                >
                  {line}
                </div>
              ))}
              {loadingCount > 0 && (
                <div className={styles.logLine}>
                  <span className={styles.spinner}>⠋</span> Generating fixes... ({loadingCount} remaining)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Fix Panel */}
        <div className={styles.statusArea}>
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={styles.statusCard}
              >
                <div className={styles.vercelBrand}>
                  <div className={styles.vercelIcon}>🔧</div>
                  <span>Auto-Fix</span>
                </div>
                <h2 className={styles.statusTitle}>Loading Vulnerabilities...</h2>
                <div className={styles.progressContainer}>
                  <div className={styles.progressBar}>
                    <motion.div 
                      className={styles.progressFill}
                      initial={{ width: 0 }}
                      animate={{ width: '50%' }}
                      transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
                    />
                  </div>
                </div>
              </motion.div>
            ) : selectedVuln ? (
              <motion.div
                key="fix-detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={styles.fixDetailCard}
              >
                <button className={styles.backBtn} onClick={() => setSelectedVuln(null)}>← Back</button>
                
                <div className={styles.fixHeader}>
                  <span 
                    className={styles.sevBadge}
                    style={{ background: getSeverityColor(selectedVuln.severity) }}
                  >
                    {selectedVuln.severity.toUpperCase()}
                  </span>
                  <h3>{selectedVuln.type}</h3>
                  <p>{selectedVuln.description}</p>
                  <div className={styles.fileInfo}>{selectedVuln.file}:{selectedVuln.line}</div>
                </div>

                {selectedVuln.fix?.status === 'loading' ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div className={styles.spinner} style={{ fontSize: '32px' }}>⠋</div>
                    <p style={{ marginTop: '16px', opacity: 0.6 }}>AI is generating fix...</p>
                  </div>
                ) : selectedVuln.fix?.status === 'ready' ? (
                  <>
                    <div className={styles.codeDiff}>
                      <div className={styles.codeBlock}>
                        <div className={styles.codeHeader + ' ' + styles.vulnerable}>
                          <span>✕</span> VULNERABLE CODE
                        </div>
                        <pre className={styles.codeContent}>{selectedVuln.fix.originalCode}</pre>
                      </div>

                      <div className={styles.diffArrow}>▼ AI FIX</div>

                      <div className={styles.codeBlock}>
                        <div className={styles.codeHeader + ' ' + styles.fixed}>
                          <span>✓</span> FIXED CODE
                        </div>
                        <pre className={styles.codeContent}>{selectedVuln.fix.fixedCode}</pre>
                      </div>
                    </div>

                    <div style={{ 
                      background: 'rgba(34, 197, 94, 0.1)', 
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '16px'
                    }}>
                      <strong style={{ color: '#22c55e' }}>Explanation:</strong>
                      <p style={{ margin: '8px 0 0', fontSize: '13px', opacity: 0.9 }}>
                        {selectedVuln.fix.explanation}
                      </p>
                      <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.6 }}>
                        Confidence: {Math.round(selectedVuln.fix.confidence * 100)}%
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button 
                        className={styles.applyFixBtn}
                        onClick={() => applyFix(selectedVuln)}
                      >
                        Apply Fix
                      </button>
                      <button 
                        className={styles.skipBtn}
                        onClick={() => skipFix(selectedVuln)}
                      >
                        Skip
                      </button>
                    </div>
                  </>
                ) : selectedVuln.fix?.status === 'applied' ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                    <h3 style={{ color: '#22c55e' }}>Fix Applied!</h3>
                    <p style={{ opacity: 0.6, marginTop: '8px' }}>This vulnerability has been fixed.</p>
                  </div>
                ) : null}
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={styles.resultsCard}
              >
                <div className={styles.resultsHeader}>
                  <div className={allProcessed && appliedCount > 0 ? styles.resultsBadgeFixed : styles.resultsBadge}>
                    {allProcessed ? (appliedCount === totalCount ? 'ALL FIXED!' : 'REVIEW COMPLETE') : 'AUTO-FIX'}
                  </div>
                  <h2>Phase 2: Auto-Fix</h2>
                  <p>AI-powered vulnerability remediation</p>
                </div>

                <div className={styles.statsRow}>
                  <div className={`${styles.statBox} ${styles.statVuln}`}>
                    <div className={styles.statNum}>{readyCount}</div>
                    <div className={styles.statLabel}>Pending</div>
                  </div>
                  <div className={`${styles.statBox} ${styles.statFixed}`}>
                    <div className={styles.statNum}>{appliedCount}</div>
                    <div className={styles.statLabel}>Fixed</div>
                  </div>
                  <div className={`${styles.statBox} ${styles.statPass}`}>
                    <div className={styles.statNum}>{skippedCount}</div>
                    <div className={styles.statLabel}>Skipped</div>
                  </div>
                </div>

                <div className={styles.vulnList}>
                  {vulnerabilities.map(vuln => (
                    <div 
                      key={vuln.id} 
                      className={`${styles.vulnItem} ${
                        vuln.fix?.status === 'applied' ? styles.vulnFixed : 
                        vuln.fix?.status === 'skipped' ? styles.vulnSkipped : ''
                      }`}
                      onClick={() => setSelectedVuln(vuln)}
                    >
                      <div className={styles.vulnHeader}>
                        <span 
                          className={styles.sevBadge}
                          style={{ 
                            background: vuln.fix?.status === 'applied' ? '#22c55e' :
                                       vuln.fix?.status === 'skipped' ? '#6b7280' :
                                       getSeverityColor(vuln.severity)
                          }}
                        >
                          {vuln.fix?.status === 'applied' ? '✓ FIXED' : 
                           vuln.fix?.status === 'skipped' ? 'SKIPPED' :
                           vuln.severity.toUpperCase()}
                        </span>
                        <span className={styles.vulnEndpoint}>{vuln.file}:{vuln.line}</span>
                      </div>
                      <div className={styles.vulnName}>{vuln.type}</div>
                      <div className={styles.vulnDesc}>{vuln.description}</div>
                      {vuln.fix?.status === 'ready' && (
                        <button className={styles.viewFixBtn}>View Fix →</button>
                      )}
                      {vuln.fix?.status === 'loading' && (
                        <span style={{ fontSize: '12px', opacity: 0.6 }}>
                          <span className={styles.spinner}>⠋</span> Generating...
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {readyCount > 0 && (
                  <button 
                    onClick={applyAllFixes} 
                    className={styles.fixAllBtn} 
                    disabled={applyingAll}
                  >
                    {applyingAll ? 'Applying...' : `Apply All ${readyCount} Fixes`}
                  </button>
                )}

                {allProcessed && (
                  <button onClick={proceedToPhase3} className={styles.proceedBtn}>
                    Continue to Phase 3 - Protection →
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
