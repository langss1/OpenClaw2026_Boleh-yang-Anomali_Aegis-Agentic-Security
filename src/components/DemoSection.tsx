'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldAlert, Zap, AlertTriangle } from 'lucide-react'
import styles from './DemoSection.module.css'

const problems = [
  {
    id: "01",
    label: "OPERATIONAL RISK",
    title: "Celah Remediasi Otomatis",
    desc: "Menemukan kerentanan adalah langkah awal, namun memperbaiki secara otomatis tanpa mengganggu stabilitas infrastruktur tetap menjadi tantangan kritis.",
    icon: <ShieldAlert size={42} className="text-red-500" />,
    color: "rgba(220, 38, 38, 0.3)", // Red Glow
    border: "border-red-500/50"
  },
  {
    id: "02",
    label: "INTELLIGENCE GAP",
    title: "Analisis Buta Konteks",
    desc: "Banyak solusi AI gagal memahami struktur lokal dan arsitektur unik proyek, menghasilkan rekomendasi generik yang tidak aplikatif pada lingkungan produksi.",
    icon: <AlertTriangle size={42} className="text-orange-500" />,
    color: "rgba(249, 115, 22, 0.3)", // Orange Glow
    border: "border-orange-500/50"
  },
  {
    id: "03",
    label: "DATA ANOMALY",
    title: "Deteksi Trafik Masif",
    desc: "Anomali trafik skala besar seringkali lolos dari pemantauan manual. Tanpa analisis real-time, celah ini menjadi gerbang utama serangan siber.",
    icon: <Zap size={42} className="text-yellow-500" />,
    color: "rgba(234, 179, 8, 0.3)", // Yellow Glow
    border: "border-yellow-500/50"
  }
]

export default function DemoSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [scale, setScale] = useState(0.8)
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return
      const rect = sectionRef.current.getBoundingClientRect()
      const windowHeight = window.innerHeight
      const visiblePct = Math.min(Math.max((windowHeight - rect.top) / (windowHeight * 0.8), 0), 1)
      setScale(0.8 + (visiblePct * 0.2))
    }
    window.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % problems.length)
    }, 6000)
    return () => clearInterval(timer)
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

      {/* --- PREMIUM GLASSMORPHISM LEVEL 2 SLIDER --- */}
      <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden py-24 mt-10 font-sans">
        
        {/* --- BACKGROUND LAYER --- */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        
        {/* Animated Radial Glow */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.15, 0.1] 
          }}
          transition={{ duration: 8, repeat: Infinity }}
          style={{ backgroundColor: problems[current].color }}
          className="absolute w-[600px] h-[600px] rounded-full blur-[120px] z-0"
        />

        <div className="relative z-10 w-full max-w-6xl px-8">
          
          {/* --- HEADER --- */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-[2px] w-12 bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)]"></div>
              <span className="text-xs font-bold tracking-[0.6em] text-gray-500 uppercase font-mono text-left">System Integrity Report</span>
            </div>
            <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase italic leading-none text-left">
              Masalah <span className="text-red-600 drop-shadow-[0_0_20px_rgba(220,38,38,0.5)]">Utama</span>
            </h2>
          </div>

          {/* --- MAIN CARD --- */}
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
                className="relative w-full rounded-[40px] border border-white/10 bg-white/[0.02] backdrop-blur-3xl p-10 md:p-20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
              >
                {/* Corner Accent */}
                <div className={`absolute top-0 right-0 h-24 w-24 border-t-4 border-r-4 rounded-tr-[40px] opacity-40 transition-colors duration-700 ${problems[current].border}`}></div>
                
                <div className="flex flex-col md:flex-row items-center gap-16">
                  
                  {/* Visual Section */}
                  <div className="relative flex-shrink-0">
                    {/* Watermark Number */}
                    <div className="text-[12rem] font-black text-white/[0.03] font-mono absolute -top-24 -left-16 select-none">
                      {problems[current].id}
                    </div>
                    {/* Icon Box */}
                    <div className="relative p-10 bg-gradient-to-br from-white/10 to-transparent rounded-[32px] border border-white/10 shadow-2xl backdrop-blur-sm">
                      {problems[current].icon}
                      <div className="absolute inset-0 bg-white/5 animate-pulse rounded-[32px] pointer-events-none"></div>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="flex-1 text-center md:text-left">
                    <div className="inline-block px-4 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] font-bold tracking-[0.3em] text-gray-400 mb-6 uppercase">
                      {problems[current].label}
                    </div>
                    <h3 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight uppercase leading-tight">
                      {problems[current].title}
                    </h3>
                    <p className="text-xl md:text-2xl text-gray-400 leading-relaxed font-light italic max-w-2xl border-l-4 border-red-600/30 pl-8">
                      "{problems[current].desc}"
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* --- BOTTOM CONTROLS --- */}
            <div className="mt-12 flex items-center justify-between">
              <div className="flex gap-4">
                {problems.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`group relative h-2 transition-all duration-700 rounded-full ${
                      current === i ? "w-20 bg-red-600" : "w-8 bg-white/10 hover:bg-white/20"
                    }`}
                  >
                    {current === i && (
                      <motion.div 
                        layoutId="activeBarGlow"
                        className="absolute inset-0 bg-red-600 blur-sm"
                      />
                    )}
                  </button>
                ))}
              </div>
              
              <div className="hidden md:flex items-center gap-4 text-gray-600 font-mono text-sm tracking-widest uppercase">
                <span className="text-white font-bold italic">SCNR-v.2.0</span>
                <span className="h-4 w-[1px] bg-white/10"></span>
                <span>Page {current + 1} / {problems.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
