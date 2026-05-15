'use client'
import { useState, useEffect, useRef } from 'react'
import styles from './DemoSection.module.css'

export default function DemoSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [scale, setScale] = useState(0.8)

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return
      const rect = sectionRef.current.getBoundingClientRect()
      const windowHeight = window.innerHeight
      
      // Calculate how much of the section is visible
      const visiblePct = Math.min(Math.max((windowHeight - rect.top) / (windowHeight * 0.8), 0), 1)
      
      // Scale from 0.8 to 1.0
      setScale(0.8 + (visiblePct * 0.2))
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Initial check
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <section ref={sectionRef} id="demo" className={styles.section}>
      <div 
        className={styles.videoWrapper} 
        style={{ 
            transform: `scale(${scale})`,
            opacity: Math.min(scale * 1.5 - 0.5, 1)
        }}
      >
        <div className={styles.videoContent}>
          <iframe 
            width="100%" 
            height="100%" 
            src="https://www.youtube.com/embed/dQw4w9QwXcQ?autoplay=1&mute=1&controls=0&loop=1&playlist=dQw4w9QwXcQ" 
            title="Aegis Demo" 
            frameBorder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen
            style={{ borderRadius: '12px', boxShadow: '0 20px 50px rgba(255, 0, 0, 0.3)' }}
          ></iframe>
        </div>
      </div>
    </section>
  )
}
