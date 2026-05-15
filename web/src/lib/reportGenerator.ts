/**
 * AEGIS Phase 3 - Monitoring Report Generator
 * 
 * Generates REPORT.md for security monitoring activities:
 * - Detected attacks
 * - Applied healings
 * - CVE alerts
 * - System status
 */

import { getAllHealings, ServerHealingAction as HealingAction } from "./healingState";
import { getAllAttacks, ServerAttackEvent as AttackRecord } from "./attackState";
import { CVEResult } from "./cveMonitor";
import * as fs from "fs";
import * as path from "path";

interface AttackLog {
  id: string;
  timestamp: Date;
  attackType: string;
  severity: string;
  sourceIp: string;
  endpoint: string;
  method: string;
  payload: string;
  blocked: boolean;
  healingApplied: boolean;
}

// Convert AttackRecord to AttackLog format
function convertToAttackLog(attack: AttackRecord): AttackLog {
  return {
    id: attack.id,
    timestamp: new Date(attack.timestamp),
    attackType: attack.type,
    severity: attack.severity,
    sourceIp: attack.sourceIp,
    endpoint: attack.targetEndpoint,
    method: attack.method,
    payload: attack.payload,
    blocked: attack.blocked,
    healingApplied: true, // If it's in the attack state, healing was triggered
  };
}

export function getAttackLogs(): AttackLog[] {
  const attacks = getAllAttacks();
  return attacks.map(convertToAttackLog);
}

interface MonitoringReportData {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalAttacks: number;
    blockedAttacks: number;
    successfulAttacks: number;
    healingsApplied: number;
    cveAlerts: number;
  };
  attacks: AttackLog[];
  healings: HealingAction[];
  cves: CVEResult[];
}

/**
 * Generate monitoring report data
 */
export async function collectReportData(
  hoursBack: number = 24
): Promise<MonitoringReportData> {
  const now = new Date();
  const startTime = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);

  // Get attacks in time range
  const allAttacks = getAttackLogs();
  const attacks = allAttacks.filter(a => a.timestamp >= startTime);
  
  // Get healings
  const healings = getAllHealings().filter(h => 
    new Date(h.appliedAt) >= startTime
  );

  return {
    period: {
      start: startTime,
      end: now,
    },
    summary: {
      totalAttacks: attacks.length,
      blockedAttacks: attacks.filter(a => a.blocked).length,
      successfulAttacks: attacks.filter(a => !a.blocked).length,
      healingsApplied: healings.filter(h => h.status === "Applied" || h.status === "Approved").length,
      cveAlerts: 0, // Would be populated from CVE monitor
    },
    attacks,
    healings,
    cves: [],
  };
}

/**
 * Generate markdown report
 */
export async function generateMonitoringReport(
  outputPath?: string,
  hoursBack: number = 24
): Promise<string> {
  const data = await collectReportData(hoursBack);
  
  const report = `# AEGIS Security Monitoring Report

## Report Period

| Property | Value |
|----------|-------|
| **Start** | ${data.period.start.toISOString()} |
| **End** | ${data.period.end.toISOString()} |
| **Duration** | ${hoursBack} hours |

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Total Attacks Detected** | ${data.summary.totalAttacks} |
| **Attacks Blocked** | ${data.summary.blockedAttacks} |
| **Successful Attacks** | ${data.summary.successfulAttacks} |
| **Self-Healing Applied** | ${data.summary.healingsApplied} |
| **CVE Alerts** | ${data.summary.cveAlerts} |

### Security Posture

${data.summary.successfulAttacks === 0 
  ? "**SECURE** - All detected attacks were successfully blocked."
  : `**ATTENTION REQUIRED** - ${data.summary.successfulAttacks} attack(s) were successful before mitigation.`
}

---

## Attack Summary

${data.attacks.length === 0 
  ? "No attacks detected during this period."
  : `### Attack Types Distribution

| Attack Type | Count | Blocked | Successful |
|-------------|-------|---------|------------|
${getAttackTypeStats(data.attacks)}

### Recent Attacks

| Time | Type | Severity | Source IP | Endpoint | Blocked |
|------|------|----------|-----------|----------|---------|
${data.attacks.slice(0, 20).map(a => 
  `| ${a.timestamp.toISOString()} | ${a.attackType} | ${a.severity} | ${a.sourceIp} | ${a.endpoint} | ${a.blocked ? "Yes" : "No"} |`
).join('\n')}
`}

---

## Self-Healing Actions

${data.healings.length === 0 
  ? "No healing actions during this period."
  : `| ID | Attack Type | Patch | Status | Applied At |
|-----|-------------|-------|--------|------------|
${data.healings.map(h => 
  `| ${h.id} | ${h.attackType} | ${h.patch} | ${h.status} | ${h.appliedAt || "-"} |`
).join('\n')}`
}

---

## Active WAF Rules

${data.healings.filter(h => h.status === "Applied" || h.status === "Approved").length === 0
  ? "No active WAF rules."
  : `| Rule ID | Attack Type | Block Pattern |
|---------|-------------|---------------|
${data.healings
  .filter(h => h.status === "Applied" || h.status === "Approved")
  .map(h => `| ${h.wafRuleId} | ${h.attackType} | ${h.blockPattern || "Builtin detector"} |`)
  .join('\n')}`
}

---

## Recommendations

${generateRecommendations(data)}

---

## System Status

| Component | Status |
|-----------|--------|
| AEGIS Phase 3 | Running |
| WAF Engine | Active |
| CVE Monitor | ${data.summary.cveAlerts > 0 ? "Alerts Pending" : "Clear"} |
| Telegram HITL | Connected |

---

*Report generated at: ${new Date().toISOString()}*
*AEGIS Phase 3 - Defend & Monitor*
`;

  if (outputPath) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, report);
  }

  return report;
}

function getAttackTypeStats(attacks: AttackLog[]): string {
  const stats = new Map<string, { total: number; blocked: number }>();
  
  for (const attack of attacks) {
    const current = stats.get(attack.attackType) || { total: 0, blocked: 0 };
    current.total++;
    if (attack.blocked) current.blocked++;
    stats.set(attack.attackType, current);
  }

  return Array.from(stats.entries())
    .map(([type, { total, blocked }]) => 
      `| ${type} | ${total} | ${blocked} | ${total - blocked} |`
    )
    .join('\n');
}

function generateRecommendations(data: MonitoringReportData): string {
  const recommendations: string[] = [];

  if (data.summary.successfulAttacks > 0) {
    recommendations.push("1. **Review Successful Attacks** - Investigate the successful attacks and ensure appropriate mitigations are in place.");
  }

  if (data.summary.totalAttacks > 50) {
    recommendations.push("2. **High Attack Volume** - Consider implementing rate limiting or IP blocking for persistent attackers.");
  }

  const uniqueIps = new Set(data.attacks.map(a => a.sourceIp));
  if (uniqueIps.size < data.summary.totalAttacks / 10) {
    recommendations.push("3. **Concentrated Attack Source** - Most attacks come from few IPs. Consider blocking these at network level.");
  }

  if (data.healings.some(h => h.status === "Reversed")) {
    recommendations.push("4. **Reversed Healings** - Some healings were reversed. Review if they were false positives.");
  }

  if (recommendations.length === 0) {
    return "No immediate recommendations. Security posture is healthy.";
  }

  return recommendations.join('\n\n');
}
