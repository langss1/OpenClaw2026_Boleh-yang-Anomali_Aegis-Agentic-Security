/**
 * AEGIS Code Analyzer - Powered by DeepSeek AI
 * Analyzes source code for vulnerabilities and generates fixes using AI
 */

const API_KEY = process.env.DEEPSEEK_API_KEY!;
const BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

export interface VulnerablePattern {
  type: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  description: string;
  line: number;
  column?: number;
  code: string;
  context?: string;
}

export interface CodeFix {
  type: string;
  original: string;
  fixed: string;
  explanation: string;
  line: number;
}

export interface AnalysisResult {
  filePath: string;
  vulnerabilities: VulnerablePattern[];
  fixes: CodeFix[];
  language: string;
  aiAnalysis?: string;
}

/**
 * Analyze source code using DeepSeek AI
 */
export async function analyzeCode(code: string, filePath: string): Promise<AnalysisResult> {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const language = getLanguage(ext);
  
  // If no API key, fall back to basic regex analysis
  if (!API_KEY) {
    console.warn("[CodeAnalyzer] No DEEPSEEK_API_KEY, using basic regex analysis");
    return analyzeCodeBasic(code, filePath);
  }

  try {
    const prompt = `You are an expert security code auditor. Analyze this ${language} code for security vulnerabilities.

FILE: ${filePath}

\`\`\`${language}
${code}
\`\`\`

Find ALL security vulnerabilities including:
- SQL Injection (string concatenation in queries, template literals with user input)
- XSS (unsanitized output, innerHTML, document.write)
- Command Injection (exec, spawn with user input)
- Path Traversal (file operations with user input without validation)
- IDOR (accessing resources without authorization checks)
- Sensitive Data Exposure (passwords in responses, hardcoded secrets)

For EACH vulnerability found, provide the EXACT fix.

Return ONLY valid JSON in this format:
{
  "vulnerabilities": [
    {
      "type": "SQL Injection",
      "severity": "Critical",
      "line": 45,
      "code": "the vulnerable line of code",
      "description": "why this is vulnerable"
    }
  ],
  "fixes": [
    {
      "type": "SQL Injection",
      "line": 45,
      "original": "exact original line",
      "fixed": "exact fixed line with proper escaping",
      "explanation": "what was changed and why"
    }
  ],
  "summary": "brief overall assessment"
}

Be thorough and find ALL vulnerabilities. Return valid JSON only, no markdown.`;

    const res = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { 
            role: "system", 
            content: "You are an expert security auditor. Analyze code for vulnerabilities and provide exact fixes. Return only valid JSON." 
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 4000,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[CodeAnalyzer] DeepSeek API error: ${res.status}`, err);
      return analyzeCodeBasic(code, filePath);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    
    console.log("[CodeAnalyzer] DeepSeek response:", content.substring(0, 200));

    // Parse AI response
    let parsed;
    try {
      // Try to extract JSON from response (might have markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(content);
      }
    } catch (parseErr) {
      console.error("[CodeAnalyzer] Failed to parse AI response:", parseErr);
      return analyzeCodeBasic(code, filePath);
    }

    return {
      filePath,
      language,
      vulnerabilities: (parsed.vulnerabilities || []).map((v: any) => ({
        type: v.type || "Unknown",
        severity: v.severity || "Medium",
        line: v.line || 0,
        code: v.code || "",
        description: v.description || "",
      })),
      fixes: (parsed.fixes || []).map((f: any) => ({
        type: f.type || "Unknown",
        line: f.line || 0,
        original: f.original || "",
        fixed: f.fixed || "",
        explanation: f.explanation || "",
      })),
      aiAnalysis: parsed.summary,
    };
  } catch (err) {
    console.error("[CodeAnalyzer] Error calling DeepSeek:", err);
    return analyzeCodeBasic(code, filePath);
  }
}

/**
 * Generate fix for a specific vulnerability using DeepSeek AI
 */
export async function generateAIFix(
  code: string, 
  vulnerability: VulnerablePattern,
  filePath: string
): Promise<CodeFix | null> {
  if (!API_KEY) {
    return null;
  }

  try {
    const prompt = `Fix this ${vulnerability.type} vulnerability in ${filePath}.

VULNERABLE CODE (line ${vulnerability.line}):
\`\`\`
${vulnerability.code}
\`\`\`

CONTEXT:
${vulnerability.context || code.split('\n').slice(Math.max(0, vulnerability.line - 5), vulnerability.line + 5).join('\n')}

VULNERABILITY: ${vulnerability.description}

Provide the EXACT fixed code that:
1. Prevents the ${vulnerability.type} attack
2. Maintains the same functionality
3. Follows security best practices

Return ONLY valid JSON:
{
  "original": "exact original line",
  "fixed": "exact fixed line",
  "explanation": "what was changed"
}`;

    const res = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "You are a security expert. Provide exact code fixes. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);

    return {
      type: vulnerability.type,
      line: vulnerability.line,
      original: parsed.original || vulnerability.code,
      fixed: parsed.fixed || "",
      explanation: parsed.explanation || "",
    };
  } catch (err) {
    console.error("[CodeAnalyzer] Error generating AI fix:", err);
    return null;
  }
}

/**
 * Apply fixes to source code
 */
export function applyFixes(code: string, fixes: CodeFix[]): string {
  const lines = code.split('\n');
  
  // Sort fixes by line number in descending order
  const sortedFixes = [...fixes].sort((a, b) => b.line - a.line);
  
  for (const fix of sortedFixes) {
    if (fix.line > 0 && fix.line <= lines.length && fix.fixed) {
      // Find the line that matches the original
      const lineIndex = fix.line - 1;
      const currentLine = lines[lineIndex];
      
      // Try exact match first
      if (fix.original && currentLine.includes(fix.original.trim())) {
        lines[lineIndex] = currentLine.replace(fix.original.trim(), fix.fixed.trim());
      } else {
        // Replace the entire line
        lines[lineIndex] = fix.fixed;
      }
      
      console.log(`[CodeAnalyzer] Applied fix at line ${fix.line}: ${fix.type}`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Basic regex-based analysis (fallback when no API key)
 */
function analyzeCodeBasic(code: string, filePath: string): AnalysisResult {
  const vulnerabilities: VulnerablePattern[] = [];
  const fixes: CodeFix[] = [];
  const lines = code.split('\n');
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const language = getLanguage(ext);

  // SQL Injection patterns
  const sqlPatterns = [
    { regex: /`.*SELECT.*\$\{/i, type: "SQL Injection" },
    { regex: /`.*INSERT.*\$\{/i, type: "SQL Injection" },
    { regex: /`.*UPDATE.*\$\{/i, type: "SQL Injection" },
    { regex: /`.*DELETE.*\$\{/i, type: "SQL Injection" },
    { regex: /['"].*SELECT.*['"]\s*\+/i, type: "SQL Injection" },
  ];

  // XSS patterns
  const xssPatterns = [
    { regex: /innerHTML\s*=/, type: "XSS" },
    { regex: /document\.write\s*\(/, type: "XSS" },
    { regex: /\.html\s*\([^)]*\+/, type: "XSS" },
  ];

  // Command Injection patterns
  const cmdPatterns = [
    { regex: /exec\s*\(\s*`[^`]*\$\{/, type: "Command Injection" },
    { regex: /exec\s*\([^)]*\+/, type: "Command Injection" },
  ];

  // Path Traversal patterns
  const pathPatterns = [
    { regex: /path\.join\s*\([^)]*(?:req\.|params\.|query\.|body\.)/, type: "Path Traversal" },
    { regex: /fs\.(?:read|write).*(?:req\.|params\.|query\.|body\.)/, type: "Path Traversal" },
  ];

  const allPatterns = [
    ...sqlPatterns.map(p => ({ ...p, severity: "Critical" as const })),
    ...xssPatterns.map(p => ({ ...p, severity: "High" as const })),
    ...cmdPatterns.map(p => ({ ...p, severity: "Critical" as const })),
    ...pathPatterns.map(p => ({ ...p, severity: "High" as const })),
  ];

  lines.forEach((line, index) => {
    for (const pattern of allPatterns) {
      if (pattern.regex.test(line)) {
        vulnerabilities.push({
          type: pattern.type,
          severity: pattern.severity,
          line: index + 1,
          code: line.trim(),
          description: `Potential ${pattern.type} vulnerability detected`,
        });

        // Generate basic fix
        const fix = generateBasicFix(line, pattern.type, index + 1);
        if (fix) {
          fixes.push(fix);
        }
      }
    }
  });

  return { filePath, vulnerabilities, fixes, language };
}

/**
 * Generate basic fix without AI
 */
function generateBasicFix(line: string, type: string, lineNum: number): CodeFix | null {
  let fixed = line;
  let explanation = "";

  switch (type) {
    case "SQL Injection":
      // Replace template literals with parameterized queries
      if (line.includes('${')) {
        const vars = line.match(/\$\{([^}]+)\}/g)?.map(m => m.slice(2, -1)) || [];
        fixed = line.replace(/\$\{[^}]+\}/g, '?');
        explanation = `Use parameterized query with variables: ${vars.join(', ')}`;
      }
      break;

    case "XSS":
      if (line.includes('innerHTML')) {
        fixed = line.replace('innerHTML', 'textContent');
        explanation = "Changed innerHTML to textContent to prevent XSS";
      }
      break;

    case "Command Injection":
      fixed = `  // BLOCKED: ${line.trim()}\n  throw new Error('Command execution blocked by AEGIS');`;
      explanation = "Blocked dangerous command execution";
      break;

    case "Path Traversal":
      fixed = line + ".replace(/\\.\\./g, '')";
      explanation = "Added path traversal sanitization";
      break;

    default:
      return null;
  }

  return {
    type,
    line: lineNum,
    original: line,
    fixed,
    explanation,
  };
}

/**
 * Detect language from file extension
 */
function getLanguage(ext: string): string {
  const langMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript', 
    'tsx': 'typescript',
    'py': 'python',
    'php': 'php',
    'rb': 'ruby',
    'java': 'java',
    'cs': 'csharp',
    'go': 'go',
  };
  return langMap[ext] || 'unknown';
}

/**
 * Generate analysis report
 */
export function generateReport(results: AnalysisResult[]): string {
  let report = `# AEGIS Security Analysis Report (AI-Powered)\n\n`;
  report += `Generated: ${new Date().toISOString()}\n`;
  report += `Powered by: DeepSeek AI\n\n`;
  
  let totalVulns = 0;
  let totalFixes = 0;
  
  for (const result of results) {
    totalVulns += result.vulnerabilities.length;
    totalFixes += result.fixes.length;
    
    if (result.vulnerabilities.length > 0) {
      report += `## ${result.filePath}\n\n`;
      
      if (result.aiAnalysis) {
        report += `**AI Summary:** ${result.aiAnalysis}\n\n`;
      }
      
      for (const vuln of result.vulnerabilities) {
        report += `### ${vuln.type} (${vuln.severity}) - Line ${vuln.line}\n`;
        report += `- **Description:** ${vuln.description}\n`;
        report += `- **Code:** \`${vuln.code}\`\n\n`;
      }
    }
  }
  
  report += `\n## Summary\n`;
  report += `- Files analyzed: ${results.length}\n`;
  report += `- Vulnerabilities found: ${totalVulns}\n`;
  report += `- Fixes generated: ${totalFixes}\n`;
  
  return report;
}
