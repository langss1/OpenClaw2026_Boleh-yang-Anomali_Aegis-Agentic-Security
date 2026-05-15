'use client'
import { motion } from 'framer-motion'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import styles from './Docs.module.css'
import { useState } from 'react'

const sections = [
  {
    id: "help-system",
    title: "The Help System",
    cmd: "aegis help",
    content: (
      <>
        <p>The help command is the entry point for understanding the Aegis ecosystem. It provides a real-time overview of available autonomous security operations, shell integrations, and AI configurations.</p>
        <div className={styles.terminalBox}>
          <pre>
{`bantuan_sistem
perintah utama:
  scan        jalankan pemetaan struktur & arsitektur proyek
  code        jalankan audit kode (SAST) & perbaikan AI
  ...`}
          </pre>
        </div>
      </>
    )
  },
  {
    id: "scan",
    title: "Architecture Scan",
    cmd: "aegis scan",
    content: (
      <>
        <p>The scan command initiates Phase 0 of the Aegis pipeline. It performs a deep recursive traversal of the project directory to build a semantic map of the application.</p>
        <ul>
          <li><strong>Dependency Analysis:</strong> Parses <code>package.json</code> and manifest files.</li>
          <li><strong>Architecture Report:</strong> Generates <code>AEGIS_INGESTION_REPORT.md</code>.</li>
        </ul>
      </>
    )
  },
  {
    id: "code",
    title: "Security Audit (SAST)",
    cmd: "aegis code",
    content: (
      <>
        <p>This command executes Phase 1: searching for vulnerabilities in the source code and offering surgical AI repairs.</p>
        <ul>
          <li><strong>Vulnerability Probing:</strong> Scans for hardcoded secrets and SQL injection.</li>
          <li><strong>Interactive Patching:</strong> Presents discovered issues with "Before & After" diffs.</li>
        </ul>
      </>
    )
  },
  {
    id: "monitor",
    title: "Runtime Monitor",
    cmd: "aegis monitor",
    content: (
      <>
        <p>[COMING SOON] The monitor command will handle Phase 2 and 3 of the security lifecycle, analyzing the application in its running state.</p>
      </>
    )
  },
  {
    id: "undo",
    title: "State Recovery",
    cmd: "aegis undo",
    content: (
      <>
        <p>The undo command provides a failsafe mechanism, restoring the project to its original, pre-remediation state using <code>.bak</code> files.</p>
      </>
    )
  },
  {
    id: "models",
    title: "Intelligence Cores",
    cmd: "aegis models",
    content: (
      <>
        <p>Switch between different AI "brains" (Aegis Core, Ollama, Custom) depending on your privacy and performance needs.</p>
      </>
    )
  },
  {
    id: "tanya",
    title: "AI Assistant",
    cmd: "aegis tanya <text>",
    content: (
      <>
        <p>The tanya command allows you to communicate directly with the active AI core about project-specific security questions.</p>
      </>
    )
  }
]

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState("help-system")

  return (
    <main className={styles.page}>
      <Navbar />
      
      <div className={styles.container}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.vTag}>v2.3.0</span>
            <h3>CLI Guide</h3>
          </div>
          <nav className={styles.nav}>
            {sections.map((s) => (
              <button 
                key={s.id}
                className={`${styles.navLink} ${activeTab === s.id ? styles.active : ''}`}
                onClick={() => {
                  setActiveTab(s.id)
                  document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }}
              >
                {s.title}
              </button>
            ))}
          </nav>
        </aside>

        <div className={styles.content}>
          <div className={styles.headerArea}>
            <h1 className={styles.mainTitle}>Aegis CLI <span className={styles.red}>Documentation</span></h1>
            <p className={styles.mainDesc}>The comprehensive technical guide for the Aegis Autonomous Security Engine.</p>
          </div>

          {sections.map((s) => (
            <motion.section 
              key={s.id} 
              id={s.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-20% 0px -20% 0px" }}
              onViewportEnter={() => setActiveTab(s.id)}
              className={styles.section}
            >
              <h2 className={styles.sectionTitle}>{s.title}</h2>
              <div className={styles.commandTag}>{s.cmd}</div>
              <div className={styles.sectionBody}>{s.content}</div>
            </motion.section>
          ))}
        </div>
      </div>

      <Footer />
    </main>
  )
}
