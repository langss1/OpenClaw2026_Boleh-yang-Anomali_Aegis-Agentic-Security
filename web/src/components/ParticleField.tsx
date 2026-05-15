'use client'
import { useEffect, useRef } from 'react'
import styles from './ParticleField.module.css'

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let particles: Particle[] = []

    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    class Particle {
      x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string
      constructor() {
        this.x = Math.random() * (canvas?.width || 1200)
        this.y = Math.random() * (canvas?.height || 800)
        this.vx = (Math.random() - 0.5) * 0.4
        this.vy = (Math.random() - 0.5) * 0.4
        this.life = 0
        this.maxLife = 400 + Math.random() * 600
        this.size = Math.random() * 1.5 + 0.5
        // Vibrant red and white rintik-rintik
        const colors = ['rgba(255, 255, 255,', 'rgba(255, 0, 0,', 'rgba(255, 0, 0,', 'rgba(255, 50, 50,']
        this.color = colors[Math.floor(Math.random() * colors.length)]
      }
      update() {
        this.x += this.vx
        this.y += this.vy
        this.life++
        
        // Wrap around screen
        if (canvas) {
            if (this.x < 0) this.x = canvas.width
            if (this.x > canvas.width) this.x = 0
            if (this.y < 0) this.y = canvas.height
            if (this.y > canvas.height) this.y = 0
        }
      }
      draw() {
        if (!ctx) return
        const alpha = Math.sin((this.life / this.maxLife) * Math.PI) * 0.3
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fillStyle = `${this.color}${alpha})`
        ctx.fill()
      }
      isDead() { return this.life >= this.maxLife }
    }

    function animate() {
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      if (particles.length < 400) {
        particles.push(new Particle())
      }
      
      particles.forEach((p, index) => {
        p.update()
        p.draw()
        if (p.isDead()) {
           particles[index] = new Particle()
        }
      })
      
      animId = requestAnimationFrame(animate)
    }

    resize()
    window.addEventListener('resize', resize)
    animate()
    return () => { 
        cancelAnimationFrame(animId)
        window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className={styles.canvas} />
}
