export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour12: false });
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return `${d.toLocaleDateString([], { year: "numeric", month: "2-digit", day: "2-digit" })} ${d.toLocaleTimeString([], { hour12: false })}`;
}

export function formatRelative(ts: number, now = Date.now()): string {
  const diff = Math.max(0, now - ts);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function formatCountdown(targetTs: number, now = Date.now()): string {
  const diff = targetTs - now;
  if (diff <= 0) return "Expired";
  const total = Math.floor(diff / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export function maskIp(ip: string): string {
  const parts = ip.split(".");
  if (parts.length !== 4) return ip;
  return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
}
