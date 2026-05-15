'use client'
import styles from './IconRibbonSection.module.css'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { 
  Shield, Search, Sparkles, Lock, Terminal, Code, 
  Cpu, Activity, Globe, Zap, Fingerprint, Bug,
  ShieldCheck, Database, Server, Radio
} from 'lucide-react'
import { useRef } from 'react'

const ICON_COMPONENTS = [
  Shield, Search, Sparkles, Lock, Terminal, Code, 
  Cpu, Activity, Globe, Zap, Fingerprint, Bug,
  ShieldCheck, Database, Server, Radio,
  Shield, Search, Sparkles, Lock, Terminal, Code // Duplicates for width
]

export default function IconRibbonSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  })

  // Smooth out the scroll progress - ultra smooth for a 'floaty' feel
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 30, // Very low stiffness for slow reaction
    damping: 40,   // High damping for no bounce
    restDelta: 0.001
  })

  // Horizontal movement using smoothed progress - very short distance for slow movement
  const xTranslate = useTransform(smoothProgress, [0, 1], [0, -400])

  const fullText = "Aegis is an autonomous ecosystem of security and QA testing agents, built for the relentless demands of modern software engineering. We provide developers with intelligent agents that not only detect and heal vulnerabilities but also automate complex QA testing cycles, ensuring your code is both secure and production-ready at all times."

  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.scrollWrapper}>
        <motion.div 
          className={styles.ribbonRow}
          style={{ x: xTranslate }}
        >
          {ICON_COMPONENTS.map((Icon, i) => {
            // Wave movement (sine) based on index and scroll
            const yOffset = Math.sin(i * 0.8) * 40
            
            return (
              <div 
                key={i} 
                className={styles.iconCircle}
                style={{ transform: `translateY(${yOffset.toFixed(4)}px)` }}
              >
                <Icon size={24} strokeWidth={1.5} color="rgba(255, 0, 0, 0.8)" />
              </div>
            )
          })}
        </motion.div>
      </div>

      <div className={styles.textContainer}>
        <motion.h2 
          className={styles.titleText}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 2.0, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true }}
        >
          What is Aegis?
        </motion.h2>
        <motion.p 
          className={styles.paragraphText}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 2.0, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          viewport={{ once: true }}
        >
          {fullText}
        </motion.p>
      </div>
    </section>
  )
}
