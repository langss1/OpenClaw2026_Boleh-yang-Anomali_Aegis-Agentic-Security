'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './HeroSection.module.css'
import nextDynamic from 'next/dynamic'
import { motion } from 'framer-motion'

const ParticleField = nextDynamic(() => import('./ParticleField'), { ssr: false })

export default function HeroSection({ onComplete }: { onComplete: () => void }) {
  const [isRevealed, setIsRevealed] = useState(true)
  const [showGradient, setShowGradient] = useState(true)
  const fullText = 'Build Fast, Secure More!'
  const words = fullText.split(' ')

  useEffect(() => {
    // Reveal content and trigger final gradient animation immediately
    onComplete()
  }, [onComplete])

  return (
    <section className={styles.hero}>
      <ParticleField />
      <div className={styles.containerCentered}>
        <div className={styles.contentCentered}>
          <h1 className={`${styles.headlineCentered} ${showGradient ? styles.animateGradient : ''}`}>
            {words.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  type: 'spring',
                  stiffness: 70,
                  damping: 20,
                  delay: i * 0.5,
                  mass: 1
                }}
                style={{ display: 'inline-block', marginRight: '0.25em' }}
              >
                {word}
              </motion.span>
            ))}
          </h1>

          <div className={`${styles.revealContent} ${isRevealed ? styles.visible : ''}`}>
            <p className={styles.subtextCentered}>
              {"Empowering teams with autonomous security agents and relentless QA testing intelligence.".split(" ").map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.5,
                    delay: 3.0 + (i * 0.1) 
                  }}
                  style={{ display: 'inline-block', marginRight: '0.25em' }}
                >
                  {word}
                </motion.span>
              ))}
            </p>

            <motion.div 
              className={styles.actionsCentered}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 5.0, duration: 0.8 }}
            >
              <Link href="/login" className="btn-primary-large">
                 Get Software
              </Link>
              <button 
                className="btn-outline-large" 
                onClick={() => window.scrollTo({top: 800, behavior: 'smooth'})}
              >
                Documentation & Features
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
