import { NextRequest, NextResponse } from 'next/server'

const VERCEL_API = 'https://api.vercel.com'
const GITHUB_API = 'https://api.github.com'

interface DeploymentStatus {
  id: string
  url: string
  status: 'BUILDING' | 'ERROR' | 'READY' | 'QUEUED' | 'CANCELED'
  readyState: string
}

interface FileEntry {
  file: string
  data: string
  encoding?: 'base64' | 'utf-8'
}

// Fetch all files from GitHub repo recursively
async function fetchGitHubFiles(owner: string, repo: string, path: string = ''): Promise<FileEntry[]> {
  const files: FileEntry[] = []
  
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'AEGIS-Scanner'
    }
  })
  
  if (!response.ok) {
    throw new Error(`Failed to fetch repo contents: ${response.statusText}`)
  }
  
  const contents = await response.json()
  
  for (const item of contents) {
    // Skip node_modules, .git, etc
    if (item.name === 'node_modules' || item.name === '.git' || item.name === '.next') {
      continue
    }
    
    if (item.type === 'file') {
      // Fetch file content
      const fileRes = await fetch(item.download_url)
      const content = await fileRes.text()
      
      files.push({
        file: path ? `${path}/${item.name}` : item.name,
        data: content,
        encoding: 'utf-8'
      })
    } else if (item.type === 'dir') {
      // Recursively fetch directory contents
      const subPath = path ? `${path}/${item.name}` : item.name
      const subFiles = await fetchGitHubFiles(owner, repo, subPath)
      files.push(...subFiles)
    }
  }
  
  return files
}

// Deploy by uploading files directly (no GitHub integration needed)
async function deployToVercel(repoUrl: string, projectName: string): Promise<{
  deploymentId: string
  url: string
  projectId: string
}> {
  const token = process.env.VERCEL_TOKEN
  if (!token) {
    throw new Error('VERCEL_TOKEN not configured. Add your token to .env file.')
  }

  // Parse GitHub URL to get owner and repo
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/)
  if (!match) {
    throw new Error('Invalid GitHub URL format. Use: https://github.com/owner/repo')
  }
  const [, owner, repo] = match

  // Clean project name (Vercel requirements)
  const cleanName = projectName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50)

  console.log(`Fetching files from GitHub: ${owner}/${repo}`)
  
  // Fetch all files from GitHub
  const files = await fetchGitHubFiles(owner, repo)
  console.log(`Fetched ${files.length} files`)

  // Create deployment with file upload
  const projectSlug = `aegis-${cleanName}-${Date.now().toString(36)}`
  
  const deployRes = await fetch(`${VERCEL_API}/v13/deployments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: projectSlug,
      files: files.map(f => ({
        file: f.file,
        data: f.data
      })),
      projectSettings: {
        framework: null // Auto-detect
      }
    })
  })

  const deployData = await deployRes.json()
  
  if (deployData.error) {
    console.error('Deployment error:', deployData.error)
    throw new Error(deployData.error.message || 'Deployment failed')
  }

  return {
    deploymentId: deployData.id,
    url: `https://${deployData.url}`,
    projectId: deployData.projectId || projectSlug
  }
}

// Check deployment status
async function getDeploymentStatus(deploymentId: string): Promise<DeploymentStatus> {
  const token = process.env.VERCEL_TOKEN
  if (!token) {
    throw new Error('VERCEL_TOKEN not configured')
  }

  const res = await fetch(`${VERCEL_API}/v13/deployments/${deploymentId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  const data = await res.json()
  
  return {
    id: data.id,
    url: data.url ? `https://${data.url}` : '',
    status: data.readyState || data.state,
    readyState: data.readyState
  }
}

// Delete deployment/project
async function deleteDeployment(deploymentId: string): Promise<boolean> {
  const token = process.env.VERCEL_TOKEN
  if (!token) {
    throw new Error('VERCEL_TOKEN not configured')
  }

  const res = await fetch(`${VERCEL_API}/v13/deployments/${deploymentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  return res.ok
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, repoUrl, projectName, deploymentId } = body

    if (action === 'deploy') {
      if (!repoUrl) {
        return NextResponse.json({ error: 'repoUrl is required' }, { status: 400 })
      }

      const result = await deployToVercel(repoUrl, projectName || 'test-app')
      
      return NextResponse.json({
        success: true,
        deploymentId: result.deploymentId,
        url: result.url,
        projectId: result.projectId,
        message: 'Deployment started'
      })
    }

    if (action === 'status') {
      if (!deploymentId) {
        return NextResponse.json({ error: 'deploymentId is required' }, { status: 400 })
      }

      const status = await getDeploymentStatus(deploymentId)
      
      return NextResponse.json({
        success: true,
        ...status
      })
    }

    if (action === 'delete') {
      if (!deploymentId) {
        return NextResponse.json({ error: 'deploymentId is required' }, { status: 400 })
      }

      const deleted = await deleteDeployment(deploymentId)
      
      return NextResponse.json({
        success: deleted,
        message: deleted ? 'Deployment deleted' : 'Failed to delete'
      })
    }

    return NextResponse.json({ error: 'Invalid action. Use: deploy, status, delete' }, { status: 400 })
  } catch (error: any) {
    console.error('Vercel API error:', error)
    return NextResponse.json({ 
      error: error.message || 'Vercel operation failed' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const deploymentId = request.nextUrl.searchParams.get('deploymentId')
  
  if (!deploymentId) {
    return NextResponse.json({ error: 'deploymentId required' }, { status: 400 })
  }

  try {
    const status = await getDeploymentStatus(deploymentId)
    return NextResponse.json(status)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
