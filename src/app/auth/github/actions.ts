'use server'
import { createClient } from '@/utils/supabase/server'

export async function getGitHubRepos() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const isDev = process.env.NODE_ENV === 'development'
  let token = session?.provider_token || (isDev ? process.env.GITHUB_TOKEN : null)

  // Fallback for localhost: if no token (or still using placeholder), try to fetch public repos for 'langss1'
  if ((!token || token === 'your_github_pat_here') && isDev) {
    try {
      const response = await fetch('https://api.github.com/users/langss1/repos?sort=updated&per_page=100', {
        headers: {
          Accept: 'application/vnd.github+json',
        },
        next: { revalidate: 0 }
      })
      if (response.ok) {
        const repos = await response.json()
        return { repos, isFallback: true }
      }
    } catch (e) {}
    
    // Only return error if fallback also failed and we REALLY don't have a token
    if (!token || token === 'your_github_pat_here') {
      return { error: 'GitHub Token tidak ditemukan! Silakan isi GITHUB_TOKEN di file .env untuk mengakses repo privat Anda.' }
    }
  }

  try {
    const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
      next: { revalidate: 0 }
    })

    const repos = await response.json()
    
    // Fetch user info for UI "Connected" state
    let user = null
    try {
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        }
      })
      if (userRes.ok) user = await userRes.json()
    } catch (e) {}

    return { repos, user }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function analyzeGitHubRepo(repoFullName: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  const isDev = process.env.NODE_ENV === 'development'
  let token = session?.provider_token || (isDev ? process.env.GITHUB_TOKEN : null)

  if (token === 'your_github_pat_here') {
    token = null
  }

  if (!token && !isDev) {
    return { stack: [], error: 'GitHub connection lost. Please re-login.' }
  }

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json'
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // 1. Fetch Full Recursive Tree
    const treeRes = await fetch(`https://api.github.com/repos/${repoFullName}/git/trees/main?recursive=1`, { headers })
    const treeData = treeRes.ok ? await treeRes.json() : { tree: [] }
    const tree = treeData.tree || []
    const filePaths = tree.map((f: any) => f.path)

    const detected = new Set<string>()
    const insights = []

    // 2. Identify High-Value Files for Deep Read
    const highValueFiles = tree.filter((f: any) => 
      ['README.md', 'package.json', 'docker-compose.yml', 'Dockerfile', '.env.example', 'vercel.json', 'next.config.js', 'prisma/schema.prisma'].includes(f.path.split('/').pop() || '')
    )

    // 3. Parallel Deep Analysis (Membuka Isi File)
    const analysisPromises = highValueFiles.map(async (file: any) => {
      try {
        const res = await fetch(file.url, { headers })
        const data = await res.json()
        const content = atob(data.content || '')
        const fileName = file.path.toLowerCase()

        // Analyze README.md
        if (fileName.includes('readme.md')) {
          if (content.toLowerCase().includes('postgresql')) detected.add('PostgreSQL Database')
          if (content.toLowerCase().includes('redis')) detected.add('Redis Cache')
          if (content.toLowerCase().includes('docker')) detected.add('Dockerized Infrastructure')
        }

        // Analyze .env.example
        if (fileName.includes('.env.example')) {
          if (content.includes('STRIPE_')) detected.add('Stripe Payments')
          if (content.includes('AWS_')) detected.add('AWS Infrastructure')
          if (content.includes('SUPABASE_')) detected.add('Supabase Backend')
        }

        // Analyze docker-compose
        if (fileName.includes('docker-compose')) {
          if (content.includes('image: postgres')) detected.add('Postgres Container (Self-Hosted)')
          if (content.includes('image: redis')) detected.add('Redis Container')
        }

        // Analyze package.json (Fuzzy Intelligence Scan)
        if (fileName.includes('package.json')) {
          const pkg = JSON.parse(content)
          const allStr = JSON.stringify(pkg).toLowerCase()
          const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }

          if (allDeps['next']) detected.add(`Next.js ${allDeps['next']}`)
          if (allStr.includes('typescript')) detected.add('Strict TypeScript Architecture')
          if (allStr.includes('tailwind')) detected.add('Tailwind CSS Design System')
          if (allStr.includes('framer-motion')) detected.add('Framer Motion Animations')
          if (allStr.includes('lucide')) detected.add('Lucide UI Icons')
          if (allStr.includes('prisma')) detected.add('Prisma ORM Layer')
          if (allStr.includes('drizzle')) detected.add('Drizzle ORM Layer')
          if (allStr.includes('supabase')) detected.add('Supabase Backend Integration')
          if (allStr.includes('clerk') || allStr.includes('next-auth')) detected.add('Advanced Auth Security')
          if (allStr.includes('query') || allStr.includes('swr')) detected.add('Data Fetching Layer (React Query/SWR)')
        }
      } catch (e) {
        console.error('File analysis error:', file.path, e)
      }
    })

    await Promise.all(analysisPromises)

    // 4. Structural Logic Mapping (Extreme Detail)
    if (filePaths.some((p: string) => p.startsWith('src/app') || p.startsWith('app/'))) detected.add('Next.js App Router (Modern Architecture)')
    if (filePaths.some((p: string) => p.includes('actions/'))) detected.add('Server Actions Communication Pattern')
    if (filePaths.some((p: string) => p.includes('middleware.ts'))) detected.add('Edge Security Middleware')
    if (filePaths.some((p: string) => p.includes('.github/workflows'))) detected.add('GitHub Actions CI/CD Pipeline')
    if (filePaths.some((p: string) => p.includes('supabase'))) detected.add('Supabase Infrastructure Layer')
    if (filePaths.some((p: string) => p.includes('components/ui'))) detected.add('Atomic UI Design (Shadcn/UI Pattern)')
    if (filePaths.some((p: string) => p.includes('tailwind.config'))) detected.add('Tailwind CSS Configured')

    // 5. Language Stats
    const langRes = await fetch(`https://api.github.com/repos/${repoFullName}/languages`, { headers })
    const languages = langRes.ok ? await langRes.json() : {}
    Object.keys(languages).slice(0, 2).forEach(l => {
      if (l !== 'CSS' && l !== 'HTML') detected.add(l)
    })

    // 6. Intelligent Deduplication
    let finalStack = Array.from(detected)
    if (finalStack.includes('Strict TypeScript Architecture')) {
      finalStack = finalStack.filter(s => s !== 'TypeScript')
    }

    return { 
      stack: finalStack,
      isDeepAudit: true
    }
  } catch (err) {
    console.error('Deep Audit error:', err)
    return { stack: ['Deep Audit Interrupted'], error: 'Deep analysis failed' }
  }
}
