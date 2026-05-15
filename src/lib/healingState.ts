/**
 * Server-side in-memory healing state store.
 * Tracks all healing actions so Telegram callbacks can actually
 * approve/reverse them and the dashboard can poll for updates.
 *
 * Uses globalThis to survive Next.js HMR reloads in dev mode
 * and ensure a single shared instance across all API routes.
 *
 * In production, replace with Redis or PostgreSQL.
 */

export type ServerHealingStatus = "Applied" | "Reversed" | "Approved" | "Expired";

export interface ServerHealingAction {
  id: string;
  attackType: string;
  severity: string;
  sourceIp: string;
  targetEndpoint: string;
  method: string;
  payload: string;
  patch: string;
  wafRuleId: string;
  blockPattern?: string;  // AI-generated regex pattern for WAF blocking
  status: ServerHealingStatus;
  appliedAt: number;
  reverseDeadline: number;
  reversedAt?: number;
  reversedBy?: string;
  approvedAt?: number;
  approvedBy?: string;
  telegramMessageId?: number;
  telegramChatId?: string;
}

/** Event log for polling — each entry is a status change */
interface HealingEvent {
  healingId: string;
  action: "applied" | "approved" | "reversed" | "expired";
  by: string;
  ts: number;
}

interface HealingGlobalStore {
  healingActions: Map<string, ServerHealingAction>;
  eventLog: HealingEvent[];
  eventSeq: number;
}

/* ── In-memory store (singleton via globalThis) ──────────── */
const globalStore = globalThis as typeof globalThis & { __aegisHealingStore?: HealingGlobalStore };

if (!globalStore.__aegisHealingStore) {
  globalStore.__aegisHealingStore = {
    healingActions: new Map<string, ServerHealingAction>(),
    eventLog: [],
    eventSeq: 0,
  };
}

const healingActions = globalStore.__aegisHealingStore.healingActions;
const eventLog = globalStore.__aegisHealingStore.eventLog;

function getEventSeqValue(): number {
  return globalStore.__aegisHealingStore!.eventSeq;
}

function incEventSeq(): void {
  globalStore.__aegisHealingStore!.eventSeq++;
}

/* ── Public API ──────────────────────────────────────────── */

export function registerHealing(action: ServerHealingAction): void {
  healingActions.set(action.id, { ...action });
  eventLog.push({
    healingId: action.id,
    action: "applied",
    by: "AEGIS Engine",
    ts: Date.now(),
  });
  incEventSeq();
}

export function approveHealing(id: string, by: string): ServerHealingAction | null {
  const action = healingActions.get(id);
  if (!action || action.status !== "Applied") return null;

  action.status = "Approved";
  action.approvedAt = Date.now();
  action.approvedBy = by;

  eventLog.push({
    healingId: id,
    action: "approved",
    by,
    ts: Date.now(),
  });
  incEventSeq();

  return { ...action };
}

export function reverseHealing(id: string, by: string): ServerHealingAction | null {
  const action = healingActions.get(id);
  if (!action) return null;
  if (action.status !== "Applied" && action.status !== "Approved") return null;

  // Check if still within reverse window
  if (Date.now() > action.reverseDeadline) {
    action.status = "Expired";
    eventLog.push({
      healingId: id,
      action: "expired",
      by: "system",
      ts: Date.now(),
    });
    incEventSeq();
    return null;
  }

  action.status = "Reversed";
  action.reversedAt = Date.now();
  action.reversedBy = by;

  eventLog.push({
    healingId: id,
    action: "reversed",
    by,
    ts: Date.now(),
  });
  incEventSeq();

  return { ...action };
}

export function getHealing(id: string): ServerHealingAction | null {
  const a = healingActions.get(id);
  return a ? { ...a } : null;
}

export function getAllHealings(): ServerHealingAction[] {
  // Check for expirations while reading
  const now = Date.now();
  for (const action of healingActions.values()) {
    if (action.status === "Applied" && now > action.reverseDeadline) {
      action.status = "Expired";
      eventLog.push({
        healingId: action.id,
        action: "expired",
        by: "system",
        ts: now,
      });
      incEventSeq();
    }
  }

  return Array.from(healingActions.values())
    .map((a) => ({ ...a }))
    .sort((a, b) => b.appliedAt - a.appliedAt);
}

export function getEventsSince(since: number): { events: HealingEvent[]; seq: number } {
  const filtered = eventLog.filter((e) => e.ts > since);
  return { events: filtered, seq: getEventSeqValue() };
}

export function getEventSeq(): number {
  return getEventSeqValue();
}

/** Clear all healing actions (for testing/reset) */
export function clearAllHealings(): void {
  healingActions.clear();
  eventLog.length = 0;
  globalStore.__aegisHealingStore!.eventSeq = 0;
}
