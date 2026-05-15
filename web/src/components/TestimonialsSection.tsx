'use client'
import { useEffect, useRef } from 'react'
import styles from './TestimonialsSection.module.css'

const TESTIMONIALS = [
  {
    name: 'Dr. Budi Santoso',
    role: 'Cybersecurity Expert',
    avatar: '👨‍🏫',
    quote: 'AEGIS mengubah cara belajar security menjadi jauh lebih praktis dan efisien.',
    tag: 'Akademisi',
    color: '#f97316',
  },
  {
    name: 'Agus Wijaya',
    role: 'Security Lead',
    avatar: '🔐',
    quote: 'Coverage audit kami naik 4x lipat sejak mengadopsi sistem otonom AEGIS.',
    tag: 'Security Pro',
    color: '#a855f7',
  },
  {
    name: 'Dian Permadi',
    role: 'CTO',
    avatar: '🚀',
    quote: 'Compliance security kini bukan lagi masalah besar bagi startup kami.',
    tag: 'Startup',
    color: '#22c55e',
  },
]

import { motion } from 'framer-motion'
import { User, Quote } from 'lucide-react'

export default function TestimonialsSection() {
  const trackRef = useRef<HTMLDivElement>(null)
  const titleWords = "Dipercaya oleh Mereka yang Peduli".split(" ")

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let pos = 0
    let animId: number
    const speed = 0.4

    function animate() {
      pos += speed
      if (pos >= track!.scrollWidth / 2) pos = 0
      track!.style.transform = `translateX(-${pos}px)`
      animId = requestAnimationFrame(animate)
    }

    animId = requestAnimationFrame(animate)

    const pause = () => cancelAnimationFrame(animId)
    const resume = () => { animId = requestAnimationFrame(animate) }

    track.addEventListener('mouseenter', pause)
    track.addEventListener('mouseleave', resume)

    return () => {
      cancelAnimationFrame(animId)
      track.removeEventListener('mouseenter', pause)
      track.removeEventListener('mouseleave', resume)
    }
  }, [])

  return (
    <section id="testimonials" className={styles.section}>
      <div className={styles.dotBg} />
      <div className="container">
        <div className={styles.header}>
          <div className={styles.label}>What They Say</div>
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
        </div>
      </div>

      <div className={styles.carouselWrapper}>
        <div className={styles.fadeLeft} />
        <div className={styles.fadeRight} />
        <div className={styles.track} ref={trackRef}>
          {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
            <motion.div 
              key={i} 
              className={styles.card}
              whileHover={{ y: -10, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <Quote className={styles.quoteIcon} size={40} />
              <div className={styles.cardHeader}>
                <div className={styles.avatarWrap} style={{ borderColor: `${t.color}40` }}>
                  <User size={20} color={t.color} />
                  <div className={styles.avatarGlow} style={{ backgroundColor: t.color }} />
                </div>
                <div>
                  <div className={styles.name}>{t.name}</div>
                  <div className={styles.role}>{t.role}</div>
                </div>
              </div>
              <p className={styles.quote}>"{t.quote}"</p>
              <div className={styles.tag} style={{ color: t.color, borderColor: `${t.color}30`, background: `${t.color}10` }}>
                {t.tag}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
