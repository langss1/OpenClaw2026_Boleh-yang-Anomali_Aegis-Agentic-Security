/**
 * Server-side in-memory attack state store.
 * Stores detected attacks so they persist across page refreshes.
 */

export interface ServerAttackEvent {
  id: string;
  type: string;
  severity: string;
  sourceIp: string;
  targetEndpoint: string;
  method: string;
  payload: string;
  timestamp: number;
  blocked: boolean;
  source?: string; // 'live' | 'simulate'
}

interface AttackGlobalStore {
  attacks: ServerAttackEvent[];
  maxAttacks: number;
}

const globalStore = globalThis as typeof globalThis & { __aegisAttackStore?: AttackGlobalStore };

if (!globalStore.__aegisAttackStore) {
  globalStore.__aegisAttackStore = {
    attacks: [],
    maxAttacks: 200,
  };
}

const store = globalStore.__aegisAttackStore;

export function registerAttack(attack: ServerAttackEvent): void {
  store.attacks.unshift(attack);
  if (store.attacks.length > store.maxAttacks) {
    store.attacks = store.attacks.slice(0, store.maxAttacks);
  }
  console.log(`[AttackState] Registered attack: ${attack.type} from ${attack.sourceIp}`);
}

export function getAllAttacks(): ServerAttackEvent[] {
  return [...store.attacks];
}

export function getAttacksSince(since: number): ServerAttackEvent[] {
  return store.attacks.filter(a => a.timestamp > since);
}

export function clearAllAttacks(): void {
  store.attacks = [];
  console.log("[AttackState] Cleared all attacks");
}

export function getAttackCount(): number {
  return store.attacks.length;
}
