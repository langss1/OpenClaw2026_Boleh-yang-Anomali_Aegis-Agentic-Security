import styles from './FeaturesSection.module.css'
import { motion } from 'framer-motion'

export default function DevelopmentSection() {
  return (
    <section id="development" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.content}>
          <motion.h2 
            className={styles.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Aegis Development
          </motion.h2>

          <motion.p 
            className={styles.description}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            viewport={{ once: true }}
          >
            Build your entire infrastructure from scratch with a security-first mindset. 
            Aegis agents generate secure-by-default boilerplate and architecture 
            blueprints, ensuring that every line of code is protected from day zero.
          </motion.p>
        </div>

        <motion.div 
          className={styles.visual}
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true }}
        >
          <div className={styles.videoWrapper}>
             <div className={styles.videoGlow} />
             <iframe 
                width="100%" 
                height="100%" 
                src="https://www.youtube.com/embed/dQw4w9QwXcQ?autoplay=1&mute=1&controls=0&loop=1&playlist=dQw4w9QwXcQ" 
                title="Aegis Development Demo" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
                className={styles.iframe}
              ></iframe>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
