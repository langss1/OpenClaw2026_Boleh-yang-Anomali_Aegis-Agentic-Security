import styles from './SecurityOnCodeSection.module.css'
import { motion } from 'framer-motion'
import { Terminal, Cpu, Zap, Brain } from 'lucide-react'

export default function SecurityOnCodeSection() {
  const features = [
    {
      icon: <Terminal size={24} />,
      title: "Run directly in terminal",
      desc: "Instant execution directly from your CLI environment."
    },
    {
      icon: <Cpu size={24} />,
      title: "Personalized AI models",
      desc: "Tailored AI models that learn from your project's unique structure."
    },
    {
      icon: <Zap size={24} />,
      title: "Easy to use",
      desc: "Zero-config setup to get you secured in seconds."
    },
    {
      icon: <Brain size={24} />,
      title: "Smart",
      desc: "Deep context understanding for highly accurate security insights."
    }
  ]

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <motion.div 
          className={styles.header}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className={styles.title}>Everything on your IDE!</h2>
          <p className={styles.subtitle}>Empowering developers with autonomous security agents that live where you code.</p>
        </motion.div>

        <div className={styles.grid}>
          {features.map((item, idx) => (
            <motion.div 
              key={idx}
              className={styles.card}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
            >
              <div className={styles.iconWrapper}>{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
