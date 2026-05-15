import { NextRequest, NextResponse } from 'next/server'

const NGROK_TOKEN = process.env.NGROK_AUTHTOKEN || ''

interface DeploymentJob {
  id: string
  repoUrl: string
  status: 'pending' | 'cloning' | 'installing' | 'starting' | 'tunneling' | 'ready' | 'error'
  ngrokUrl?: string
  error?: string
  logs: string[]
}

// In-memory store for deployment jobs
const deployments = new Map<string, DeploymentJob>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, repoUrl, jobId } = body

    if (action === 'deploy') {
      if (!repoUrl) {
        return NextResponse.json({ error: 'repoUrl is required' }, { status: 400 })
      }

      // Check if running on Vercel (serverless - can't run shell)
      const isServerless = process.env.VERCEL === '1'

      if (isServerless) {
        return NextResponse.json({
          success: false,
          serverless: true,
          message: 'Serverless mode - local deployment required'
        })
      }

      // Local mode - execute deployment
      const newJobId = `job_${Date.now()}`
      const job: DeploymentJob = {
        id: newJobId,
        repoUrl,
        status: 'pending',
        logs: ['Deployment job created']
      }
      deployments.set(newJobId, job)

      // Start deployment async
      startDeployment(newJobId, repoUrl).catch(err => {
        const j = deployments.get(newJobId)
        if (j) {
          j.status = 'error'
          j.error = err.message
        }
      })

      return NextResponse.json({
        success: true,
        jobId: newJobId,
        message: 'Deployment started'
      })
    }

    if (action === 'status') {
      const job = deployments.get(jobId)
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }
      return NextResponse.json(job)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function startDeployment(jobId: string, repoUrl: string) {
  const job = deployments.get(jobId)
  if (!job) return

  const { exec, spawn } = await import('child_process')
  const { promisify } = await import('util')
  const execAsync = promisify(exec)
  const path = await import('path')
  const os = await import('os')

  const workDir = path.join(os.tmpdir(), `aegis-${jobId}`)

  try {
    // Clone
    job.status = 'cloning'
    job.logs.push(`Cloning ${repoUrl}...`)
    await execAsync(`git clone ${repoUrl} "${workDir}"`)
    job.logs.push('Cloned successfully')

    // Install
    job.status = 'installing'
    job.logs.push('Installing dependencies...')
    await execAsync('npm install', { cwd: workDir, timeout: 120000 })
    job.logs.push('Dependencies installed')

    // Detect port from package.json or default to 3000
    let port = 3000
    try {
      const pkgPath = path.join(workDir, 'package.json')
      const fs = await import('fs')
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      if (pkg.scripts?.start?.includes('PORT=')) {
        const portMatch = pkg.scripts.start.match(/PORT=(\d+)/)
        if (portMatch) port = parseInt(portMatch[1])
      }
    } catch {}

    // Start app
    job.status = 'starting'
    job.logs.push('Starting application...')
    
    const startProcess = spawn('npm', ['start'], {
      cwd: workDir,
      detached: true,
      stdio: 'ignore',
      shell: true
    })
    startProcess.unref()

    // Wait for app to start
    await new Promise(r => setTimeout(r, 5000))
    job.logs.push(`App started on port ${port}`)

    // Start ngrok
    job.status = 'tunneling'
    job.logs.push('Creating ngrok tunnel...')

    if (NGROK_TOKEN) {
      try {
        await execAsync(`ngrok config add-authtoken ${NGROK_TOKEN}`)
      } catch {}
    }

    // Get ngrok URL via API
    const ngrokProcess = spawn('ngrok', ['http', String(port)], {
      detached: true,
      stdio: 'ignore',
      shell: true
    })
    ngrokProcess.unref()

    // Wait and poll ngrok API for URL
    await new Promise(r => setTimeout(r, 3000))
    
    for (let i = 0; i < 10; i++) {
      try {
        const res = await fetch('http://127.0.0.1:4040/api/tunnels')
        const data = await res.json()
        if (data.tunnels && data.tunnels.length > 0) {
          const tunnel = data.tunnels.find((t: any) => t.proto === 'https') || data.tunnels[0]
          job.ngrokUrl = tunnel.public_url
          job.status = 'ready'
          job.logs.push(`Ngrok URL: ${job.ngrokUrl}`)
          return
        }
      } catch {}
      await new Promise(r => setTimeout(r, 1000))
    }

    throw new Error('Failed to get ngrok URL')

  } catch (error: any) {
    job.status = 'error'
    job.error = error.message
    job.logs.push(`Error: ${error.message}`)
  }
}

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId')
  
  if (!jobId) {
    return NextResponse.json({ 
      jobs: Array.from(deployments.values()).map(j => ({
        id: j.id,
        status: j.status,
        ngrokUrl: j.ngrokUrl
      }))
    })
  }

  const job = deployments.get(jobId)
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  return NextResponse.json(job)
}
