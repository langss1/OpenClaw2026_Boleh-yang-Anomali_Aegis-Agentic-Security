'use client'
import { useState } from 'react'
import styles from './ForWhoSection.module.css'
import { motion } from 'framer-motion'
import { Code2, Building2, Terminal, ShieldCheck, Zap, Activity } from 'lucide-react'

const AUDIENCES = [
  {
    id: 'developer',
    Icon: Code2,
    role: 'Individual Developer',
    tagline: 'Code more, worry less',
    headline: 'Focus on Features, Not Vulnerabilities',
    desc: 'AEGIS integrates directly into your local workflow. Scan, patch, and simulate attacks with a single command — no context switching required.',
    features: ['Auto-Heal SAST', 'Local DAST Simulation', 'Terminal-First UX'],
    color: '#ff0000',
  },
  {
    id: 'enterprise',
    Icon: Building2,
    role: 'Enterprise Teams',
    tagline: 'Ship fast, stay secure',
    headline: 'Autonomous Security for Modern Teams',
    desc: 'Centralized governance with decentralized execution. Empower your entire engineering org with automated compliance and real-time monitoring.',
    features: ['Team Dashboard', 'Telegram Alerts', 'Compliance Export'],
    color: '#ff0000',
  }
]

export default function ForWhoSection() {
  const [active, setActive] = useState('developer')
  const current = AUDIENCES.find(a => a.id === active)!
  const titleWords = "AEGIS untuk Siapa Saja".split(" ")

  return (
    <section id="for-who" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.label}>Built For Everyone</div>
          <h2 className={styles.title}>
            {titleWords.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ 
                  type: 'spring',
                  stiffness: 70,
                  damping: 20,
                  delay: i * 0.2,
                }}
                viewport={{ once: true }}
                style={{ display: 'inline-block', marginRight: '0.25em' }}
              >
                {word}
              </motion.span>
            ))}
          </h2>
          <p className={styles.subtitle}>
            Empowering every stakeholder in the software ecosystem with autonomous, relentless security agents.
          </p>
        </div>

        <div className={styles.tabs}>
          {AUDIENCES.map((a) => (
            <button
              key={a.id}
              className={`${styles.tab} ${active === a.id ? styles.tabActive : ''}`}
              onClick={() => setActive(a.id)}
            >
              <a.Icon size={18} />
              <span>{a.role}</span>
            </button>
          ))}
        </div>

        <div className={styles.panel} key={active}>
          <motion.div 
            className={styles.panelLeft}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className={styles.panelTagline}>{current.tagline}</div>
            <h3 className={styles.panelTitle}>{current.headline}</h3>
            <p className={styles.panelDesc}>{current.desc}</p>
            
            <div className={styles.featuresGrid}>
              {current.features.map((f, i) => (
                <div key={i} className={styles.featureItem}>
                  <Zap size={14} className={styles.featureIcon} />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div 
            className={styles.panelRight}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <div className={styles.visualCard}>
              <div className={styles.cardGlow} />
              <div className={styles.cardHeader}>
                <current.Icon size={32} color="#ff0000" />
                <span className={styles.cardRoleName}>{current.role}</span>
              </div>
              <div className={styles.cardMetrics}>
                 <div className={styles.metricRow}><Terminal size={14}/> <span>SAST Analysis</span> <div className={styles.statusDot} /></div>
                 <div className={styles.metricRow}><ShieldCheck size={14}/> <span>DAST Simulation</span> <div className={styles.statusDot} /></div>
                 <div className={styles.metricRow}><Activity size={14}/> <span>Real-time Monitoring</span> <div className={styles.statusDot} /></div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}