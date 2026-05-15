import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

// Security vulnerability patterns (Fallback Rules)
const vulnRules: Record<string, { description: string, fix: string }> = {
  "Hardcoded Secret": {
    description: "API keys should be stored in environment variables, not in source code.",
    fix: "Use process.env.API_KEY or os.environ.get('API_KEY') instead of hardcoding."
  },
  "SQL Injection Risk": {
    description: "Dynamic SQL queries can allow attackers to inject malicious SQL.",
    fix: "Use parameterized queries or prepared statements."
  },
  "Command Injection": {
    description: "User input in shell commands can lead to arbitrary command execution.",
    fix: "Use spawn with array arguments instead of exec with string concatenation."
  },
  "XSS Vulnerability": {
    description: "Rendering user input without sanitization can lead to cross-site scripting.",
    fix: "Sanitize user input before rendering or use safe templating methods."
  },
  "Eval Usage": {
    description: "eval() executes arbitrary code and is a security risk.",
    fix: "Avoid eval() entirely. Use JSON.parse() for JSON data."
  }
}

interface Finding {
  id: number
  file: string
  type: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  line: number
  currentCode: string
  fixedCode: string
  description: string
}

const scanExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.php', '.rb', '.go', '.env', '.yml', '.yaml']
const excludeDirs = ['node_modules', '.git', '__pycache__', 'venv', 'dist', 'build', '.next', '.gemini', 'artifacts']

