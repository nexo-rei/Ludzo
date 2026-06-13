import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Verify task completion and award reward
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok)
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: 401 }
    );

  try {
    const body = await req.json();
    const taskId = body.task_id as string;
    if (!taskId)
      return NextResponse.json(
        { success: false, error: "task_id required" },
        { status: 400 }
      );

    const supabase = createAdminClient();

    // ✅ FIX: Look up user by `id` (UUID), not `telegram_id`.
    // Also fetch `telegram_id` so we can use it for the Telegram Bot API check below.
    const { data: user } = await supabase
      .from("users")
      .select("id, status, telegram_id")
      .eq("id", auth.userId!)
      .maybeSingle();

    if (!user)
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    if (user.status === "suspended")
      return NextResponse.json(
        { success: false, error: "Account suspended" },
        { status: 403 }
      );

    const { data: task } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("is_active", true)
      .maybeSingle();

    if (!task)
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );

    const { data: userTask } = await supabase
      .from("user_tasks")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("task_id", taskId)
      .maybeSingle();

    if (userTask?.status === "completed") {
      return NextResponse.json(
        { success: false, error: "Task already completed" },
        { status: 400 }
      );
    }

    // For channel/group tasks, verify membership via Telegram Bot API.
    // ✅ FIX: Use user.telegram_id (the actual Telegram numeric ID),
    // not auth.userId (which is a UUID).
    if (task.type === "channel_join" || task.type === "group_join") {
      if (task.target_id && user.telegram_id) {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (botToken) {
          try {
            const checkRes = await fetch(
              `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${task.target_id}&user_id=${user.telegram_id}`
            );
            const checkData = await checkRes.json();
            const memberStatus = checkData?.result?.status;
            const validStatuses = ["member", "administrator", "creator"];
            if (!validStatuses.includes(memberStatus)) {
              return NextResponse.json(
                {
                  success: false,
                  error: "Please join the channel/group first",
                },
                { status: 400 }
              );
            }
          } catch {
            // If bot check fails, allow completion (graceful degradation)
          }
        }
      }
    }

    // Mark completed and award reward
    const now = new Date().toISOString();
    if (userTask) {
      await supabase
        .from("user_tasks")
        .update({ status: "completed", completed_at: now })
        .eq("id", userTask.id);
    } else {
      await supabase.from("user_tasks").insert({
        user_id: user.id,
        task_id: taskId,
        status: "completed",
        completed_at: now,
      });
    }

    await supabase.rpc("credit_coins", {
      p_user_id: user.id,
      p_amount: task.reward_coins,
      p_reason: "task_reward",
    });

    return NextResponse.json({
      success: true,
      data: { reward: task.reward_coins, task_title: task.title },
    });
  } catch (err) {
    console.error("[tasks/verify]", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
