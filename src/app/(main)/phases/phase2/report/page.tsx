"use client";

import { useState, useEffect } from "react";
import { FileText, Download, RefreshCw, Calendar, Target, AlertTriangle, ArrowLeft, Wand2, CheckCircle, Loader2, Code, Sparkles } from "lucide-react";
import Link from "next/link";

// Same localStorage key as pentest page
const STORAGE_KEY = "aegis_pentest_state";

interface ScanResult {
  category: string;
  testName: string;
  status: "pending" | "running" | "vulnerable" | "secure" | "error";
  severity?: string;
  details?: string;
}

interface ScanSummary {
  total: number;
  vulnerable: number;
  secure: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface ScanState {
  deployment: any;
  results: ScanResult[];
  summary: ScanSummary | null;
  isScanning: boolean;
  scanProgress: number;
  currentTest: string;
  scanStartTime: number | null;
  scanEndTime: number | null;
  targetUrl: string | null;
}

interface PentestReport {
  targetUrl: string;
  scanDate: string;
  duration: string;
  totalTests: number;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  findings: {
    category: string;
    vulnerability: string;
    severity: string;
    evidence: string;
    recommendation: string;
  }[];
}

// Recommendations for each vulnerability type
const recommendations: Record<string, { evidence: string; recommendation: string }> = {
  "IDOR": {
    evidence: "Unauthorized access to other users' resources by manipulating object references",
    recommendation: "Implement proper access control checks and use indirect references or UUIDs"
  },
  "Privilege Escalation": {
    evidence: "User able to access admin functions without proper authorization",
    recommendation: "Implement role-based access control (RBAC) and verify permissions server-side"
  },
  "Path Traversal": {
    evidence: "File system access outside intended directory using ../ sequences",
    recommendation: "Sanitize file paths and use allowlists for accessible directories"
  },
  "Sensitive Data Exposure": {
    evidence: "Sensitive information transmitted or stored without encryption",
    recommendation: "Use TLS for data in transit and encrypt sensitive data at rest"
  },
  "Weak Encryption": {
    evidence: "Use of deprecated or weak cryptographic algorithms",
    recommendation: "Use strong encryption (AES-256) and secure key management"
  },
  "SQL Injection": {
    evidence: "User input directly concatenated into SQL queries",
    recommendation: "Use parameterized queries or prepared statements"
  },
  "Command Injection": {
    evidence: "User input executed as system commands",
    recommendation: "Avoid system calls with user input; use allowlists if necessary"
  },
  "XSS": {
    evidence: "User input reflected in page without proper encoding",
    recommendation: "Implement Content Security Policy and encode all output"
  },
  "Business Logic Flaws": {
    evidence: "Application logic can be bypassed or manipulated",
    recommendation: "Implement server-side validation for all business rules"
  },
  "Missing Rate Limits": {
    evidence: "No throttling on sensitive endpoints",
    recommendation: "Implement rate limiting and account lockout policies"
  },
  "Default Credentials": {
    evidence: "Application uses default or common credentials",
    recommendation: "Force credential change on first login; remove default accounts"
  },
  "Verbose Errors": {
    evidence: "Detailed error messages expose system information",
    recommendation: "Use generic error messages in production; log details server-side"
  },
  "Outdated Libraries": {
    evidence: "Dependencies with known vulnerabilities detected",
    recommendation: "Update to latest secure versions; implement dependency scanning"
  },
  "Known CVEs": {
    evidence: "Components with published CVE vulnerabilities",
    recommendation: "Patch or upgrade affected components immediately"
  },
  "Brute Force": {
    evidence: "No protection against automated login attempts",
    recommendation: "Implement CAPTCHA, rate limiting, and account lockout"
  },
  "Session Fixation": {
    evidence: "Session ID not regenerated after authentication",
    recommendation: "Regenerate session ID after login and implement secure session management"
  },
  "Insecure Deserialization": {
    evidence: "Untrusted data deserialized without validation",
    recommendation: "Validate and sanitize serialized data; use safe serialization formats"
  },
  "Missing Audit Logs": {
    evidence: "Security events not properly logged",
    recommendation: "Implement comprehensive logging for authentication and authorization events"
  },
  "Server-Side Request Forgery": {
    evidence: "Server can be tricked into making requests to internal resources",
    recommendation: "Validate and sanitize URLs; use allowlists for external requests"
  }
};

interface FixResult {
  id: string;
  filePath: string;
  fixCount: number;
  status: string;
}

interface FixItem {
  id: string;
  filePath: string;
  type: string;
  line: number;
  original: string;
  fixed: string;
  explanation: string;
  status: "pending" | "accepted" | "rejected" | "applied";
}

interface AutoFixResponse {
  ok: boolean;
  summary: {
    filesAnalyzed: number;
    vulnerabilitiesFound: number;
    fixesGenerated: number;
    fixesApplied: number;
  };
  appliedFixes: FixResult[];
  results: {
    filePath: string;
    vulnerabilities: { type: string; severity: string; line: number; description: string }[];
    fixes: { type: string; line: number; original: string; fixed: string; explanation: string }[];
  }[];
}

export default function PentestReportPage() {
  const [report, setReport] = useState<PentestReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [noData, setNoData] = useState(false);
  
  // Auto-fix state
  const [isFixing, setIsFixing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [fixResult, setFixResult] = useState<AutoFixResponse | null>(null);
  const [fixError, setFixError] = useState<string | null>(null);
  const [deploymentPath, setDeploymentPath] = useState<string | null>(null);
  const [pendingFixes, setPendingFixes] = useState<FixItem[]>([]);
  const [appliedFixTypes, setAppliedFixTypes] = useState<string[]>([]);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = () => {
    setLoading(true);
    setNoData(false);
    
    // First try to load from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const scanState: ScanState = JSON.parse(saved);
          
          // Get deployment path for auto-fix
          if (scanState.deployment?.projectPath) {
            setDeploymentPath(scanState.deployment.projectPath);
          }
          
          // Check if we have completed scan data
          if (scanState.summary && scanState.results && scanState.results.length > 0) {
            const vulnerableResults = scanState.results.filter(r => r.status === "vulnerable");
            
            // Build report from localStorage data
            const reportData: PentestReport = {
              targetUrl: scanState.targetUrl || scanState.deployment?.ngrokUrl || "Unknown",
              scanDate: scanState.scanStartTime ? new Date(scanState.scanStartTime).toISOString() : new Date().toISOString(),
              duration: scanState.scanStartTime && scanState.scanEndTime 
                ? `${Math.round((scanState.scanEndTime - scanState.scanStartTime) / 1000)}s`
                : "N/A",
              totalTests: scanState.summary.total,
              summary: {
                critical: scanState.summary.critical,
                high: scanState.summary.high,
                medium: scanState.summary.medium,
                low: scanState.summary.low,
              },
              findings: vulnerableResults.map(r => {
                const rec = recommendations[r.testName] || {
                  evidence: r.details || `${r.testName} vulnerability detected`,
                  recommendation: "Review and fix the identified security issue"
                };
                return {
                  category: r.category,
                  vulnerability: r.testName,
                  severity: r.severity || "Medium",
                  evidence: rec.evidence,
                  recommendation: rec.recommendation
                };
              })
            };
            
            setReport(reportData);
            setMarkdownContent(generateMarkdown(reportData));
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error("Failed to parse localStorage:", err);
        }
      }
    }
    
    // No data in localStorage
    setNoData(true);
    setLoading(false);
  };

