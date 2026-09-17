import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { creditCoins, type CreditCoinsResult } from "@/lib/coins";
import { checkChatMembership, resolveTaskChatRef } from "@/lib/telegram-chat";

const JOIN_TYPES = ["channel_join", "group_join"];

/**
 * POST /api/tasks/verify — task complete karo aur reward lo.
 *
 * Join tasks me reward sirf tab milta hai jab Telegram Bot API
 * (`getChatMember`) confirm kare ki user sach me channel/group ka member hai.
 * Bot us chat me admin hona chahiye — wahi membership ka source of truth hai.
 *
 * Error codes jo frontend handle karta hai:
 *   not_joined        → "Please first join the channel/group…"
 *   bot_not_admin     → verification abhi possible nahi (admin ko batana hai)
 *   chat_not_configured / chat_not_found → task setup galat hai
 *   already_completed / reward_failed
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const taskId = body.task_id as string | undefined;
    if (!taskId) {
      return NextResponse.json({ success: false, error: "task_id required", code: "bad_request" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: user } = await supabase
      .from("users")
      .select("id, status, telegram_id")
      .eq("id", auth.userId!)
      .maybeSingle();

    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    if (user.status === "suspended") {
      return NextResponse.json({ success: false, error: "Account suspended" }, { status: 403 });
    }

    const { data: task } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("is_active", true)
      .maybeSingle();

    if (!task) return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });

    const { data: userTask } = await supabase
      .from("user_tasks")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("task_id", taskId)
      .maybeSingle();

    if (userTask?.status === "completed") {
      return NextResponse.json(
        { success: false, error: "Task already completed", code: "already_completed" },
        { status: 400 }
      );
    }

    // ── 1. Channel / group join verification (Bot API) ──────────────────────
    if (JOIN_TYPES.includes(task.type)) {
      if (!user.telegram_id) {
        return NextResponse.json(
          { success: false, error: "Telegram account verify nahi hua. App dobara kholo.", code: "no_telegram_id" },
          { status: 400 }
        );
      }

      const chatRef = resolveTaskChatRef(task);
      if (!chatRef) {
        console.error("[tasks/verify] task me verifiable chat nahi hai. task_id=", taskId, "target_id=", task.target_id);
        return NextResponse.json(
          {
            success: false,
            code: "chat_not_configured",
            error:
              "Is task ka channel verify nahi ho sakta — admin ko is task me channel/group ka @username ya chat ID add karni hogi.",
          },
          { status: 400 }
        );
      }

      const membership = await checkChatMembership(chatRef, user.telegram_id);

      if (!membership.joined) {
        switch (membership.reason) {
          case "not_joined":
            return NextResponse.json(
              {
                success: false,
                code: "not_joined",
                error: "Please first join the channel/group, then tap Verify again.",
                data: { chat: chatRef, user_status: membership.userStatus ?? "left" },
              },
              { status: 400 }
            );
          case "bot_not_admin":
            return NextResponse.json(
              {
                success: false,
                code: "bot_not_admin",
                error:
                  "Verification abhi available nahi hai — bot is channel me admin nahi hai. Please try again later or contact support.",
              },
              { status: 503 }
            );
          case "chat_not_found":
            return NextResponse.json(
              { success: false, code: "chat_not_found", error: "Channel/group nahi mila. Please contact support." },
              { status: 400 }
            );
          case "no_token":
            return NextResponse.json(
              { success: false, code: "no_token", error: "Verification abhi available nahi hai. Please try later." },
              { status: 503 }
            );
          default:
            return NextResponse.json(
              {
                success: false,
                code: "verify_failed",
                error: "Channel membership check nahi ho paayi. Please try again.",
                detail: membership.detail,
              },
              { status: 502 }
            );
        }
      }
    }

    // ── 2. Task ko completed mark karo (idempotent) ─────────────────────────
    const now = new Date().toISOString();
    const reward = Number(task.reward_coins ?? 0);

    // Purane DBs me `reward_coins` column na ho to uske bina retry karo
    const missingColumn = (msg?: string) => /reward_coins|column .* does not exist|schema cache/i.test(msg ?? "");

    let updated: { id: string }[] | null = null;
    let updateErr: { message?: string } | null = null;

    ({ data: updated, error: updateErr } = await supabase
      .from("user_tasks")
      .update({ status: "completed", completed_at: now, reward_coins: reward })
      .eq("user_id", user.id)
      .eq("task_id", taskId)
      .select("id"));

    if (updateErr && missingColumn(updateErr.message)) {
      ({ data: updated, error: updateErr } = await supabase
        .from("user_tasks")
        .update({ status: "completed", completed_at: now })
        .eq("user_id", user.id)
        .eq("task_id", taskId)
        .select("id"));
    }

    if (updateErr) throw updateErr;

    if (!updated || updated.length === 0) {
      let { error: insertErr } = await supabase.from("user_tasks").insert({
        user_id: user.id,
        task_id: taskId,
        status: "completed",
        completed_at: now,
        reward_coins: reward,
      });

      if (insertErr && missingColumn(insertErr.message)) {
        ({ error: insertErr } = await supabase.from("user_tasks").insert({
          user_id: user.id,
          task_id: taskId,
          status: "completed",
          completed_at: now,
        }));
      }

      // Unique index race — dusri request pehle hi complete kar chuki hai
      if (insertErr && !/duplicate key/i.test(insertErr.message)) throw insertErr;
    }

    // ── 3. Coins credit (RPC → fallback) ───────────────────────────────────
    let credit: CreditCoinsResult = { ok: true };
    if (reward > 0) {
      credit = await creditCoins(supabase, { userId: user.id, amount: reward, reason: "task_reward" });
    }

    if (!credit.ok) {
      console.error("[tasks/verify] credit failed:", credit.error);
      // Reward na mila to task ko in_progress wapas karo (dobara try kar sake)
      await supabase
        .from("user_tasks")
        .update({ status: "in_progress", completed_at: null })
        .eq("user_id", user.id)
        .eq("task_id", taskId);

      return NextResponse.json(
        { success: false, code: "reward_failed", error: "Reward credit nahi ho paaya. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        reward,
        task_title: task.title,
        type: task.type,
        verified: JOIN_TYPES.includes(task.type),
      },
    });
  } catch (err) {
    console.error("[tasks/verify]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
