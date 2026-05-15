'use client'
import { motion } from 'framer-motion'
import { Award, Terminal, Brain, Shield, User } from 'lucide-react'
import styles from './TeamSection.module.css'

const TEAM = [
  {
    name: 'Deva',
    role: 'Technical & Security Support',
    achievements: [
      { text: 'Technical Support Bali Adventure Park', year: '2024' },
      { text: 'Security Support at Ultima Technologi Asia', year: '2025' },
      { text: 'AI Security Research with UNIMAS Sarawak', year: '2026' }
    ],
    color: '#ff0000'
  },
  {
    name: 'Defender',
    role: 'Threat Intelligence Analyst',
    achievements: [
      { text: 'Analyst at Police Headquarter RI', year: '2025' },
      { text: 'BSSN Vulnerability Finding Award', year: '2025' },
      { text: '3-Way Phishing Detection Research', year: 'Research' }
    ],
    color: '#ff0000'
  },
  {
    name: 'Gilang',
    role: 'AI Security Researcher',
    achievements: [
      { text: 'Analyst at Police Headquarter RI', year: '2025' },
      { text: 'AI Security Research with UNIMAS Sarawak', year: '2026' },
      { text: '3-Way Phishing Detection Research', year: '2026' }
    ],
    color: '#ff0000'
  }
]

export default function TeamSection() {
  const titleWords = "The Architects of Aegis".split(" ")

  return (
    <section id="team" className={styles.section}>
      <div className={styles.dotBg} />
      <div className="container">
        <div className={styles.header}>
          <div className={styles.label}>Core Contributors</div>
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
            A collective of security experts, researchers, and AI pioneers dedicated to the agent-first era.
          </p>
        </div>

        <div className={styles.grid}>
          {TEAM.map((member, idx) => (
            <motion.div 
              key={member.name} 
              className={styles.card}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.2 }}
              viewport={{ once: true }}
            >
              <div className={styles.imageSection}>
                <div className={styles.imagePlaceholder}>
                  <User size={64} className={styles.userIcon} />
                </div>
                <div className={styles.glow} />
              </div>
              
              <div className={styles.content}>
                <h3 className={member.name === 'Defender' ? styles.nameDefender : styles.name}>{member.name}</h3>
                <div className={styles.role}>{member.role}</div>
                
                <div className={styles.achievements}>
                  {member.achievements.map((item, i) => (
                    <div key={i} className={styles.achievementItem}>
                      <div className={styles.year}>[{item.year}]</div>
                      <div className={styles.text}>{item.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
