import { NextRequest, NextResponse } from 'next/server'
import { generateAutoFix } from '@/lib/deepseek'
import fs from 'fs/promises'
import path from 'path'

interface Vulnerability {
  id: string
  type: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  file: string
  line: number
  code: string
  description: string
}

interface FixSuggestion {
  id: string
  vulnerabilityId: string
  originalCode: string
  fixedCode: string
  explanation: string
  confidence: number
}

// Fix templates for common vulnerabilities
const fixTemplates: Record<string, (code: string, context?: any) => { fixed: string; explanation: string }> = {
  'sql-injection': (code) => {
    // Convert string concatenation to parameterized query
    let fixed = code
    
    if (code.includes('${') || code.includes("' +") || code.includes("+ '")) {
      // Template literal or concatenation detected
      fixed = code
        .replace(/`SELECT \* FROM \w+ WHERE \w+ = \$\{(\w+)\}`/g, 
          '`SELECT * FROM users WHERE id = ?`, [$1]')
        .replace(/['"]SELECT.*?['"].*?\+.*?(\w+)/g, 
          '"SELECT * FROM users WHERE id = ?", [$1]')
    }
    
    // Generic parameterized query suggestion
    if (fixed === code) {
      fixed = `// Use parameterized queries instead of string concatenation
const query = "SELECT * FROM users WHERE id = ?"
const result = await db.execute(query, [userId])`
    }
    
    return {
      fixed,
      explanation: 'Replaced string concatenation with parameterized query to prevent SQL injection attacks.'
    }
  },
  
  'xss': (code) => {
    let fixed = code
    
    // innerHTML to textContent
    if (code.includes('innerHTML')) {
      fixed = code.replace(/\.innerHTML\s*=/, '.textContent =')
    }
    // dangerouslySetInnerHTML
    else if (code.includes('dangerouslySetInnerHTML')) {
      fixed = `// Use DOMPurify to sanitize HTML
import DOMPurify from 'dompurify'
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />`
    }
    // document.write
    else if (code.includes('document.write')) {
      fixed = code.replace(/document\.write\((.*?)\)/, 'document.body.textContent = $1')
    }
    // Generic
    else {
      fixed = `// Sanitize user input before rendering
import DOMPurify from 'dompurify'
const sanitized = DOMPurify.sanitize(userInput)
element.textContent = sanitized`
    }
    
    return {
      fixed,
      explanation: 'Applied output encoding/sanitization to prevent Cross-Site Scripting (XSS) attacks.'
    }
  },
  
  'hardcoded-secret': (code) => {
    const fixed = `// Move secrets to environment variables
const apiKey = process.env.API_KEY
const dbPassword = process.env.DB_PASSWORD

// In .env file (don't commit to git!):
// API_KEY=your-secret-key
// DB_PASSWORD=your-db-password`
    
    return {
      fixed,
      explanation: 'Moved hardcoded secrets to environment variables. Add .env to .gitignore to prevent accidental commits.'
    }
  },
  
  'weak-crypto': (code) => {
    let fixed = code
    
    if (code.includes('md5') || code.includes('MD5')) {
      fixed = code.replace(/md5|MD5/g, 'sha256')
    } else if (code.includes('sha1') || code.includes('SHA1')) {
      fixed = code.replace(/sha1|SHA1/g, 'sha256')
    } else {
      fixed = `// Use strong cryptographic algorithms
import { createHash, randomBytes, scrypt } from 'crypto'

// For hashing (non-password):
const hash = createHash('sha256').update(data).digest('hex')

// For passwords (use bcrypt or scrypt):
import bcrypt from 'bcrypt'
const hashedPassword = await bcrypt.hash(password, 12)`
    }
    
    return {
      fixed,
      explanation: 'Replaced weak cryptographic algorithm with a stronger alternative (SHA-256 or bcrypt for passwords).'
    }
  },
  
  'path-traversal': (code) => {
    const fixed = `// Validate and sanitize file paths
import path from 'path'

const baseDir = '/safe/base/directory'
const userInput = req.query.file

// Resolve and validate path
const resolvedPath = path.resolve(baseDir, userInput)

// Ensure path is within base directory
if (!resolvedPath.startsWith(baseDir)) {
  throw new Error('Invalid path: directory traversal detected')
}

const fileContent = fs.readFileSync(resolvedPath)`
    
    return {
      fixed,
      explanation: 'Added path validation to prevent directory traversal attacks. Always validate that resolved paths stay within allowed directories.'
    }
  },
  
  'insecure-random': (code) => {
    const fixed = `// Use cryptographically secure random number generation
import { randomBytes, randomUUID } from 'crypto'

// For tokens/IDs:
const secureToken = randomBytes(32).toString('hex')
const uuid = randomUUID()

// For numbers in range:
const secureRandomInt = (min: number, max: number) => {
  const range = max - min
  const bytesNeeded = Math.ceil(Math.log2(range) / 8)
  const randomValue = parseInt(randomBytes(bytesNeeded).toString('hex'), 16)
  return min + (randomValue % range)
}`
    
    return {
      fixed,
      explanation: 'Replaced Math.random() with crypto.randomBytes() for cryptographically secure random number generation.'
    }
  },
  
  'missing-auth': (code) => {
    const fixed = `// Add authentication middleware
import { verifyToken } from '@/lib/auth'

export async function GET(request: Request) {
  // Verify authentication
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const user = await verifyToken(token)
  if (!user) {
    return Response.json({ error: 'Invalid token' }, { status: 401 })
  }
  
  // Proceed with authenticated request
  // ... your code here
}`
    
    return {
      fixed,
      explanation: 'Added authentication check to protect sensitive endpoint. Always verify user identity before processing requests.'
    }
  },
  
  'csrf': (code) => {
    const fixed = `// Implement CSRF protection
import { headers } from 'next/headers'

export async function POST(request: Request) {
  const headersList = headers()
  
  // Verify CSRF token
  const csrfToken = request.headers.get('x-csrf-token')
  const sessionToken = headersList.get('cookie')?.match(/csrf=([^;]+)/)?.[1]
  
  if (!csrfToken || csrfToken !== sessionToken) {
    return Response.json({ error: 'Invalid CSRF token' }, { status: 403 })
  }
  
  // Proceed with request
  // ... your code here
}

// In your form component:
// <input type="hidden" name="_csrf" value={csrfToken} />`
    
    return {
      fixed,
      explanation: 'Added CSRF token validation to prevent Cross-Site Request Forgery attacks.'
    }
  },
  
  'open-redirect': (code) => {
    const fixed = `// Validate redirect URLs
const ALLOWED_HOSTS = ['yourdomain.com', 'app.yourdomain.com']

function safeRedirect(url: string): string {
  try {
    const parsed = new URL(url, 'https://yourdomain.com')
    
    // Only allow relative URLs or whitelisted domains
    if (parsed.hostname && !ALLOWED_HOSTS.includes(parsed.hostname)) {
      return '/' // Redirect to home if invalid
    }
    
    return parsed.pathname + parsed.search
  } catch {
    return '/'
  }
}

// Usage:
const redirectUrl = safeRedirect(req.query.redirect as string)
res.redirect(redirectUrl)`
    
    return {
      fixed,
      explanation: 'Added URL validation to prevent open redirect attacks. Only allow redirects to whitelisted domains or relative paths.'
    }
  },
  
  'no-rate-limit': (code) => {
    const fixed = `// Implement rate limiting
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
})

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1'
  
  const { success, limit, reset, remaining } = await ratelimit.limit(ip)
  
  if (!success) {
    return Response.json(
      { error: 'Too many requests' },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        }
      }
    )
  }
  
  // Proceed with request
  // ... your code here
}`
    
    return {
      fixed,
      explanation: 'Added rate limiting to prevent brute force and DoS attacks. Adjust limits based on your use case.'
    }
  },

  'command-injection': (code) => {
    const fixed = `// Avoid shell commands, use native APIs
import { spawn } from 'child_process'

// Instead of exec with string interpolation:
// exec(\`ls \${userInput}\`) // DANGEROUS!

// Use spawn with argument array:
const child = spawn('ls', [userInput], {
  shell: false, // Don't use shell
  timeout: 5000,
})

// Or better, use native Node.js APIs:
import { readdir } from 'fs/promises'
const files = await readdir(directory)`
    
    return {
      fixed,
      explanation: 'Replaced shell command execution with safer alternatives. Use spawn with shell:false or native Node.js APIs.'
    }
  },

  'prototype-pollution': (code) => {
    const fixed = `// Protect against prototype pollution
function safeMerge(target: object, source: object): object {
  const result = { ...target }
  
  for (const key of Object.keys(source)) {
    // Block prototype pollution vectors
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue
    }
    
    if (typeof source[key] === 'object' && source[key] !== null) {
      result[key] = safeMerge(result[key] || {}, source[key])
    } else {
      result[key] = source[key]
    }
  }
  
  return result
}

// Or use Object.create(null) for prototype-less objects:
const safeObject = Object.create(null)`
    
    return {
      fixed,
      explanation: 'Added prototype pollution protection by filtering dangerous keys (__proto__, constructor, prototype).'
    }
  },

  'missing-security-headers': (code) => {
    const fixed = `// next.config.ts - Add security headers
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  }
]

export default {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  }
}`
    
    return {
      fixed,
      explanation: 'Added security headers to protect against clickjacking, XSS, and other attacks.'
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { vulnerability, action } = body

    if (action === 'generate-fix') {
      if (!vulnerability) {
        return NextResponse.json({ error: 'vulnerability is required' }, { status: 400 })
      }

      const fix = await generateFix(vulnerability)
      return NextResponse.json({ success: true, fix })
    }

    if (action === 'batch-fix') {
      const { vulnerabilities } = body
      if (!vulnerabilities || !Array.isArray(vulnerabilities)) {
        return NextResponse.json({ error: 'vulnerabilities array is required' }, { status: 400 })
      }

      const fixes = await Promise.all(
        vulnerabilities.map((vuln: Vulnerability) => generateFix(vuln))
      )

      return NextResponse.json({ success: true, fixes })
    }

    if (action === 'batch-apply') {
      const { file, fixes, repoUrl, isLocal } = body
      const apiKey = process.env.DEEPSEEK_API_KEY

      try {
        let content = ''
        let sha = ''
        let owner = '', repoName = ''
        const isGitHub = repoUrl && repoUrl.includes('github.com') && !isLocal

        // 1. Get initial content (with cache busting)
        if (isGitHub) {
          const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
          if (!match) throw new Error('Invalid GitHub URL')
          owner = match[1]
          repoName = match[2].replace(/\.git$/, '')
          const token = process.env.GITHUB_TOKEN
          const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
          
          // Force fresh content with timestamp
          const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${file}?t=${Date.now()}`, { headers })
          if (!fileRes.ok) throw new Error(`Could not find ${file} on GitHub`)
          const fileData = await fileRes.json()
          content = Buffer.from(fileData.content, 'base64').toString('utf-8')
          sha = fileData.sha
        } else {
          const filePath = path.isAbsolute(file) ? file : path.join(process.cwd(), '..', file)
          content = await fs.readFile(filePath, 'utf8')
        }

        let newContent = ''

        // 2. Perform Surgical Deep Healing (Surgical Line Replacement)
        // We use reverse-order patching to avoid line number shifting issues
        const lines = content.split('\n')
        
        // Sort fixes by line number descending (bottom to top)
        const sortedFixes = [...fixes].sort((a: any, b: any) => b.line - a.line)
        
        let appliedCount = 0
        for (const f of sortedFixes) {
          const lineIdx = f.line - 1
          if (lineIdx >= 0 && lineIdx < lines.length) {
            const currentLine = lines[lineIdx].trim()
            // Verify if the code hasn't changed to prevent wrong injection
            // If currentCode is provided, check it. Otherwise, proceed.
            if (!f.currentCode || currentLine === f.currentCode.trim() || currentLine.includes(f.currentCode.trim())) {
              lines[lineIdx] = f.fixedCode
              appliedCount++
            }
          }
        }
        
        newContent = lines.join('\n')

        // 3. Save / Commit
        if (isGitHub) {
          const token = process.env.GITHUB_TOKEN
          const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${file}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' },
            body: JSON.stringify({
              message: `🛡️ AEGIS: Deep-Healing auto-remediation for ${appliedCount} issues`,
              content: Buffer.from(newContent).toString('base64'),
              sha: sha
            })
          })
          if (!commitRes.ok) throw new Error('GitHub Batch Commit Failed')
          return NextResponse.json({ success: true, message: `Deep-Healed ${appliedCount} issues in ${file} on GitHub` })
        } else {
          const filePath = path.isAbsolute(file) ? file : path.join(process.cwd(), '..', file)
          
          // Create backup like CLI does
          try {
            const backupPath = filePath + '.bak'
            if (!(await fs.access(backupPath).then(() => true).catch(() => false))) {
              await fs.writeFile(backupPath, content)
            }
          } catch (e) {}

          await fs.writeFile(filePath, newContent)
          return NextResponse.json({ success: true, message: `Deep-Healed ${appliedCount} issues in ${file} locally` })
        }
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
      }
    }

    if (action === 'apply-fix') {
      const { file, fixedCode, vulnerability, repoUrl, isLocal } = body
      if (!file || !fixedCode || !vulnerability) {
        return NextResponse.json({ error: 'file, fixedCode, and vulnerability details are required' }, { status: 400 })
      }

      // 1. GitHub Fix (If repoUrl is present and not local)
      if (repoUrl && repoUrl.includes('github.com') && !isLocal) {
        try {
          const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
          if (!match) throw new Error('Invalid GitHub URL')
          const [, owner, repo] = match
          const repoName = repo.replace(/\.git$/, '')

          // Get token from env or request
          const token = process.env.GITHUB_TOKEN
          if (!token || token === 'your_github_pat_here') {
            throw new Error('GitHub token missing in .env. Cannot push fixes to GitHub.')
          }

          const headers = {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }

          // A. Get current file SHA and content
          const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${file}`, { headers })
          if (!fileRes.ok) throw new Error(`Could not find ${file} on GitHub`)
          const fileData = await fileRes.json()
          const currentContent = Buffer.from(fileData.content, 'base64').toString('utf-8')
          
          // B. Apply patch to line
          const lines = currentContent.split('\n')
          const lineIdx = vulnerability.line - 1
          if (lineIdx < 0 || lineIdx >= lines.length) throw new Error(`Line ${vulnerability.line} mismatch on GitHub`)
          
          lines[lineIdx] = fixedCode
          const newContent = lines.join('\n')

          // C. Commit to GitHub
          const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${file}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              message: `🛡️ AEGIS: Auto-remediation for ${vulnerability.type} at line ${vulnerability.line}`,
              content: Buffer.from(newContent).toString('base64'),
              sha: fileData.sha
            })
          })

          if (!commitRes.ok) {
            const err = await commitRes.json()
            throw new Error(`GitHub Commit Failed: ${err.message}`)
          }

          return NextResponse.json({ 
            success: true, 
            message: `Pushed fix to GitHub: ${repoName}/${file}`,
            github_url: repoUrl
          })
        } catch (err: any) {
          console.error('GitHub Fix Error:', err)
          return NextResponse.json({ error: `GitHub Push Failed: ${err.message}` }, { status: 500 })
        }
      }

      // 2. Local Fix Fallback
      const projectRoot = process.cwd()
      try {
        let filePath = file
        if (!path.isAbsolute(filePath)) {
          filePath = path.join(projectRoot, '..', file)
        }

        // Read the current file content
        const content = await fs.readFile(filePath, 'utf8')
        const lines = content.split('\n')
        
        // The line number is 1-indexed
        const lineIdx = vulnerability.line - 1
        
        if (lineIdx >= 0 && lineIdx < lines.length) {
          lines[lineIdx] = fixedCode
          await fs.writeFile(filePath, lines.join('\n'))
          return NextResponse.json({ success: true, message: `Applied fix to ${file} at line ${vulnerability.line}` })
        } else {
          return NextResponse.json({ error: `Line ${vulnerability.line} not found in ${file}` }, { status: 400 })
        }
      } catch (err: any) {
        return NextResponse.json({ error: `Failed to apply fix: ${err.message}` }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function generateFix(vulnerability: Vulnerability): Promise<FixSuggestion> {
  try {
    // Try AI Fix first
    const aiFix = await generateAutoFix({
      type: vulnerability.type,
      severity: vulnerability.severity,
      file: vulnerability.file,
      line: vulnerability.line,
      code: vulnerability.code,
      description: vulnerability.description
    });

    if (aiFix && aiFix.fixedCode && aiFix.confidence > 0.4) {
      return {
        id: `fix_ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        vulnerabilityId: vulnerability.id,
        originalCode: vulnerability.code,
        fixedCode: aiFix.fixedCode,
        explanation: aiFix.explanation,
        confidence: aiFix.confidence
      }
    }
  } catch (error) {
    console.error('AI Fix Generation failed, falling back to templates:', error);
  }

  // Fallback to Template
  const vulnType = normalizeVulnType(vulnerability.type)
  const template = fixTemplates[vulnType]

  if (template) {
    const { fixed, explanation } = template(vulnerability.code)
    return {
      id: `fix_tmpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      vulnerabilityId: vulnerability.id,
      originalCode: vulnerability.code,
      fixedCode: fixed,
      explanation,
      confidence: 0.85
    }
  }

  // Generic fix suggestion
  return {
    id: `fix_gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    vulnerabilityId: vulnerability.id,
    originalCode: vulnerability.code,
    fixedCode: `// TODO: Review and fix ${vulnerability.type} vulnerability\n// ${vulnerability.description}\n${vulnerability.code}`,
    explanation: `Please review this ${vulnerability.type} vulnerability and apply appropriate security measures.`,
    confidence: 0.5
  }
}

function normalizeVulnType(type: string): string {
  const typeMap: Record<string, string> = {
    'SQL Injection': 'sql-injection',
    'sql_injection': 'sql-injection',
    'sqli': 'sql-injection',
    'Cross-Site Scripting': 'xss',
    'cross_site_scripting': 'xss',
    'XSS': 'xss',
    'Hardcoded Secret': 'hardcoded-secret',
    'hardcoded_secret': 'hardcoded-secret',
    'hardcoded-credentials': 'hardcoded-secret',
    'Weak Cryptography': 'weak-crypto',
    'weak_crypto': 'weak-crypto',
    'Path Traversal': 'path-traversal',
    'path_traversal': 'path-traversal',
    'directory-traversal': 'path-traversal',
    'Insecure Random': 'insecure-random',
    'insecure_random': 'insecure-random',
    'Missing Authentication': 'missing-auth',
    'missing_auth': 'missing-auth',
    'CSRF': 'csrf',
    'csrf': 'csrf',
    'Open Redirect': 'open-redirect',
    'open_redirect': 'open-redirect',
    'Rate Limiting': 'no-rate-limit',
    'no_rate_limit': 'no-rate-limit',
    'Command Injection': 'command-injection',
    'command_injection': 'command-injection',
    'Prototype Pollution': 'prototype-pollution',
    'prototype_pollution': 'prototype-pollution',
    'Missing Security Headers': 'missing-security-headers',
    'missing_headers': 'missing-security-headers',
  }

  return typeMap[type] || type.toLowerCase().replace(/\s+/g, '-')
}

export async function GET() {
  return NextResponse.json({
    supported_vulnerabilities: Object.keys(fixTemplates),
    version: '1.0.0'
  })
}
