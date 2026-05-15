'use client'
import styles from './WhyAegisSection.module.css'
import { motion } from 'framer-motion'

import { ShieldAlert, Terminal, Landmark, Scale } from 'lucide-react'

const CARDS = [
  {
    title: 'Indonesia: #1 Country Vulnerability',
    desc: 'BSSN 2024 reports Indonesia as the top target for cyber anomalies. Our digital infrastructure faces unprecedented risks from global threat actors.',
    date: 'Jan 20, 2025',
    category: 'Market Risk',
    image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800&h=600'
  },
  {
    title: 'Systemic Developer Negligence',
    desc: 'Speed over security: Modern developer culture often ignores critical code safety, leaving fatal gaps that demand autonomous healing.',
    date: 'Dec 15, 2024',
    category: 'Internal Gap',
    image: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=800&h=600'
  },
  {
    title: 'Irreversible Financial Loss',
    desc: 'A single data breach now costs billions in recovery and trust. In the agent-first era, security failures lead to immediate economic collapse.',
    date: 'Nov 22, 2024',
    category: 'Financial Impact',
    image: 'https://images.unsplash.com/photo-1611974714024-4607a55d46ed?auto=format&fit=crop&q=80&w=800&h=600'
  },
  {
    title: 'Government & Legal Compliance',
    desc: 'With UU PDP 2024 in full effect, data leaks are now criminal offenses. Organizations must comply or face heavy global revenue penalties.',
    date: 'Oct 17, 2024',
    category: 'Compliance',
    image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800&h=600'
  }
]

export default function WhyAegisSection() {
  return (
    <section id="why" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}><b>The Security Crisis</b></h2>
          <button className={styles.viewBlog}>View Analysis</button>
        </div>

        <div className={styles.grid}>
          {CARDS.map((card, i) => (
            <motion.div 
              key={i} 
              className={styles.card}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: i * 0.15 }}
              viewport={{ once: true }}
            >
              <div className={styles.cardVisual}>
                 <div className={styles.dotsOverlay} />
                 <img src={card.image} alt={card.title} className={styles.cardImage} />
                 <div className={styles.cardTag}>{card.category}</div>
              </div>
              <div className={styles.cardContent}>
                 <h3 className={styles.cardTitle}>{card.title}</h3>
                 <p className={styles.cardDesc}>{card.desc}</p>
                 <div className={styles.cardMeta}>
                    <span>{card.date}</span>
                    <span className={styles.separator}>•</span>
                    <span>{card.category}</span>
                 </div>
                 <button className={styles.readMore}>Read analysis <span>→</span></button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
