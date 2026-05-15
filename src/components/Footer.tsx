import styles from './Footer.module.css'
import { motion } from 'framer-motion'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.brandContainer}>
          <motion.div 
            className={styles.massiveLogo}
            animate={{ 
              scale: [1, 1.05, 1],
              rotate: [0, 2, -2, 0],
              opacity: [0.8, 1, 0.8]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          >
            <svg width="100%" height="100%" viewBox="0 0 100 100">
              <path 
                d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z" 
                fill="#800000" 
                stroke="white" 
                strokeWidth="4"
              />
            </svg>
          </motion.div>
          <h1 className={styles.brandText}>Aegis</h1>
        </div>
        
        <div className={styles.bottomBar}>
          <div className={styles.links}>
            <a href="#">About Aegis</a>
            <a href="#">Documentation</a>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

