import { NextResponse } from "next/server";
import { getUpdates } from "@/lib/telegram";

export async function GET() {
  try {
    const data = await getUpdates();

    if (!data.ok) {
      return NextResponse.json({ error: "Telegram API error", details: data }, { status: 500 });
    }

    const results = data.result || [];
    const chatIds = new Set<string>();

    for (const update of results) {
      const chatId =
        update.message?.chat?.id ||
        update.callback_query?.message?.chat?.id;
      if (chatId) chatIds.add(String(chatId));
    }

    if (chatIds.size === 0) {
      return NextResponse.json({
        message: "No chat found. Please send /start to the bot first, then call this endpoint again.",
        updates: results.length,
      });
    }

    return NextResponse.json({
      message: "Chat ID(s) found. Set TELEGRAM_CHAT_ID in .env.local",
      chatIds: Array.from(chatIds),
      instruction: "Add the chat_id to your .env.local file as TELEGRAM_CHAT_ID",
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
