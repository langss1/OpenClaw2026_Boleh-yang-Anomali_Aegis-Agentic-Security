'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './CTASection.module.css'
import { motion } from 'framer-motion'
import { Mail, ArrowRight, ShieldCheck, Globe, Code2, Zap, Heart, Bot, CheckCircle2 } from 'lucide-react'

export default function CTASection() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const router = useRouter()
  const titleWords = "Build More Secure, Ship More Confident.".split(" ")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setSubmitted(true)
      setTimeout(() => {
        router.push('/login')
      }, 1500)
    }
  }

  return (
    <section id="cta" className={styles.section}>
      <div className={styles.dotBg} />
      <div className={styles.bgGlow} />

      <div className="container">
        <div className={styles.wrapper}>
          <div className={styles.content}>
            <div className={styles.badge}>
              <span className={styles.badgeDot} />
              Coming Soon · Join Waitlist
            </div>

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

            <p className={styles.desc}>
              Be among the first to experience AEGIS. Gain early access, priority onboarding, 
              and exclusive founder-level status. The future of autonomous security starts here.
            </p>

            <div className={styles.miniStats}>
              {[
                { val: '500+', label: 'Waitlist' },
                { val: 'Free', label: 'Open Source' },
                { val: 'Beta', label: 'Q3 2025' },
              ].map((s) => (
                <div key={s.label} className={styles.miniStat}>
                  <span className={styles.miniVal}>{s.val}</span>
                  <span className={styles.miniLabel}>{s.label}</span>
                </div>
              ))}
            </div>

            {!submitted ? (
              <motion.form 
                onSubmit={handleSubmit} 
                className={styles.form}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                viewport={{ once: true }}
              >
                <div className={styles.inputWrap}>
                  <Mail className={styles.inputIcon} size={18} />
                  <input
                    id="cta-email-input"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>
                <button type="submit" className={styles.submitBtn}>
                  Try Now — It's Free
                  <ArrowRight size={18} />
                </button>
              </motion.form>
            ) : (
              <motion.div 
                className={styles.successMsg}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <CheckCircle2 color="#ff0000" size={32} />
                <div>
                  <div className={styles.successTitle}>You&apos;re on the list!</div>
                  <div className={styles.successDesc}>Redirecting to dashboard...</div>
                </div>
              </motion.div>
            )}

            <div className={styles.trust}>
              <ShieldCheck size={14} color="#ff0000" />
              No spam. No credit card. Open-source first.
            </div>
          </div>
        </div>

        <div className={styles.featureStrip}>
          {[
            { Icon: Code2, text: 'Open Source' },
            { Icon: Heart, text: 'Made in Indonesia' },
            { Icon: Bot, text: 'AI-Powered' },
            { Icon: Zap, text: 'Real-time Analysis' },
            { Icon: ShieldCheck, text: 'UU PDP Compliant' },
            { Icon: Globe, text: 'Global Reach' },
          ].map((f, i) => (
            <motion.div 
              key={f.text} 
              className={styles.featureItem}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <f.Icon size={16} color="#ff0000" />
              <span>{f.text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
