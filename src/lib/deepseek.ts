const API_KEY = process.env.DEEPSEEK_API_KEY!;
const BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

async function callDeepseek(system: string, prompt: string, maxTokens = 500) {
  const res = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Deepseek API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "{}";
}

function parseJSON(raw: string, fallback: Record<string, unknown> = {}) {
  // Strip markdown code fences if present
  const cleaned = raw.replace(/```(?:json)?\s*/g, "").replace(/```\s*$/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return fallback;
  }
}

/* ────────────────────────────────────────────
 * 1. Analyze attack (existing feature)
 * ──────────────────────────────────────────── */
export async function analyzeAttack(attack: {
  type: string;
  severity: string;
  payloadSnippet: string;
  targetEndpoint: string;
  method: string;
  sourceIp: string;
}) {
  const prompt = `Analyze this detected attack and provide a brief assessment.

Attack Type: ${attack.type}
Severity: ${attack.severity}
Payload: ${attack.payloadSnippet}
Target: ${attack.method} ${attack.targetEndpoint}
Source IP: ${attack.sourceIp}

Provide in JSON format:
{
  "threat_level": "critical|high|medium|low",
  "analysis": "brief explanation of the attack vector",
  "recommendation": "recommended action",
  "is_false_positive_likely": true/false,
  "confidence": 0-100
}

Return only valid JSON, no markdown.`;

  const raw = await callDeepseek(
    "You are a cybersecurity expert. Return only valid JSON.",
    prompt,
  );
  return parseJSON(raw, {
    analysis: raw,
    threat_level: attack.severity.toLowerCase(),
    recommendation: "Manual review needed",
    is_false_positive_likely: false,
    confidence: 50,
  });
}

/* ────────────────────────────────────────────
 * 2. AI-powered healing recommendation
 * ──────────────────────────────────────────── */
export interface HealingRecommendation {
  shouldHeal: boolean;
  isFalsePositive: boolean;
  severity: "Critical" | "High" | "Medium" | "Low";
  attackType: string;
  patchName: string;
  wafRuleId: string;
  blockPattern: string;     // regex pattern the WAF should use
  explanation: string;
  confidence: number;
}

export async function recommendHealing(attack: {
  attackType: string;
  severity: string;
  payload: string;
  endpoint: string;
  method: string;
  sourceIp: string;
}): Promise<HealingRecommendation> {
  const prompt = `A web application detected a potential attack. Analyze and recommend healing action.

Attack Type (detected): ${attack.attackType}
Severity (detected): ${attack.severity}
Raw Payload: ${attack.payload}
Target Endpoint: ${attack.method} ${attack.endpoint}
Source IP: ${attack.sourceIp}

IMPORTANT RULES:
- First determine if this is a REAL attack or a FALSE POSITIVE (normal user input that happens to look suspicious)
- Normal login like {"username":"admin","password":"admin123"} is NOT an attack
- Only mark shouldHeal=true if you are confident it's a real attack (confidence >= 70)
- For attackType, use the standard category: "SQL Injection", "XSS", "Path Traversal", "Command Injection", "RCE", "SSRF", "CSRF", "LFI", "Brute Force", "Open Redirect", etc.
- For patchName, describe the defensive measure (e.g. "WAF SQL Filter + Parameterized Queries", "CSP Header + Output Encoding")
- For wafRuleId, use format "WAF-XXX-001" (e.g. WAF-SQL-001, WAF-XSS-001, WAF-PT-001, WAF-CMD-001, WAF-RCE-001)
- For blockPattern, provide a JavaScript-compatible regex pattern string that matches this attack's signature. This will be used as: new RegExp(blockPattern, "i"). Make it catch the attack category broadly, not just this exact payload.

Return JSON:
{
  "shouldHeal": true/false,
  "isFalsePositive": true/false,
  "severity": "Critical|High|Medium|Low",
  "attackType": "standard category name",
  "patchName": "descriptive patch name",
  "wafRuleId": "WAF-XXX-001",
  "blockPattern": "regex pattern string",
  "explanation": "brief explanation",
  "confidence": 0-100
}

Return only valid JSON, no markdown.`;

  const raw = await callDeepseek(
    "You are an expert cybersecurity WAF engine. You analyze attack payloads and recommend precise healing actions. Return only valid JSON.",
    prompt,
    600,
  );

  const parsed = parseJSON(raw, {});

  // Fallback if AI response is invalid
  if (!parsed.attackType) {
    return {
      shouldHeal: true,
      isFalsePositive: false,
      severity: (attack.severity as HealingRecommendation["severity"]) || "High",
      attackType: attack.attackType || "Unknown",
      patchName: `Auto Patch — ${attack.attackType}`,
      wafRuleId: "WAF-GEN-001",
      blockPattern: "",
      explanation: "AI analysis unavailable, applying generic protection",
      confidence: 50,
    };
  }

  return {
    shouldHeal: parsed.shouldHeal ?? true,
    isFalsePositive: parsed.isFalsePositive ?? false,
    severity: parsed.severity || attack.severity || "High",
    attackType: parsed.attackType || attack.attackType,
    patchName: parsed.patchName || `Auto Patch — ${attack.attackType}`,
    wafRuleId: parsed.wafRuleId || "WAF-GEN-001",
    blockPattern: parsed.blockPattern || "",
    explanation: parsed.explanation || "",
    confidence: parsed.confidence ?? 70,
  };
}

/* ────────────────────────────────────────────
 * 3. AI-powered Auto-Fix (Remediation)
 * ──────────────────────────────────────────── */
export async function generateAutoFix(vuln: {
  type: string;
  severity: string;
  file: string;
  line: number;
  code: string;
  description: string;
}) {
  const prompt = `As a security expert, provide a fix for the following vulnerability.
  
Vulnerability Type: ${vuln.type}
Severity: ${vuln.severity}
File: ${vuln.file}:${vuln.line}
Code Snippet: 
${vuln.code}

Description: ${vuln.description}

Provide the fix in JSON format:
{
  "fixedCode": "the complete fixed code snippet",
  "explanation": "brief explanation of the fix",
  "confidence": 0.0-1.0
}

Return only valid JSON, no markdown code blocks.`;

  const raw = await callDeepseek(
    "You are AEGIS AI, an advanced vulnerability remediation engine. You output high-quality, secure code fixes in JSON format.",
    prompt,
    1000
  );

  return parseJSON(raw, {
    fixedCode: vuln.code,
    explanation: "AI analysis failed, manual review recommended.",
    confidence: 0.1
  });
}
