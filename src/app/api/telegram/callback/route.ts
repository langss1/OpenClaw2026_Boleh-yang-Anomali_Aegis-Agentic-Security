import { NextResponse } from "next/server";
import { getUpdates, answerCallbackQuery, sendMessage, getChatId, editMessageReplyMarkup, buildAutoFixMessage } from "@/lib/telegram";
import { approveHealing, reverseHealing, getHealing } from "@/lib/healingState";
import { analyzeCode, applyFixes } from "@/lib/codeAnalyzer";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

interface CallbackAction {
  action: "approve" | "revert";
  healingId: string;
  answeredAt: number;
  result: "success" | "expired" | "not_found" | "already_processed";
  detail?: string;
}

export async function GET() {
  try {
    // Fetch ALL pending updates (no offset — self-contained per call)
    const data = await getUpdates();

    if (!data.ok) {
      console.error("[Telegram Poll] API error:", JSON.stringify(data));
      return NextResponse.json({ error: "Telegram API error" }, { status: 500 });
    }

    const results = data.result || [];
    console.log(`[Telegram Poll] Got ${results.length} updates`);
    if (results.length === 0) {
      return NextResponse.json({ ok: true, actions: [], pending: 0 });
    }

    const actions: CallbackAction[] = [];
    let maxUpdateId = 0;

    for (const update of results) {
      if (update.update_id > maxUpdateId) {
        maxUpdateId = update.update_id;
      }

      const cb = update.callback_query;
      if (!cb || !cb.data) continue;

      console.log(`[Telegram Callback] Received: ${cb.data} from ${cb.from?.first_name}`);

      const [action, healingId] = cb.data.split(":");
      if (!healingId || (action !== "approve" && action !== "revert" && action !== "autofix")) continue;

      const cbId = cb.id;

      const chatId = getChatId() || String(cb.message?.chat?.id || "");
      const operatorName = cb.from?.first_name || "Operator";

      // Get the message ID to remove the keyboard after processing
      const messageId = cb.message?.message_id;

      if (action === "approve") {
        /* ── APPROVE: Lock in the patch permanently ── */
        console.log(`[Callback] Processing APPROVE for healingId: ${healingId}`);
        const result = approveHealing(healingId, `${operatorName} (Telegram)`);
        console.log(`[Callback] Approve result:`, result ? { id: result.id, status: result.status } : "null");

        if (result) {
          await answerCallbackQuery(cbId, "✅ Patch approved and locked in!");

          // Remove the inline keyboard buttons after selection
          if (chatId && messageId) {
            await editMessageReplyMarkup(chatId, messageId);
          }

          if (chatId) {
            const text = `✅ <b>Healing Approved & Locked</b>

<b>Healing ID:</b> <code>${healingId}</code>
<b>Attack:</b> ${result.attackType} (${result.severity})
<b>Patch:</b> ${result.patch}
<b>WAF Rule:</b> <code>${result.wafRuleId}</code>
<b>Approved by:</b> ${operatorName} (via Telegram)
<b>Time:</b> ${new Date().toLocaleString()}

🔒 Patch is now <b>permanent</b>. Reverse window closed.`;
            await sendMessage(chatId, text);
          }

          actions.push({
            action: "approve",
            healingId,
            answeredAt: Date.now(),
            result: "success",
            detail: `Approved by ${operatorName}`,
          });
        } else {
          const existing = getHealing(healingId);
          const reason = !existing
            ? "not_found"
            : existing.status === "Approved" || existing.status === "Reversed"
            ? "already_processed"
            : "expired";

          await answerCallbackQuery(cbId, reason === "not_found" ? "Healing not found" : `Already ${existing?.status?.toLowerCase()}`);

          // Remove the inline keyboard buttons even on error
          if (chatId && messageId) {
            await editMessageReplyMarkup(chatId, messageId);
          }

          if (chatId) {
            await sendMessage(chatId, `⚠️ Cannot approve <code>${healingId}</code>: ${reason === "not_found" ? "not found in system" : `already ${existing?.status?.toLowerCase()}`}`);
          }

          actions.push({
            action: "approve",
            healingId,
            answeredAt: Date.now(),
            result: reason as CallbackAction["result"],
          });
        }
      } else if (action === "revert") {
        /* ── REVERT: Undo the patch, restore from snapshot ── */
        console.log(`[Callback] Processing REVERT for healingId: ${healingId}`);
        const result = reverseHealing(healingId, `${operatorName} (Telegram)`);
        console.log(`[Callback] Revert result:`, result ? { id: result.id, status: result.status } : "null");

        if (result) {
          await answerCallbackQuery(cbId, "🔄 Patch reverted successfully!");

          // Remove the inline keyboard buttons after selection
          if (chatId && messageId) {
            await editMessageReplyMarkup(chatId, messageId);
          }

          if (chatId) {
            const text = `🔄 <b>Healing REVERTED</b>

<b>Healing ID:</b> <code>${healingId}</code>
<b>Attack:</b> ${result.attackType} (${result.severity})
<b>Patch removed:</b> ${result.patch}
<b>WAF Rule disabled:</b> <code>${result.wafRuleId}</code>
<b>Reverted by:</b> ${operatorName} (via Telegram)
<b>Time:</b> ${new Date().toLocaleString()}

⚠️ <b>Warning:</b> The following protections have been removed:
• WAF rule <code>${result.wafRuleId}</code> disabled
• Patch "${result.patch}" rolled back
• System restored to pre-healing snapshot

🔓 Endpoint <code>${result.targetEndpoint}</code> is now <b>unprotected</b> against ${result.attackType}.`;
            await sendMessage(chatId, text);
          }

          actions.push({
            action: "revert",
            healingId,
            answeredAt: Date.now(),
            result: "success",
            detail: `Reverted by ${operatorName} — patch ${result.patch} removed, WAF rule ${result.wafRuleId} disabled`,
          });
        } else {
          const existing = getHealing(healingId);
          const reason = !existing
            ? "not_found"
            : existing.status === "Reversed"
            ? "already_processed"
            : "expired";

          await answerCallbackQuery(cbId, reason === "not_found" ? "Healing not found" : `Already ${existing?.status?.toLowerCase()}`);

          // Remove the inline keyboard buttons even on error
          if (chatId && messageId) {
            await editMessageReplyMarkup(chatId, messageId);
          }

          if (chatId) {
            const emoji = reason === "expired" ? "⏰" : "⚠️";
            await sendMessage(chatId, `${emoji} Cannot revert <code>${healingId}</code>: ${reason === "not_found" ? "not found" : reason === "expired" ? "reverse window expired (30 min)" : `already ${existing?.status?.toLowerCase()}`}`);
          }

          actions.push({
            action: "revert",
            healingId,
            answeredAt: Date.now(),
            result: reason as CallbackAction["result"],
          });
        }
      } else if (action === "autofix") {
        /* ── AUTO-FIX: Analyze and fix source code using DeepSeek AI ── */
        console.log(`[Callback] Processing AUTO-FIX for healingId: ${healingId}`);
        
        await answerCallbackQuery(cbId, "🔧 Running AI-powered code analysis...");
        
        // Send initial message
        if (chatId) {
          await sendMessage(chatId, "🤖 <b>DeepSeek AI Code Analyzer</b>\n\nAnalyzing source code for vulnerabilities...");
        }
        
        // Get the vulnerable app path from environment or use default
        const targetPath = process.env.VULNERABLE_APP_PATH || path.resolve(process.cwd(), "../vulnerable-app");
        
        try {
          // Find and analyze files
          const files: string[] = [];
          if (fs.existsSync(targetPath)) {
            findJsFiles(targetPath, files);
          }
          
          let totalVulns = 0;
          let totalFixes = 0;
          const appliedFixes: Array<{ filePath: string; type: string; line: number; explanation?: string }> = [];
          const aiAnalyses: string[] = [];
          
          for (const filePath of files) {
            const content = fs.readFileSync(filePath, "utf-8");
            console.log(`[AutoFix] Analyzing ${filePath} with DeepSeek AI...`);
            
            // Call AI-powered analysis (async)
            const result = await analyzeCode(content, filePath);
            
            if (result.aiAnalysis) {
              aiAnalyses.push(`📁 ${path.basename(filePath)}: ${result.aiAnalysis}`);
            }
            
            if (result.vulnerabilities.length > 0 && result.fixes.length > 0) {
              totalVulns += result.vulnerabilities.length;
              totalFixes += result.fixes.length;
              
              // Apply fixes
              const fixedContent = applyFixes(content, result.fixes);
              fs.writeFileSync(filePath, fixedContent, "utf-8");
              
              for (const fix of result.fixes) {
                appliedFixes.push({
                  filePath: path.basename(filePath),
                  type: fix.type,
                  line: fix.line || 0,
                  explanation: fix.explanation,
                });
              }
              
              console.log(`[AutoFix] AI found and fixed ${result.fixes.length} vulnerabilities in ${filePath}`);
            }
          }
          
          // Remove keyboard
          if (chatId && messageId) {
            await editMessageReplyMarkup(chatId, messageId);
          }
          
          // Build and send result message with AI analysis
          if (chatId) {
            let msg = `🔧 <b>AEGIS AI Auto-Fix Complete</b>\n\n`;
            msg += `<b>Powered by:</b> DeepSeek AI\n`;
            msg += `<b>Files analyzed:</b> ${files.length}\n`;
            msg += `<b>Vulnerabilities found:</b> ${totalVulns}\n`;
            msg += `<b>Fixes applied:</b> ${totalFixes}\n\n`;
            
            if (aiAnalyses.length > 0) {
              msg += `<b>🤖 AI Analysis:</b>\n`;
              for (const analysis of aiAnalyses.slice(0, 3)) {
                msg += `• ${analysis}\n`;
              }
              msg += `\n`;
            }
            
            if (appliedFixes.length > 0) {
              msg += `<b>✅ Fixes Applied:</b>\n`;
              for (const fix of appliedFixes.slice(0, 5)) {
                msg += `• <code>${fix.filePath}</code> line ${fix.line}: ${fix.type}\n`;
                if (fix.explanation) {
                  msg += `  └ ${fix.explanation}\n`;
                }
              }
              if (appliedFixes.length > 5) {
                msg += `  <i>...and ${appliedFixes.length - 5} more</i>\n`;
              }
            } else {
              msg += `<i>No vulnerabilities found requiring fixes.</i>`;
            }
            
            await sendMessage(chatId, msg);
          }
          
          actions.push({
            action: "approve", // Use approve type for compatibility
            healingId,
            answeredAt: Date.now(),
            result: "success",
            detail: `AI auto-fixed ${totalFixes} vulnerabilities in ${files.length} files`,
          });
        } catch (fixErr) {
          console.error("[AutoFix] Error:", fixErr);
          
          if (chatId) {
            await sendMessage(chatId, `❌ AI Auto-fix failed: ${String(fixErr)}`);
          }
        }
      }
    }

    // Acknowledge ALL processed updates so they don't reappear
    if (maxUpdateId > 0) {
      await getUpdates(maxUpdateId + 1);
    }

    return NextResponse.json({ ok: true, actions, pending: results.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * Recursively find JS/TS files
 */
function findJsFiles(dir: string, files: string[]) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Skip node_modules, hidden directories, and public folder
      if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "public") {
        continue;
      }
      
      if (entry.isDirectory()) {
        findJsFiles(fullPath, files);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if ([".js", ".ts", ".jsx", ".tsx"].includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (err) {
    console.error(`[findJsFiles] Error reading ${dir}:`, err);
  }
}
