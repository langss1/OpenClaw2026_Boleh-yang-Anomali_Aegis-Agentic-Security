'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import styles from './Developer.module.css'

const contributors = [
  {
    name: "Gilang Wasis",
    role: "Co-founder of Aegis",
    bio: "Developing, Researcher, Engineer, and Founder of Aegis.",
    links: [
      { type: "github", url: "https://github.com" },
      { type: "linkedin", url: "https://linkedin.com" }
    ]
  },
  {
    name: "Gde Radeva",
    role: "Co-founder of Aegis",
    bio: "Researcher, Operation, and Founder of Aegis.",
    links: [
      { type: "github", url: "https://github.com" },
      { type: "linkedin", url: "https://linkedin.com" }
    ]
  },
  {
    name: "Defender",
    role: "Co-founder of Aegis",
    bio: "Developing, Researcher, Operation, and Founder of Aegis.",
    links: [
      { type: "github", url: "https://github.com" },
      { type: "linkedin", url: "https://linkedin.com" }
    ]
  }
]

const Icons = {
  github: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
    </svg>
  ),
  linkedin: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
      <rect x="2" y="9" width="4" height="12"></rect>
      <circle cx="4" cy="4" r="2"></circle>
    </svg>
  )
}

export default function DeveloperPage() {
  return (
    <main className={styles.page}>
      <Navbar />
      
      <div className={styles.container}>
        <div className={styles.intro}>
          <h1 className={styles.title}>The Minds Behind Aegis</h1>
          <p className={styles.desc}>
            Meet the founders and researchers dedicated to building a safer, autonomous future.
          </p>
        </div>

        <div className={styles.horizontalScroll}>
          <div className={styles.track}>
            {contributors.map((person, i) => (
              <motion.div 
                key={i} 
                className={styles.card}
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1, duration: 0.8 }}
              >
                <div className={styles.cardHeader}>
                  <h2 className={styles.name}>{person.name}</h2>
                  <span className={styles.role}>{person.role}</span>
                </div>
                
                <p className={styles.bio}>{person.bio}</p>
                
                <div className={styles.linksBox}>
                  {person.links.map((link, j) => (
                    <Link key={j} href={link.url} target="_blank" className={styles.socialLink} title={link.type}>
                      {Icons[link.type as keyof typeof Icons]}
                    </Link>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
