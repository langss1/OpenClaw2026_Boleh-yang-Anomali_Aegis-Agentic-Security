const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

export function getChatId(): string {
  return process.env.TELEGRAM_CHAT_ID || "";
}

export async function sendMessage(chatId: string, text: string, replyMarkup?: object) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }
  const res = await fetch(`${BASE}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function getUpdates(offset?: number) {
  const params = new URLSearchParams();
  if (offset !== undefined) params.set("offset", String(offset));
  params.set("timeout", "0");
  params.set("_t", String(Date.now()));
  const res = await fetch(`${BASE}/getUpdates?${params}`, { cache: "no-store" });
  return res.json();
}

export async function answerCallbackQuery(callbackQueryId: string, text: string) {
  const res = await fetch(`${BASE}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
  return res.json();
}

export async function editMessageReplyMarkup(chatId: string, messageId: number, replyMarkup?: object) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
  };
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  } else {
    // Remove inline keyboard by setting empty inline_keyboard
    body.reply_markup = { inline_keyboard: [] };
  }
  const res = await fetch(`${BASE}/editMessageReplyMarkup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function editMessageText(chatId: string, messageId: number, text: string, replyMarkup?: object) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
  };
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  } else {
    body.reply_markup = { inline_keyboard: [] };
  }
  const res = await fetch(`${BASE}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export function buildHealingMessage(action: {
  id: string;
  attackType: string;
  severity: string;
  patch: string;
  wafRuleId: string;
  sourceIp?: string;
  targetEndpoint?: string;
}) {
  return `🛡 <b>AEGIS Self-Healing Applied</b>

<b>Attack:</b> ${action.attackType}
<b>Severity:</b> ${action.severity}
<b>Patch:</b> ${action.patch}
<b>WAF Rule:</b> <code>${action.wafRuleId}</code>
${action.sourceIp ? `<b>Source:</b> <code>${action.sourceIp}</code>` : ""}
${action.targetEndpoint ? `<b>Target:</b> <code>${action.targetEndpoint}</code>` : ""}
<b>Healing ID:</b> <code>${action.id}</code>

⏱ Reverse window: 30 minutes
Choose action below:`;
}

export function buildHealingKeyboard(healingId: string) {
  return {
    inline_keyboard: [
      [
        { text: "✅ Approve", callback_data: `approve:${healingId}` },
        { text: "❌ Revert", callback_data: `revert:${healingId}` },
      ],
      [
        { text: "🔧 Auto-Fix Code", callback_data: `autofix:${healingId}` },
      ],
    ],
  };
}

export function buildAutoFixMessage(result: {
  filesAnalyzed: number;
  vulnerabilitiesFound: number;
  fixesApplied: number;
  fixes: Array<{ filePath: string; type: string; line: number }>;
}) {
  let msg = `🔧 <b>AEGIS Auto-Fix Applied</b>\n\n`;
  msg += `<b>Files Analyzed:</b> ${result.filesAnalyzed}\n`;
  msg += `<b>Vulnerabilities Found:</b> ${result.vulnerabilitiesFound}\n`;
  msg += `<b>Fixes Applied:</b> ${result.fixesApplied}\n\n`;
  
  if (result.fixes.length > 0) {
    msg += `<b>Fixed Issues:</b>\n`;
    for (const fix of result.fixes.slice(0, 5)) {
      msg += `• ${fix.type} at line ${fix.line}\n`;
      msg += `  <code>${fix.filePath.split(/[/\\]/).pop()}</code>\n`;
    }
    if (result.fixes.length > 5) {
      msg += `\n... and ${result.fixes.length - 5} more fixes`;
    }
  }
  
  msg += `\n\n✅ Source code has been patched automatically!`;
  return msg;
}
