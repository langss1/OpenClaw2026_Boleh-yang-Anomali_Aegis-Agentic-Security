import { NextRequest, NextResponse } from 'next/server'

// Store active ngrok tunnels
const activeTunnels = new Map<string, {
  url: string
  port: number
  status: 'active' | 'stopped'
  createdAt: number
}>()

// Simulated ngrok deployment for demo
// In production, you would use ngrok SDK or spawn process
async function deployToNgrok(repoUrl: string, sessionId: string): Promise<{ url: string, port: number }> {
  // For demo, we'll use a mock ngrok URL
  // In production, you'd use:
  // 1. Clone the repo
  // 2. Install dependencies  
  // 3. Start the server on a port
  // 4. Start ngrok tunnel to that port
  
  const port = 3000 + Math.floor(Math.random() * 1000)
  
  // Mock ngrok URL - in production this would be real
  const ngrokUrl = `https://${sessionId.substring(0, 8)}.ngrok-free.app`
  
  // Store tunnel info
  activeTunnels.set(sessionId, {
    url: ngrokUrl,
    port,
    status: 'active',
    createdAt: Date.now()
  })
  
  return { url: ngrokUrl, port }
}

async function stopNgrokTunnel(sessionId: string): Promise<boolean> {
  const tunnel = activeTunnels.get(sessionId)
  if (tunnel) {
    tunnel.status = 'stopped'
    activeTunnels.set(sessionId, tunnel)
    return true
  }
  return false
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, repoUrl, sessionId } = body

    if (action === 'deploy') {
      if (!repoUrl || !sessionId) {
        return NextResponse.json({ 
          error: 'repoUrl and sessionId are required' 
        }, { status: 400 })
      }

      const { url, port } = await deployToNgrok(repoUrl, sessionId)
      
      return NextResponse.json({
        success: true,
        ngrokUrl: url,
        localPort: port,
        sessionId,
        message: 'Application deployed to ngrok for live testing'
      })
    } 
    
    if (action === 'stop') {
      if (!sessionId) {
        return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
      }
      
      const stopped = await stopNgrokTunnel(sessionId)
      
      return NextResponse.json({
        success: stopped,
        message: stopped ? 'Tunnel stopped' : 'Tunnel not found'
      })
    }

    if (action === 'status') {
      if (!sessionId) {
        return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
      }
      
      const tunnel = activeTunnels.get(sessionId)
      
      if (!tunnel) {
        return NextResponse.json({ status: 'not_found' })
      }
      
      return NextResponse.json({
        status: tunnel.status,
        url: tunnel.url,
        port: tunnel.port,
        uptime: Date.now() - tunnel.createdAt
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Ngrok API error:', error)
    return NextResponse.json({ 
      error: error.message || 'Ngrok operation failed' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId')
  
  if (!sessionId) {
    // Return all active tunnels
    const tunnels = Array.from(activeTunnels.entries()).map(([id, info]) => ({
      sessionId: id,
      ...info
    }))
    
    return NextResponse.json({ tunnels })
  }
  
  const tunnel = activeTunnels.get(sessionId)
  
  if (!tunnel) {
    return NextResponse.json({ status: 'not_found' })
  }
  
  return NextResponse.json(tunnel)
}
