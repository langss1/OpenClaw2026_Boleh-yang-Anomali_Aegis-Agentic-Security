export type Severity = "Critical" | "High" | "Medium" | "Low";

export type AttackType =
  | "SQL Injection"
  | "XSS"
  | "Path Traversal"
  | "Command Injection"
  | "Brute Force"
  | "SSRF"
  | "RCE"
  | "CSRF"
  | "LFI"
  | "Open Redirect";

export interface AttackEvent {
  id: string;
  type: AttackType;
  severity: Severity;
  sourceIp: string;
  geo?: { country: string; city?: string };
  targetEndpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  payloadSnippet: string;
  timestamp: number;
  matchedRuleId?: string;
}

export interface TrafficTick {
  time: string;
  ts: number;
  normal: number;
  attack: number;
}

export type HealingStatus = "Applied" | "Reversed" | "Approved" | "Expired";

export interface HealingAction {
  id: string;
  attackId?: string;
  attackType: AttackType | string;
  severity: Severity | string;
  status: HealingStatus;
  patch: string;
  wafRuleId: string;
  snapshotId?: string;
  sourceIp?: string;
  targetEndpoint?: string;
  method?: string;
  payload?: string;
  appliedAt: number;
  reverseDeadline: number;
  reversedAt?: number;
  reversedBy?: string;
  approvedAt?: number;
  approvedBy?: string;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogLine {
  id: string;
  ts: number;
  level: LogLevel;
  source: string;
  msg: string;
  attackId?: string;
  healingId?: string;
}

export type AuditAction =
  | "apply-patch"
  | "approve-patch"
  | "reverse-patch"
  | "edit-rule"
  | "ack-alert"
  | "policy-trigger";

export interface AuditEntry {
  id: string;
  ts: number;
  actor: "system" | "operator";
  actorName: string;
  action: AuditAction;
  refId: string;
  refLabel: string;
  note?: string;
}

export interface Policy {
  id: string;
  attackType: AttackType;
  minSeverity: Severity;
  patchName: string;
  wafRuleId: string;
  enabled: boolean;
}
