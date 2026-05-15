'use client'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import styles from './Users.module.css'

const users = [
  {
    role: "Developer",
    title: "Secure Code, Instantly",
    desc: "Aegis sits inside your terminal and IDE. It scans your code in real-time, providing surgical fixes before you even commit.",
    usage: "Use Case: Automated security audits during the development lifecycle."
  },
  {
    role: "Security",
    title: "Autonomous Healing",
    desc: "Transform your security posture with AI agents that remediate vulnerabilities automatically, reducing triage time to zero.",
    usage: "Use Case: Real-time autonomous patching for mission-critical infrastructure."
  },
  {
    role: "Professional",
    title: "Deliver with Confidence",
    desc: "Prove the integrity of your work with automated security logs and pre-hardened source code for every project.",
    usage: "Use Case: Ensuring client deliverables meet global security standards."
  },
  {
    role: "QA",
    title: "Vulnerability Verification",
    desc: "Simulate attacks and verify remediation effectiveness in a controlled, isolated sandbox environment.",
    usage: "Use Case: Integrating security regression testing into standard QA pipelines."
  },
  {
    role: "Enterprise",
    title: "Security at Scale",
    desc: "Unified security intelligence and automated patching across thousands of microservices and distributed teams.",
    usage: "Use Case: Standardizing global security compliance via automated orchestration."
  },
  {
    role: "Everyone",
    title: "Universal Protection",
    desc: "Because everyone deserves secure code. Protect your personal side projects with the same engine used by enterprises.",
    usage: "Use Case: Defending open-source projects from common automated exploits."
  }
]

export default function UsersPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  // Auto-cycle for the header text
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % users.length)
    }, 15000)
    return () => clearInterval(timer)
  }, [])

  return (
    <main className={styles.page}>
      <Navbar />
      
      <div className={styles.scrollContainer} ref={containerRef}>
        {/* Intro */}
        <section className={styles.section}>
          <div className={styles.hero}>
            <h1 className={styles.heroTitle}>
              {"Aegis is built for...".split("").map((char, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.5, 
                    delay: i * 0.05,
                    ease: [0.16, 1, 0.3, 1]
                  }}
                  style={{ display: "inline-block", whiteSpace: char === " " ? "pre" : "normal" }}
                >
                  {char}
                </motion.span>
              ))}
            </h1>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className={styles.scrollIndicator}
            >
              <span className={styles.scrollText}>Scroll</span>
              <div className={styles.mouse}>
                <motion.div 
                  animate={{ y: [0, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className={styles.mouseWheel}
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* User Scenarios */}
        {users.map((user, i) => (
          <section key={i} className={styles.section}>
            <div className={`${styles.userContent} ${i === users.length - 1 ? styles.lastContent : ''}`}>
              <div className={styles.roleWrapper}>
                <motion.h2 
                  className={styles.massiveRole}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                >
                  {user.role}
                </motion.h2>
              </div>
              
              <div className={styles.info}>
                <motion.h3 
                  className={styles.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {user.title}
                </motion.h3>
                <motion.p 
                  className={styles.desc}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {user.desc}
                </motion.p>
              </div>
            </div>

            {/* Append Footer to the last persona section */}
            {i === users.length - 1 && (
              <div className={styles.footerWrapper}>
                <Footer />
              </div>
            )}
          </section>
        ))}
      </div>

      <div className={styles.progressRail}>
        {Array.from({ length: users.length + 1 }).map((_, i) => (
          <div key={i} className={styles.dot} />
        ))}
      </div>
    </main>
  )
}