async function fetchRepoContents(repoUrl: string, token?: string): Promise<{ path: string, content: string }[]> {
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
  if (!match) throw new Error('Invalid GitHub URL')
  
  const [, owner, repo] = match
  const repoName = repo.replace(/\.git$/, '')
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'AEGIS-Scanner'
  }
  
  const finalToken = token || process.env.GITHUB_TOKEN
  if (finalToken && finalToken !== 'your_github_pat_here') {
    headers['Authorization'] = `Bearer ${finalToken}`
  }
  
  let treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/trees/main?recursive=1&t=${Date.now()}`, { headers })
  if (!treeResponse.ok) {
    treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/trees/master?recursive=1&t=${Date.now()}`, { headers })
  }

  if (!treeResponse.ok) {
    const errorData = await treeResponse.json()
    throw new Error(`GitHub API Error: ${errorData.message || 'Could not fetch repository tree'}`)
  }
  
  const treeData = await treeResponse.json()
  const files: { path: string, content: string }[] = []
  
  const filesToScan = treeData.tree.filter((item: any) => {
    if (item.type !== 'blob') return false
    if (excludeDirs.some(dir => item.path.includes(`/${dir}/`) || item.path.startsWith(`${dir}/`))) return false
    return scanExtensions.some(ext => item.path.endsWith(ext))
  }).slice(0, 25) // Limit for speed
  
  for (const file of filesToScan) {
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${file.path}?t=${Date.now()}`, { headers })
      if (res.ok) {
        const data = await res.json()
        if (data.content) {
          files.push({ path: file.path, content: Buffer.from(data.content, 'base64').toString('utf-8') })
        }
      }
    } catch (e) {}
  }
  return files
}

async function scanLocalFiles(rootPath: string): Promise<{ path: string, content: string }[]> {
  const files: { path: string, content: string }[] = []
  async function walk(dir: string) {
    const items = await fs.readdir(dir)
    for (const item of items) {
      if (excludeDirs.includes(item)) continue
      const fullPath = path.join(dir, item)
      const stat = await fs.stat(fullPath)
      if (stat.isDirectory()) {
        await walk(fullPath)
      } else if (scanExtensions.includes(path.extname(item))) {
        const content = await fs.readFile(fullPath, 'utf8')
        files.push({ path: path.relative(rootPath, fullPath), content })
      }
      if (files.length >= 25) break
    }
  }
  await walk(rootPath)
  return files
}

async function analyzeWithAI(files: { path: string, content: string }[]): Promise<Finding[]> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
    return files.flatMap(file => basicScan(file.content, file.path))
  }

  const findings: Finding[] = []
  const batchSize = 3 // Smaller batch for better focus
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize)
    const prompt = `You are the AEGIS Autonomous Remediation Engine (Phase 1: SAST). 
Analyze the provided code snippets for security vulnerabilities.

STRICT AUDIT GUIDELINES:
1. Only report GENUINE vulnerabilities (SQLi, XSS, Hardcoded Secrets, Command Injection, Eval).
2. DISTINGUISH between vulnerable code and SECURE implementations.
3. DO NOT flag code that uses:
   - Parameterized queries (e.g., db.execute(query, [params]), db.all(query, params))
   - Environment variables for secrets (e.g., process.env.API_KEY, os.environ.get())
   - Proper input sanitization or safe templating.
4. If the code is already secure, return an EMPTY array for that file.
5. For 'fixedCode', provide ONLY the surgical replacement for the vulnerable line. Ensure the fix is complete and follows security best practices.

Return ONLY a JSON array. 
JSON Format: [{"file": "path", "issue": "Name", "severity": "Critical|High|Medium|Low", "line": 1, "currentCode": "...", "fixedCode": "...", "description": "..."}]

Files to analyze:
${batch.map(f => `--- FILE: ${f.path} ---\n${f.content}`).join('\n\n')}`

    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'deepseek-coder',
          messages: [
            { role: 'system', content: 'You are a professional security auditor. Be precise and avoid false positives.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1
        })
      })
      const data = await response.json()
      const content = data.choices[0].message.content
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const batchFindings = JSON.parse(jsonMatch[0])
        batchFindings.forEach((f: any) => {
          // Double check to ensure we don't duplicate by ID
          findings.push({ id: findings.length + 1000 + Math.floor(Math.random() * 9000), ...f })
        })
      }
    } catch (err) {
      console.error('AI Error:', err)
    }
  }
  return findings
}

function basicScan(content: string, filePath: string): Finding[] {
  const findings: Finding[] = []
  const lines = content.split('\n')
  lines.forEach((line, idx) => {
    const trimLine = line.trim()
    
    // SQL Injection
    if (/(query|select|update|delete).*\$\{.*\}|f['"].*\{.*\}['"]/i.test(line) && !line.includes('?')) {
       findings.push({
          id: Math.random(),
          file: filePath,
          type: "SQL Injection Risk",
          severity: 'High',
          line: idx + 1,
          currentCode: trimLine,
          fixedCode: "GENERATE_VIA_AI",
          description: "Dynamic SQL query detected without parameterization."
       })
    }

    // Hardcoded Secrets
    const secretMatch = line.match(/(password|secret|key|token|auth|sb_|sk_|AKIA)\s*[:=]\s*['"]([^'"]{8,})['"]/i)
    if (secretMatch && !line.includes('process.env') && !line.includes('os.environ')) {
      findings.push({
        id: Math.random(),
        file: filePath,
        type: "Hardcoded Secret",
        severity: 'Critical',
        line: idx + 1,
        currentCode: trimLine,
        fixedCode: `process.env.${secretMatch[1].toUpperCase()}`,
        description: "Hardcoded credential or secret key detected."
      })
    }

    // Eval
    if (/\beval\s*\(/.test(line)) {
      findings.push({
        id: Math.random(),
        file: filePath,
        type: "Eval Usage",
        severity: 'High',
        line: idx + 1,
        currentCode: trimLine,
        fixedCode: "// AI_FIX: Replace eval with JSON.parse or alternative logic",
        description: "Dangerous use of eval() detected."
      })
    }
  })
  return findings
}

export async function POST(request: NextRequest) {
  try {
    const { repoUrl, token, local } = await request.json()
    let files = local ? await scanLocalFiles(path.join(process.cwd(), '..')) : await fetchRepoContents(repoUrl, token)
    
    if (files.length === 0) return NextResponse.json({ error: 'No files found' }, { status: 400 })

    const findings = await analyzeWithAI(files)
    const summary = {
      critical: findings.filter(f => f.severity === 'Critical').length,
      high: findings.filter(f => f.severity === 'High').length,
      medium: findings.filter(f => f.severity === 'Medium').length,
      low: findings.filter(f => f.severity === 'Low').length,
    }

    return NextResponse.json({ success: true, findings, summary, scannedFiles: files.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
