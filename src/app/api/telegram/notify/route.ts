import { NextRequest, NextResponse } from "next/server";
import { sendMessage, getChatId, buildHealingMessage, buildHealingKeyboard } from "@/lib/telegram";
import { registerHealing, getHealing } from "@/lib/healingState";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const chatId = getChatId();

    if (!chatId) {
      return NextResponse.json(
        { error: "TELEGRAM_CHAT_ID not configured. Call /api/telegram/setup first." },
        { status: 400 },
      );
    }

    const { type, payload } = body;

    if (type === "healing") {
      const text = buildHealingMessage(payload);
      const keyboard = buildHealingKeyboard(payload.id);
      const result = await sendMessage(chatId, text, keyboard);

      // Register healing in server-side store so Telegram callbacks can approve/reverse
      if (!getHealing(payload.id)) {
        registerHealing({
          id: payload.id,
          attackType: payload.attackType,
          severity: payload.severity,
          sourceIp: payload.sourceIp || "unknown",
          targetEndpoint: payload.targetEndpoint || "unknown",
          method: payload.method || "GET",
          payload: payload.payload || "",
          patch: payload.patch,
          wafRuleId: payload.wafRuleId,
          status: "Applied",
          appliedAt: payload.appliedAt || Date.now(),
          reverseDeadline: payload.reverseDeadline || Date.now() + 30 * 60 * 1000,
        });
      }

      return NextResponse.json({ ok: true, result });
    }

    if (type === "alert") {
      const text = `⚠️ <b>AEGIS Alert</b>\n\n<b>Type:</b> ${payload.attackType || payload.type}\n<b>Severity:</b> ${payload.severity}\n<b>Source:</b> <code>${payload.sourceIp}</code>\n<b>Target:</b> <code>${payload.targetEndpoint}</code>\n<b>Payload:</b> <code>${payload.payloadSnippet}</code>`;
      const result = await sendMessage(chatId, text);
      return NextResponse.json({ ok: true, result });
    }

    if (type === "log") {
      const text = `📋 <b>AEGIS Log</b>\n\n${payload.message || payload.msg}`;
      const result = await sendMessage(chatId, text);
      return NextResponse.json({ ok: true, result });
    }

    // Phase 3 completion with approval buttons
    if (type === "phase3_complete") {
      const { projectName, repoUrl, sessionId, summary } = body;
      const text = `🛡 <b>AEGIS Security Pipeline Complete</b>

<b>Project:</b> ${projectName}
<b>Repository:</b> <code>${repoUrl || 'N/A'}</code>

<b>📊 Summary:</b>
• Source Code Issues: ${summary?.phase1 || 0}
• Pentest Findings: ${summary?.phase2 || 0}
• Patches Applied: ${summary?.fixed || 0}

<b>Session:</b> <code>${sessionId}</code>

⏱ Awaiting approval to push security patches to repository.`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: "✅ Approve & Push", callback_data: `approve_push:${sessionId}` },
            { text: "❌ Reject", callback_data: `reject_push:${sessionId}` },
          ],
        ],
      };
      const result = await sendMessage(chatId, text, keyboard);
      return NextResponse.json({ ok: true, result });
    }

    // Attack blocked notification
    if (type === "attack_blocked") {
      const { attackType, endpoint, ip } = body;
      const text = `🚨 <b>AEGIS WAF Alert</b>

<b>Attack Blocked!</b>
• Type: <code>${attackType}</code>
• Endpoint: <code>${endpoint}</code>
• Source IP: <code>${ip}</code>

The malicious request has been blocked and logged.`;
      const result = await sendMessage(chatId, text);
      return NextResponse.json({ ok: true, result });
    }

    return NextResponse.json({ error: "Unknown type. Use: healing, alert, log, phase3_complete, or attack_blocked" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
