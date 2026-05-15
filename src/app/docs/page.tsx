'use client'
import { useState, useEffect } from 'react'
import styles from './Docs.module.css'
import Navbar from '@/components/Navbar'
import { motion } from 'framer-motion'
import { Book, Shield, Terminal, Zap, Code, Search, Cpu, Lock, Activity, Command } from 'lucide-react'

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('introduction')

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
      setActiveSection(id)
    }
  }

  // Handle active section based on scroll position
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { threshold: 0.5 }
    )

    const sections = document.querySelectorAll('section[id]')
    sections.forEach((section) => observer.observe(section))

    return () => {
      sections.forEach((section) => observer.unobserve(section))
    }
  }, [])

  const navGroups = [
    {
      title: "Documentation",
      items: [
        { name: "Introduction", id: "introduction" },
        { name: "Quickstart", id: "quickstart" },
        { name: "Architecture", id: "architecture" },
      ]
    },
    {
      title: "Capabilities",
      items: [
        { name: "Security Scan", id: "security-scan" },
        { name: "AI Ask", id: "ai-ask" },
        { name: "Autopilot", id: "autopilot" },
        { name: "Threat Detection", id: "threat-detection" },
      ]
    },
    {
      title: "API Reference",
      items: [
        { name: "Authentication", id: "authentication" },
        { name: "Endpoints", id: "endpoints" },
        { name: "Examples", id: "examples" },
      ]
    },
    {
      title: "Support",
      items: [
        { name: "Status", id: "status" },
        { name: "FAQ", id: "faq" },
      ]
    }
  ]

  return (
    <main className={styles.main}>
      <Navbar />
      
      <div className={styles.container}>
        {/* LEFT SIDEBAR */}
        <aside className={styles.sidebar}>
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className={styles.sidebarSection}>
              <h3 className={styles.sectionTitle}>{group.title}</h3>
              <ul className={styles.navList}>
                {group.items.map((item, iIdx) => (
                  <li 
                    key={iIdx} 
                    className={`${styles.navItem} ${activeSection === item.id ? styles.active : ''}`}
                    onClick={() => scrollToSection(item.id)}
                  >
                    {activeSection === item.id && (
                      <motion.div 
                        layoutId="activeSidebarIndicator"
                        className={styles.activeIndicator}
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <span className={styles.navText}>{item.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        {/* MAIN CONTENT AREA */}
        <article className={styles.content}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className={styles.breadcrumb}>Documentation / {activeSection.replace('-', ' ')}</span>
            <h1 className={styles.title}>Aegis <span>Documentation</span></h1>
            
            <p className={styles.lead}>
              The comprehensive technical guide for the Aegis Autonomous Security Engine. 
              Dirancang untuk melindungi, menganalisis, dan memperbaiki kode Anda secara otomatis.
            </p>

            <section id="introduction">
              <h2>Introduction</h2>
              <p>
                AEGIS adalah ekosistem keamanan otonom tingkat profesional yang memanfaatkan model 
                kecerdasan buatan tingkat lanjut (Gemini 1.5 Pro) untuk memberikan perlindungan real-time 
                pada codebase Anda.
              </p>
              
              <div className={styles.card}>
                <h3><Zap size={20} className="text-red-600" /> Visi AEGIS</h3>
                <p>
                  Menciptakan lingkungan pengembangan yang aman tanpa hambatan, di mana AI bekerja sebagai 
                  pakar keamanan yang selalu aktif memantau setiap baris kode Anda.
                </p>
              </div>
            </section>

            <section id="quickstart">
              <h2>Quickstart</h2>
              <p>
                Mulailah dengan Aegis dalam hitungan detik. Pastikan Anda memiliki Node.js terinstal, 
                lalu jalankan perintah inisialisasi di bawah ini untuk mengonfigurasi lingkungan keamanan Anda.
              </p>
              <div className={styles.codeBlock}>
                <code>npm install @aegis-security/core</code>
              </div>
            </section>

            <section id="architecture">
              <h2>Architecture</h2>
              <p>
                AEGIS dirancang dengan arsitektur modular yang terdiri dari Scanner, Healer, dan CLI Interface. 
                Semua komponen berkomunikasi secara aman melalui AI Engine pusat.
              </p>
            </section>

            <section id="security-scan">
              <h2>Security Scan</h2>
              <p>
                Fitur pemindaian keamanan AEGIS menganalisis kode Anda terhadap kerentanan OWASP Top 10 secara otomatis.
              </p>
            </section>

            <section id="ai-ask">
              <h2>AI Ask</h2>
              <p>
                Tanyakan pertanyaan tentang basis kode Anda langsung di terminal dan dapatkan jawaban berbasis konteks.
              </p>
            </section>

            <section id="key-features">
              <h2>Key Features</h2>
              <p>
                Sistem ini mengintegrasikan berbagai modul keamanan yang bekerja secara sinergis:
              </p>
              <ul>
                <li><strong>AI-Driven Analysis:</strong> Analisis kerentanan mendalam berbasis konteks.</li>
                <li><strong>Autonomous Fix:</strong> Penambalan otomatis untuk celah keamanan yang terdeteksi.</li>
                <li><strong>Interactive CLI:</strong> Kontrol penuh sistem melalui antarmuka terminal yang intuitif.</li>
              </ul>
            </section>

            <section id="the-help-system">
              <h2>The Help System</h2>
              <div className={styles.codeBlock}>
                <code>aegis --help</code>
              </div>
              <p>
                Gunakan perintah bantuan untuk melihat semua kemampuan sistem yang tersedia.
              </p>
            </section>

            <section id="how-it-works">
              <h2>Cara Kerja</h2>
              <p>
                Mulai amankan proyek Anda dengan perintah inisialisasi berikut:
              </p>
              <div className={styles.codeBlock}>
                <pre><code>{`# Jalankan inisialisasi AEGIS
node src/cli/main.js setup

# Mulai tanya pakar keamanan
node src/cli/main.js Ask`}</code></pre>
              </div>
            </section>

            {/* Additional placeholder sections */}
            <section id="autopilot"><h2>Autopilot</h2><p>Remediasi otomatis tanpa campur tangan manusia.</p></section>
            <section id="threat-detection"><h2>Threat Detection</h2><p>Deteksi ancaman real-time pada lingkungan produksi.</p></section>
            <section id="authentication"><h2>Authentication</h2><p>Panduan autentikasi API AEGIS.</p></section>
            <section id="endpoints"><h2>Endpoints</h2><p>Daftar lengkap endpoint API yang tersedia.</p></section>
            <section id="examples"><h2>Examples</h2><p>Contoh penggunaan di berbagai skenario.</p></section>
            <section id="status"><h2>Status</h2><p>Status operasional sistem AEGIS.</p></section>
            <section id="faq"><h2>FAQ</h2><p>Pertanyaan yang sering diajukan oleh pengguna.</p></section>

          </motion.div>
        </article>

        {/* RIGHT TOC SIDEBAR */}
        <aside className={styles.toc}>
          <h4 className={styles.tocTitle}>On this page</h4>
          <ul className={styles.tocList}>
            {groupItemsForToc(activeSection).map((item, idx) => (
              <li 
                key={idx} 
                className={`${styles.tocItem} ${activeSection === item.id ? styles.active : ''}`}
                onClick={() => scrollToSection(item.id)}
              >
                {activeSection === item.id && (
                  <motion.div 
                    layoutId="activeTocIndicator"
                    className={styles.tocIndicator}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className={styles.tocText}>{item.name}</span>
              </li>
            ))}
          </ul>
        </aside>

      </div>
    </main>
  )
}

function groupItemsForToc(currentId: string) {
  // Simplified TOC logic: show the main sections of the active group or all main sections
  return [
    { name: "Introduction", id: "introduction" },
    { name: "Quickstart", id: "quickstart" },
    { name: "Architecture", id: "architecture" },
    { name: "Security Scan", id: "security-scan" },
    { name: "AI Ask", id: "ai-ask" },
    { name: "Cara Kerja", id: "how-it-works" },
  ]
}
