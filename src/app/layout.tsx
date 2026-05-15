import type { Metadata } from 'next'
export const dynamic = 'force-dynamic'
import { Inter, Poppins } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const poppins = Poppins({ 
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'], 
  variable: '--font-poppins' 
})

export const metadata: Metadata = {
  title: 'AEGIS — A New Era of Secure Development',
  description: 'AEGIS is the autonomous AI-powered security platform that protects your code from vulnerabilities before they become breaches. Built for developers, trusted by teams.',
  keywords: ['security', 'SAST', 'DAST', 'AI security', 'developer security', 'code analysis', 'cybersecurity', 'Indonesia'],
  openGraph: {
    title: 'AEGIS — A New Era of Secure Development',
    description: 'Autonomous AI security agent for the modern developer.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${poppins.variable}`}>{children}</body>
    </html>
  )
}
