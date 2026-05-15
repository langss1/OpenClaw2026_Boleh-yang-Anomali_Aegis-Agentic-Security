/**
 * AEGIS Phase 3 - CVE Monitoring & Auto-Update
 * 
 * Monitors National Vulnerability Database (NVD) for new CVEs
 * that affect the project's dependencies, then:
 * 1. Notifies via Telegram
 * 2. Suggests patches/updates
 * 3. Auto-applies safe updates (with HITL approval)
 */

import { sendMessage, getChatId } from "./telegram";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

// NVD API (free, no key required for basic queries)
const NVD_API_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0";

export interface CVEResult {
  id: string;
  description: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";
  cvssScore: number;
  affectedProduct: string;
  publishedDate: string;
  lastModified: string;
  references: string[];
  recommendation?: string;
}

export interface DependencyInfo {
  name: string;
  version: string;
  ecosystem: "npm" | "pip" | "cargo" | "maven" | "composer";
}

// Known vulnerable patterns (cached from NVD)
const knownVulnerabilities: Map<string, CVEResult[]> = new Map();

/**
 * Search NVD for CVEs affecting a specific product/keyword
 */
export async function searchCVE(keyword: string, daysBack: number = 30): Promise<CVEResult[]> {
  try {
    const pubStartDate = new Date();
    pubStartDate.setDate(pubStartDate.getDate() - daysBack);
    
    const params = new URLSearchParams({
      keywordSearch: keyword,
      pubStartDate: pubStartDate.toISOString().split('.')[0] + "Z",
      resultsPerPage: "20",
    });

    const response = await fetch(`${NVD_API_URL}?${params}`, {
      headers: {
        "User-Agent": "AEGIS-Security-Monitor/1.0",
      },
    });

    if (!response.ok) {
      console.error(`NVD API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const results: CVEResult[] = [];

    for (const vuln of data.vulnerabilities || []) {
      const cve = vuln.cve;
      const metrics = cve.metrics?.cvssMetricV31?.[0] || cve.metrics?.cvssMetricV30?.[0] || cve.metrics?.cvssMetricV2?.[0];
      
      results.push({
        id: cve.id,
        description: cve.descriptions?.find((d: any) => d.lang === "en")?.value || "No description",
        severity: metrics?.cvssData?.baseSeverity || "NONE",
        cvssScore: metrics?.cvssData?.baseScore || 0,
        affectedProduct: keyword,
        publishedDate: cve.published,
        lastModified: cve.lastModified,
        references: cve.references?.map((r: any) => r.url) || [],
      });
    }

    return results;
  } catch (err) {
    console.error("CVE search error:", err);
    return [];
  }
}

/**
 * AI-powered CVE analysis and recommendation
 */
export async function analyzeCVE(cve: CVEResult, projectContext: string): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    return `Update affected package to latest version. Check vendor advisory for ${cve.id}.`;
  }

  try {
    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "You are a security expert. Analyze CVEs and provide actionable remediation steps. Be concise."
          },
          {
            role: "user",
            content: `Analyze this CVE and provide remediation for a project using ${projectContext}:

CVE ID: ${cve.id}
Severity: ${cve.severity} (CVSS: ${cve.cvssScore})
Description: ${cve.description}
Affected: ${cve.affectedProduct}

Provide:
1. Impact assessment (1-2 sentences)
2. Remediation steps (numbered list)
3. Safe version to upgrade to (if applicable)
4. Temporary mitigation if upgrade not possible`
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No recommendation available";
  } catch (err) {
    console.error("CVE analysis error:", err);
    return `Update affected package to latest version. Check vendor advisory for ${cve.id}.`;
  }
}

/**
 * Parse package.json and extract dependencies
 */
export function parsePackageJson(packageJson: any): DependencyInfo[] {
  const deps: DependencyInfo[] = [];
  
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  for (const [name, version] of Object.entries(allDeps)) {
    deps.push({
      name,
      version: String(version).replace(/[\^~>=<]/g, ""),
      ecosystem: "npm",
    });
  }

  return deps;
}

/**
 * Check dependencies for known CVEs
 */
export async function checkDependenciesForCVEs(
  dependencies: DependencyInfo[],
  onProgress?: (msg: string) => void
): Promise<Map<string, CVEResult[]>> {
  const results = new Map<string, CVEResult[]>();
  
  // Focus on high-risk packages
  const highRiskPackages = [
    "express", "lodash", "axios", "node-fetch", "jsonwebtoken",
    "passport", "mongoose", "sequelize", "mysql", "pg", "sqlite3",
    "bcrypt", "crypto", "helmet", "cors", "cookie-parser",
    "multer", "sharp", "imagemagick", "ffmpeg", "puppeteer",
  ];

  for (const dep of dependencies) {
    // Only check high-risk or well-known packages to reduce API calls
    if (!highRiskPackages.includes(dep.name.toLowerCase())) continue;

    onProgress?.(`Checking ${dep.name}@${dep.version}...`);
    
    // Search NVD for this package
    const cves = await searchCVE(dep.name, 90);
    
    if (cves.length > 0) {
      // Filter to high/critical only
      const critical = cves.filter(c => c.severity === "CRITICAL" || c.severity === "HIGH");
      if (critical.length > 0) {
        results.set(dep.name, critical);
      }
    }

    // Rate limiting - NVD allows ~5 requests per 30 seconds without API key
    await new Promise(r => setTimeout(r, 6000));
  }

  return results;
}

/**
 * Monitor project for new CVEs and notify
 */
export async function monitorProjectCVEs(
  packageJsonPath: string,
  notifyTelegram: boolean = true
): Promise<{
  vulnerablePackages: number;
  criticalCVEs: CVEResult[];
  recommendations: Map<string, string>;
}> {
  const fs = await import("fs");
  
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`package.json not found at ${packageJsonPath}`);
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  const dependencies = parsePackageJson(packageJson);

  console.log(`[CVE Monitor] Checking ${dependencies.length} dependencies...`);

  const vulnerabilities = await checkDependenciesForCVEs(dependencies, (msg) => {
    console.log(`[CVE Monitor] ${msg}`);
  });

  const criticalCVEs: CVEResult[] = [];
  const recommendations = new Map<string, string>();

  for (const [pkg, cves] of vulnerabilities) {
    criticalCVEs.push(...cves);
    
    // Get AI recommendation for the most severe CVE
    const mostSevere = cves.sort((a, b) => b.cvssScore - a.cvssScore)[0];
    const recommendation = await analyzeCVE(mostSevere, `${pkg} in a Node.js project`);
    recommendations.set(pkg, recommendation);

    // Notify via Telegram
    if (notifyTelegram) {
      const chatId = getChatId();
      if (chatId) {
        const message = `🚨 <b>CVE Alert: ${pkg}</b>

<b>${mostSevere.id}</b> - ${mostSevere.severity}
CVSS Score: ${mostSevere.cvssScore}/10

${mostSevere.description.substring(0, 200)}...

<b>Recommendation:</b>
${recommendation.substring(0, 500)}

Reply with:
• <code>/update ${pkg}</code> to auto-update
• <code>/ignore ${mostSevere.id}</code> to dismiss`;

        await sendMessage(chatId, message);
      }
    }
  }

  return {
    vulnerablePackages: vulnerabilities.size,
    criticalCVEs,
    recommendations,
  };
}

/**
 * Continuous CVE monitoring (runs as background job)
 */
export class CVEMonitorService {
  private intervalId: NodeJS.Timeout | null = null;
  private projectPath: string;
  private checkIntervalHours: number;

  constructor(projectPath: string, checkIntervalHours: number = 24) {
    this.projectPath = projectPath;
    this.checkIntervalHours = checkIntervalHours;
  }

  start(): void {
    console.log(`[CVE Monitor] Starting monitoring for ${this.projectPath}`);
    console.log(`[CVE Monitor] Check interval: ${this.checkIntervalHours} hours`);

    // Initial check
    this.runCheck();

    // Schedule periodic checks
    this.intervalId = setInterval(
      () => this.runCheck(),
      this.checkIntervalHours * 60 * 60 * 1000
    );
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("[CVE Monitor] Stopped");
    }
  }

  private async runCheck(): Promise<void> {
    console.log(`[CVE Monitor] Running check at ${new Date().toISOString()}`);
    
    try {
      const packageJsonPath = `${this.projectPath}/package.json`;
      const result = await monitorProjectCVEs(packageJsonPath, true);
      
      console.log(`[CVE Monitor] Found ${result.vulnerablePackages} vulnerable packages`);
      console.log(`[CVE Monitor] Total critical CVEs: ${result.criticalCVEs.length}`);
    } catch (err) {
      console.error("[CVE Monitor] Check failed:", err);
    }
  }
}

// Export singleton for use in API routes
let cveMonitorInstance: CVEMonitorService | null = null;

export function getCVEMonitor(projectPath?: string): CVEMonitorService {
  if (!cveMonitorInstance && projectPath) {
    cveMonitorInstance = new CVEMonitorService(projectPath);
  }
  return cveMonitorInstance!;
}