  // Load applied fix types from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aegis_applied_fixes");
      if (saved) {
        try {
          setAppliedFixTypes(JSON.parse(saved));
        } catch {}
      }
    }
  }, []);

  // Auto-fix function - DRY RUN first to show preview
  const runAutoFix = async () => {
    if (!report || report.findings.length === 0) {
      setFixError("No vulnerabilities to fix");
      return;
    }

    setIsFixing(true);
    setFixError(null);
    setFixResult(null);
    setPendingFixes([]);

    try {
      // Use default vulnerable app path or deployment path
      const targetPath = deploymentPath || process.env.NEXT_PUBLIC_VULNERABLE_APP_PATH || "D:/refactory/AEGIS/vulnerable-app";
      
      // First, run in DRY RUN mode to preview fixes
      const response = await fetch("/api/autofix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetPath,
          autoCommit: false,
          dryRun: true, // Preview mode - don't apply yet
        }),
      });

      const data = await response.json();

      if (data.ok) {
        setFixResult(data);
        
        // Convert results to pending fixes for human review
        const fixes: FixItem[] = [];
        data.results.forEach((result: any) => {
          result.fixes.forEach((fix: any, idx: number) => {
            fixes.push({
              id: `${result.filePath}-${fix.line}-${idx}`,
              filePath: result.filePath,
              type: fix.type,
              line: fix.line,
              original: fix.original,
              fixed: fix.fixed,
              explanation: fix.explanation,
              status: "pending",
            });
          });
        });
        setPendingFixes(fixes);
      } else {
        setFixError(data.error || "Auto-fix analysis failed");
      }
    } catch (err: any) {
      setFixError(err.message || "Failed to run auto-fix");
    } finally {
      setIsFixing(false);
    }
  };

  // Accept a single fix
  const acceptFix = (fixId: string) => {
    setPendingFixes(prev => 
      prev.map(f => f.id === fixId ? { ...f, status: "accepted" as const } : f)
    );
  };

  // Reject a single fix
  const rejectFix = (fixId: string) => {
    setPendingFixes(prev => 
      prev.map(f => f.id === fixId ? { ...f, status: "rejected" as const } : f)
    );
  };

  // Accept all fixes
  const acceptAllFixes = () => {
    setPendingFixes(prev => 
      prev.map(f => f.status === "pending" ? { ...f, status: "accepted" as const } : f)
    );
  };

  // Reject all fixes
  const rejectAllFixes = () => {
    setPendingFixes(prev => 
      prev.map(f => f.status === "pending" ? { ...f, status: "rejected" as const } : f)
    );
  };

  // Apply accepted fixes
  const applyAcceptedFixes = async () => {
    const acceptedFixes = pendingFixes.filter(f => f.status === "accepted");
    if (acceptedFixes.length === 0) {
      setFixError("No fixes accepted to apply");
      return;
    }

    setIsApplying(true);
    setFixError(null);

    try {
      // Group fixes by file
      const fixesByFile: Record<string, FixItem[]> = {};
      acceptedFixes.forEach(fix => {
        if (!fixesByFile[fix.filePath]) {
          fixesByFile[fix.filePath] = [];
        }
        fixesByFile[fix.filePath].push(fix);
      });

      // Apply fixes file by file
      for (const [filePath, fixes] of Object.entries(fixesByFile)) {
        for (const fix of fixes) {
          const response = await fetch("/api/code/fix", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              file: filePath.replace(/^.*[\\\/]vulnerable-app[\\\/]/, ""),
              fix: {
                type: fix.type,
                line: fix.line,
                original: fix.original,
                fixed: fix.fixed,
                explanation: fix.explanation,
              },
            }),
          });

          if (response.ok) {
            // Mark as applied
            setPendingFixes(prev =>
              prev.map(f => f.id === fix.id ? { ...f, status: "applied" as const } : f)
            );
            
            // Track applied fix types to filter out in future pentests
            // Normalize fix type to match pentest mapping (e.g., "SQL Injection" -> "SQL_INJECTION")
            const normalizedType = fix.type.toUpperCase().replace(/\s+/g, "_");
            setAppliedFixTypes(prev => {
              const updated = [...new Set([...prev, normalizedType, fix.type])];
              localStorage.setItem("aegis_applied_fixes", JSON.stringify(updated));
              return updated;
            });
          }
        }
      }

      // Show success message
      setFixError(null);
    } catch (err: any) {
      setFixError(err.message || "Failed to apply fixes");
    } finally {
      setIsApplying(false);
    }
  };

  // Get counts for UI
  const pendingCount = pendingFixes.filter(f => f.status === "pending").length;
  const acceptedCount = pendingFixes.filter(f => f.status === "accepted").length;
  const rejectedCount = pendingFixes.filter(f => f.status === "rejected").length;
  const appliedCount = pendingFixes.filter(f => f.status === "applied").length;

  const generateMarkdown = (data: PentestReport): string => {
    let md = `# AEGIS Security Assessment Report

## Executive Summary
- **Target URL**: ${data.targetUrl}
- **Scan Date**: ${new Date(data.scanDate).toLocaleString()}
- **Duration**: ${data.duration}
- **Total Tests**: ${data.totalTests}

## Vulnerability Summary
| Severity | Count |
|----------|-------|
| Critical | ${data.summary.critical} |
| High | ${data.summary.high} |
| Medium | ${data.summary.medium} |
| Low | ${data.summary.low} |

## Detailed Findings
`;
    
    data.findings.forEach((f, i) => {
      md += `
### ${i + 1}. ${f.vulnerability} (${f.severity})
**Category**: ${f.category}

**Evidence**: ${f.evidence}

**Recommendation**: ${f.recommendation}
`;
    });

    md += `
---
*Generated by AEGIS Security Platform*
*Report Date: ${new Date().toLocaleString()}*
`;
    return md;
  };

  const downloadReport = () => {
    const blob = new Blob([markdownContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AEGIS_Pentest_Report_${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Critical":
        return "text-red-500 bg-red-500/10 border-red-500/30";
      case "High":
        return "text-orange-500 bg-orange-500/10 border-orange-500/30";
      case "Medium":
        return "text-yellow-500 bg-yellow-500/10 border-yellow-500/30";
      case "Low":
        return "text-blue-500 bg-blue-500/10 border-blue-500/30";
      default:
        return "text-gray-500 bg-gray-500/10 border-gray-500/30";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No data state
  if (noData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6 text-orange-500" />
              Pentest Report
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI-generated security assessment report
            </p>
          </div>
        </div>
        
        <div className="rounded-lg border-2 border-dashed border-border p-12 text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Pentest Data Available</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            You need to run a penetration test first before viewing the report.
          </p>
          <Link
            href="/pentest"
            className="inline-flex items-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Go to Pentest Page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-orange-500" />
            Pentest Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-generated security assessment report
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/pentest"
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Pentest
          </Link>
          <button
            onClick={downloadReport}
            className="flex items-center gap-2 rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            <Download className="h-4 w-4" />
            Download Report
          </button>
        </div>
      </div>

      {report && (
        <>
          {/* Report Info */}
          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Target className="h-4 w-4" />
                <span className="text-xs">Target</span>
              </div>
              <p className="text-sm font-medium truncate">{report.targetUrl}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">Scan Date</span>
              </div>
              <p className="text-sm font-medium">{new Date(report.scanDate).toLocaleDateString()}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <span className="text-xs">Duration</span>
              </div>
              <p className="text-sm font-medium">{report.duration}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <span className="text-xs">Tests Run</span>
              </div>
              <p className="text-sm font-medium">{report.totalTests}</p>
            </div>
          </div>

          {/* Severity Summary */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold mb-4">Vulnerability Summary</h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg border border-red-500/30 bg-red-500/10">
                <p className="text-3xl font-bold text-red-500">{report.summary.critical}</p>
                <p className="text-xs text-red-400 mt-1">Critical</p>
              </div>
              <div className="text-center p-4 rounded-lg border border-orange-500/30 bg-orange-500/10">
                <p className="text-3xl font-bold text-orange-500">{report.summary.high}</p>
                <p className="text-xs text-orange-400 mt-1">High</p>
              </div>
              <div className="text-center p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10">
                <p className="text-3xl font-bold text-yellow-500">{report.summary.medium}</p>
                <p className="text-xs text-yellow-400 mt-1">Medium</p>
              </div>
              <div className="text-center p-4 rounded-lg border border-blue-500/30 bg-blue-500/10">
                <p className="text-3xl font-bold text-blue-500">{report.summary.low}</p>
                <p className="text-xs text-blue-400 mt-1">Low</p>
              </div>
            </div>
          </div>

          {/* AI Auto Fix Section */}
          {report.findings.length > 0 && (
            <div className="rounded-lg border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-transparent p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Sparkles className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">AI Auto-Fix</h2>
                    <p className="text-sm text-muted-foreground">
                      Let AI analyze and fix vulnerabilities in your source code
                    </p>
                  </div>
                </div>
                {pendingFixes.length === 0 && (
                  <button
                    onClick={runAutoFix}
                    disabled={isFixing}
                    className="flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isFixing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing Code...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4" />
                        Analyze & Generate Fixes
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Fix Error */}
              {fixError && (
                <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {fixError}
                </div>
              )}

              {/* Analysis Summary */}
              {fixResult && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="text-center p-3 rounded-lg bg-card border border-border">
                      <p className="text-2xl font-bold text-foreground">{fixResult.summary.filesAnalyzed}</p>
                      <p className="text-xs text-muted-foreground">Files Analyzed</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-card border border-border">
                      <p className="text-2xl font-bold text-red-500">{fixResult.summary.vulnerabilitiesFound}</p>
                      <p className="text-xs text-muted-foreground">Vulnerabilities</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-card border border-border">
                      <p className="text-2xl font-bold text-purple-500">{fixResult.summary.fixesGenerated}</p>
                      <p className="text-xs text-muted-foreground">Fixes Generated</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                      <p className="text-2xl font-bold text-green-500">{appliedCount}</p>
                      <p className="text-xs text-green-400">Fixes Applied</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Human in the Loop - Review Fixes */}
              {pendingFixes.length > 0 && (
                <div className="mt-6 space-y-4">
                  {/* Review Header */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      <div>
                        <p className="font-semibold text-yellow-400">Human Review Required</p>
                        <p className="text-sm text-muted-foreground">
                          Review each fix before applying. {pendingCount} pending, {acceptedCount} accepted, {rejectedCount} rejected, {appliedCount} applied
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {pendingCount > 0 && (
                        <>
                          <button
                            onClick={acceptAllFixes}
                            className="px-3 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700"
                          >
                            Accept All
                          </button>
                          <button
                            onClick={rejectAllFixes}
                            className="px-3 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                          >
                            Reject All
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Fix Cards for Review */}
                  <div className="space-y-4 max-h-[500px] overflow-y-auto">
                    {pendingFixes.map((fix) => (
                      <div 
                        key={fix.id} 
                        className={`rounded-lg border p-4 ${
                          fix.status === "applied" ? "border-green-500/50 bg-green-500/5" :
                          fix.status === "accepted" ? "border-blue-500/50 bg-blue-500/5" :
                          fix.status === "rejected" ? "border-red-500/30 bg-red-500/5 opacity-50" :
                          "border-border bg-card"
                        }`}
                      >
                        {/* Fix Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Code className="h-4 w-4 text-purple-400" />
                            <span className="text-xs font-mono text-muted-foreground">{fix.filePath}</span>
                            <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded">{fix.type}</span>
                            <span className="text-xs text-muted-foreground">Line {fix.line}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {fix.status === "applied" && (
                              <span className="text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" /> Applied
                              </span>
                            )}
                            {fix.status === "accepted" && (
                              <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-1 rounded">
                                Accepted
                              </span>
                            )}
                            {fix.status === "rejected" && (
                              <span className="text-xs text-red-400 bg-red-500/20 px-2 py-1 rounded">
                                Rejected
                              </span>
                            )}
                            {fix.status === "pending" && (
                              <>
                                <button
                                  onClick={() => acceptFix(fix.id)}
                                  className="px-3 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 flex items-center gap-1"
                                >
                                  <CheckCircle className="h-3 w-3" /> Accept
                                </button>
                                <button
                                  onClick={() => rejectFix(fix.id)}
                                  className="px-3 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Code Diff */}
                        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                          <div className="p-3 rounded bg-red-500/10 border border-red-500/20">
                            <p className="text-red-400 mb-2 font-semibold">Before (Vulnerable):</p>
                            <pre className="text-red-300 whitespace-pre-wrap overflow-x-auto">{fix.original}</pre>
                          </div>
                          <div className="p-3 rounded bg-green-500/10 border border-green-500/20">
                            <p className="text-green-400 mb-2 font-semibold">After (Fixed):</p>
                            <pre className="text-green-300 whitespace-pre-wrap overflow-x-auto">{fix.fixed}</pre>
                          </div>
                        </div>

                        {/* Explanation */}
                        <p className="text-xs text-muted-foreground mt-3 p-2 bg-muted/30 rounded">
                          <strong>Explanation:</strong> {fix.explanation}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Apply Button */}
                  {acceptedCount > 0 && appliedCount < pendingFixes.length && (
                    <div className="flex justify-center pt-4">
                      <button
                        onClick={applyAcceptedFixes}
                        disabled={isApplying}
                        className="flex items-center gap-2 rounded-md bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {isApplying ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Applying Fixes...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Apply {acceptedCount} Accepted Fix(es)
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* All Applied Success */}
                  {appliedCount > 0 && appliedCount === pendingFixes.filter(f => f.status !== "rejected").length && (
                    <div className="text-center p-6 rounded-lg bg-green-500/10 border border-green-500/30">
                      <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
                      <p className="text-green-400 font-semibold text-lg">All Fixes Applied Successfully!</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {appliedCount} fix(es) have been applied to your source code.
                        <br />Run pentest again to verify the vulnerabilities are fixed.
                      </p>
                      <Link
                        href="/pentest"
                        className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-md bg-purple-600 text-white text-sm font-medium hover:bg-purple-700"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Run Pentest Again
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* No Vulnerabilities Found */}
              {fixResult && fixResult.summary.vulnerabilitiesFound === 0 && (
                <div className="mt-4 text-center p-6 rounded-lg bg-green-500/10 border border-green-500/30">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-green-400 font-medium">No vulnerabilities found in source code!</p>
                  <p className="text-sm text-muted-foreground mt-1">Your code passed the security analysis.</p>
                </div>
              )}
            </div>
          )}

          {/* Findings */}
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Detailed Findings ({report.findings.length})
              </h2>
            </div>
            <div className="divide-y divide-border">
              {report.findings.map((finding, idx) => (
                <div key={idx} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium text-foreground">{finding.vulnerability}</h3>
                      <p className="text-xs text-muted-foreground">{finding.category}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded border ${getSeverityColor(finding.severity)}`}>
                      {finding.severity}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Evidence</p>
                      <p className="text-sm text-foreground bg-muted/50 rounded p-2">{finding.evidence}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Recommendation</p>
                      <p className="text-sm text-green-400">{finding.recommendation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
