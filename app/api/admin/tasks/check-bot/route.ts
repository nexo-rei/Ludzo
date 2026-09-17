import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBotChatAccess, normalizeChatRef, getBotId } from "@/lib/telegram-chat";

/**
 * GET /api/admin/tasks/check-bot?chat=@mychannel
 *     /api/admin/tasks/check-bot?task_id=<uuid>
 *
 * Batata hai: bot us channel/group me admin hai ya nahi, aur chat Telegram pe
 * exist karti hai ya nahi. Admin panel me "Check bot access" button isi ko call
 * karta hai — iske bina channel tasks verify nahi ho paate.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const url = new URL(req.url);
    let chatRef = url.searchParams.get("chat");
    const taskId = url.searchParams.get("task_id");

    if (!chatRef && taskId) {
      const supabase = createAdminClient();
      const { data: task } = await supabase
        .from("tasks")
        .select("target_id, target_link, title")
        .eq("id", taskId)
        .maybeSingle();
      chatRef = normalizeChatRef(task?.target_id) ?? normalizeChatRef(task?.target_link);
    }

    const normalized = normalizeChatRef(chatRef);
    if (!normalized) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Chat resolve nahi hui. Public channel/group ka @username ya numeric chat id (jaise -1001234567890) daalo. " +
            "Private invite links (+hash) verify nahi ho sakte.",
          code: "unresolvable_chat",
        },
        { status: 400 }
      );
    }

    const [access, botId] = await Promise.all([getBotChatAccess(normalized), getBotId()]);

    if (access.reason === "no_token") {
      return NextResponse.json(
        { success: false, error: "TELEGRAM_BOT_TOKEN set nahi hai.", code: "no_token" },
        { status: 500 }
      );
    }

    if (!access.ok) {
      return NextResponse.json({
        success: false,
        code: access.reason ?? "error",
        error:
          access.reason === "chat_not_found"
            ? `Telegram pe "${normalized}" naam ki chat nahi mili. Link/ID dobara check karo.`
            : `Bot is chat me admin nahi hai (bot status: ${access.botStatus ?? "not a member"}). ` +
              `Bot ko @BotFather se banaya hoga — usse channel/group me add karke "Administrator" banao, ` +
              `"Manage members"/"Restrict members" permission do.`,
        data: { chat: normalized, bot_id: botId, bot_status: access.botStatus ?? null },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        chat: normalized,
        chat_title: access.chatTitle ?? null,
        chat_type: access.chatType ?? null,
        bot_id: botId,
        bot_status: access.botStatus ?? null,
      },
    });
  } catch (err) {
    console.error("[admin/tasks/check-bot]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
