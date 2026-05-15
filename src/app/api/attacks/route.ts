import { NextRequest, NextResponse } from "next/server";
import { registerAttack, getAllAttacks, clearAllAttacks, getAttacksSince } from "@/lib/attackState";
import { registerHealing } from "@/lib/healingState";
import { sendMessage, getChatId, buildHealingMessage, buildHealingKeyboard } from "@/lib/telegram";
import { recommendHealing } from "@/lib/deepseek";

function randomId() {
  return Math.random().toString(36).slice(2, 12);
}

/**
 * GET /api/attacks - Get all attacks
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const since = searchParams.get("since");
  
  const attacks = since ? getAttacksSince(parseInt(since)) : getAllAttacks();
  
  return NextResponse.json({ 
    ok: true, 
    attacks, 
    count: attacks.length 
  });
}

/**
 * POST /api/attacks - Report a new attack (from vulnerable app or external source)
 * Body: { attackType, severity, payload, endpoint, method, sourceIp, autoHeal? }
 * 
 * Uses DeepSeek AI to:
 * 1. Validate if this is a real attack (not false positive)
 * 2. Determine appropriate healing action
 * 3. Generate WAF blocking pattern
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      attackType, 
      severity, 
      payload, 
      endpoint, 
      method, 
      sourceIp,
      autoHeal = true
    } = body;

    if (!attackType) {
      return NextResponse.json({ error: "attackType is required" }, { status: 400 });
    }

    const attackId = `atk_${randomId()}`;
    const timestamp = Date.now();

    // ─── Call DeepSeek AI to analyze the attack ───────────────
    console.log(`[Attacks API] Calling DeepSeek AI to analyze: ${attackType}`);
    let aiRecommendation;
    try {
      aiRecommendation = await recommendHealing({
        attackType,
        severity: severity || "High",
        payload: payload || "",
        endpoint: endpoint || "/unknown",
        method: method || "GET",
        sourceIp: sourceIp || "unknown",
      });
      console.log(`[Attacks API] AI recommendation:`, aiRecommendation);
    } catch (aiErr) {
      console.error("[Attacks API] AI analysis failed:", aiErr);
      // Fallback to basic recommendation
      aiRecommendation = {
        shouldHeal: true,
        isFalsePositive: false,
        severity: severity || "High",
        attackType,
        patchName: `Auto Patch — ${attackType}`,
        wafRuleId: "WAF-GEN-001",
        blockPattern: "",
        explanation: "AI unavailable, applying generic protection",
        confidence: 50,
      };
    }

    // ─── Handle false positives ───────────────────────────────
    if (aiRecommendation.isFalsePositive || !aiRecommendation.shouldHeal) {
      console.log(`[Attacks API] AI detected FALSE POSITIVE or low confidence, skipping healing`);
      return NextResponse.json({
        ok: true,
        attackId,
        message: `Attack analyzed but determined to be false positive`,
        falsePositive: true,
        aiAnalysis: {
          explanation: aiRecommendation.explanation,
          confidence: aiRecommendation.confidence,
        },
        healing: null,
      });
    }

    // ─── Register the confirmed attack ────────────────────────
    registerAttack({
      id: attackId,
      type: aiRecommendation.attackType,
      severity: aiRecommendation.severity,
      sourceIp: sourceIp || "unknown",
      targetEndpoint: endpoint || "/unknown",
      method: method || "GET",
      payload: payload || "",
      timestamp,
      blocked: true,
      source: "live",
    });

    let healingResult = null;

    // ─── Auto-create AI-recommended healing action ────────────
    if (autoHeal) {
      const healingId = `heal_${randomId()}`;
      const chatId = getChatId();

      // Send Telegram notification with AI analysis
      let telegramMessageId: number | undefined;
      if (chatId) {
        const healingMsg = buildHealingMessage({
          id: healingId,
          attackType: aiRecommendation.attackType,
          severity: aiRecommendation.severity,
          patch: aiRecommendation.patchName,
          wafRuleId: aiRecommendation.wafRuleId,
          sourceIp,
          targetEndpoint: endpoint,
        });
        const keyboard = buildHealingKeyboard(healingId);
        
        const liveMsg = `🔴 <b>LIVE ATTACK DETECTED</b>\n🤖 <i>AI Confidence: ${aiRecommendation.confidence}%</i>\n\n${healingMsg}\n\n💡 <b>AI Analysis:</b> ${aiRecommendation.explanation}`;
        const result = await sendMessage(chatId, liveMsg, keyboard);
        telegramMessageId = result.ok ? result.result?.message_id : undefined;
      }

      // Register healing with AI-generated details
      registerHealing({
        id: healingId,
        attackType: aiRecommendation.attackType,
        severity: aiRecommendation.severity,
        sourceIp: sourceIp || "unknown",
        targetEndpoint: endpoint || "/unknown",
        method: method || "GET",
        payload: payload || "",
        patch: aiRecommendation.patchName,
        wafRuleId: aiRecommendation.wafRuleId,
        blockPattern: aiRecommendation.blockPattern, // AI-generated regex
        status: "Applied",
        appliedAt: timestamp,
        reverseDeadline: timestamp + 30 * 60 * 1000,
        telegramMessageId,
        telegramChatId: chatId,
      });

      healingResult = {
        healingId,
        patch: aiRecommendation.patchName,
        wafRuleId: aiRecommendation.wafRuleId,
        blockPattern: aiRecommendation.blockPattern,
        telegramNotified: !!telegramMessageId,
        aiConfidence: aiRecommendation.confidence,
      };
    }

    return NextResponse.json({
      ok: true,
      attackId,
      message: `Attack registered: ${aiRecommendation.attackType}`,
      aiAnalysis: {
        explanation: aiRecommendation.explanation,
        confidence: aiRecommendation.confidence,
      },
      healing: healingResult,
    });
  } catch (err) {
    console.error("[Attacks API] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * DELETE /api/attacks - Clear all attacks
 */
export async function DELETE() {
  clearAllAttacks();
  return NextResponse.json({ ok: true, message: "All attacks cleared" });
}
