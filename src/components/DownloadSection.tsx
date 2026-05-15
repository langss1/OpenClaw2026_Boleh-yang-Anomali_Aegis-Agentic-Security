import styles from './DownloadSection.module.css'
import { motion } from 'framer-motion'
import { Terminal, BookOpen } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function DownloadSection() {
  const [mounted, setMounted] = useState(false)
  const particles = Array.from({ length: 20 })

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.card}>
          {/* Sparkle/Fire Particles Effect */}
          <div className={styles.particlesLayer}>
            {mounted && particles.map((_, i) => (
              <motion.div
                key={i}
                className={styles.particle}
                initial={{ 
                  x: Math.random() * 100 + "%", 
                  y: "100%", 
                  opacity: 0,
                  scale: Math.random() * 0.5 + 0.5
                }}
                animate={{ 
                  y: "-10%", 
                  opacity: [0, 1, 0],
                  x: (Math.random() * 100 - 10) + "%"
                }}
                transition={{ 
                  duration: Math.random() * 3 + 2, 
                  repeat: Infinity, 
                  delay: Math.random() * 5,
                  ease: "linear"
                }}
              />
            ))}
          </div>

          <div className={styles.content}>
            <motion.h2 
              className={styles.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              Download Aegis in CLI
            </motion.h2>
            
            <motion.div 
              className={styles.actions}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              viewport={{ once: true }}
            >
              <button className={styles.btnPrimary}>
                <Terminal size={18} />
                Get Aegis
              </button>
              <button className={styles.btnSecondary}>
                <BookOpen size={18} />
                Documentation
              </button>
            </motion.div>
          </div>

          {/* Red Gradient Glows */}
          <div className={styles.glowTop} />
          <div className={styles.glowBottom} />
        </div>
      </div>
    </section>
  )
}
