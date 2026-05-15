'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './Navbar.module.css'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        <div className={styles.left}>
            <Link href="/" className={styles.logo}>
              <div className={styles.logoIcon}>
                <svg width="24" height="24" viewBox="0 0 100 100">
                  <path 
                    d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z" 
                    fill="#800000" 
                    stroke="white" 
                    strokeWidth="4"
                  />
                </svg>
              </div>
              <span className={styles.logoText}>Aegis</span>
            </Link>
        </div>

        <div className={styles.right}>
          <ul className={styles.navLinks}>
            <li><Link href="/pricing">Pricing</Link></li>
            <li><Link href="/docs">Docs</Link></li>
            <li><Link href="/developer">Developer</Link></li>
          </ul>

          <Link href="/login" className={styles.btnGet}>
            Masuk / CLI
          </Link>
        </div>

      </div>
    </nav>
  )
}
