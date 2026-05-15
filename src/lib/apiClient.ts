export async function notifyTelegram(type: "healing" | "alert" | "log", payload: Record<string, unknown>) {
  try {
    const res = await fetch("/api/telegram/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, payload }),
    });
    return res.json();
  } catch (err) {
    console.error("[Telegram notify error]", err);
    return { ok: false, error: String(err) };
  }
}

export async function pollTelegramCallbacks(): Promise<{ actions: Array<{ action: "approve" | "revert"; healingId: string }> }> {
  try {
    const res = await fetch("/api/telegram/callback", { cache: "no-store" });
    return res.json();
  } catch (err) {
    console.error("[Telegram poll error]", err);
    return { actions: [] };
  }
}

export async function analyzeWithAI(attack: {
  type: string;
  severity: string;
  payloadSnippet: string;
  targetEndpoint: string;
  method: string;
  sourceIp: string;
}) {
  try {
    const res = await fetch("/api/deepseek/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(attack),
    });
    return res.json();
  } catch (err) {
    console.error("[Deepseek analyze error]", err);
    return { ok: false, error: String(err) };
  }
}

export async function fetchHealings() {
  try {
    const res = await fetch("/api/healing", { cache: "no-store" });
    return res.json();
  } catch (err) {
    console.error("[Fetch healings error]", err);
    return { ok: false, healings: [] };
  }
}
export async function updateHealingStatus(healingId: string, action: "approve" | "reverse", by: string) {
  try {
    const res = await fetch("/api/healing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ healingId, action, by }),
    });
    return res.json();
  } catch (err) {
    console.error("[Update healing error]", err);
    return { ok: false, error: String(err) };
  }
}
