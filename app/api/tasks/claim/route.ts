import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTaskChatRef } from "@/lib/telegram-chat";
import { trackApiRequest } from "@/lib/usage-tracker";

// Start a task (sets status to in_progress)
export async function POST(req: NextRequest) {
  // Cloudflare quota counter — in-memory batched, per-request DB write nahi hota
  trackApiRequest("api");
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
    // auth.userId contains the UUID sent via x-user-id header.
    const { data: user } = await supabase
      .from("users")
      .select("id, status")
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

    // Check task exists and is active
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

    // Check for existing user_task record
    const { data: existing } = await supabase
      .from("user_tasks")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("task_id", taskId)
      .maybeSingle();

    if (existing?.status === "completed") {
      return NextResponse.json(
        { success: false, error: "Task already completed" },
        { status: 400 }
      );
    }

    // Only insert if no record exists yet
    if (!existing) {
      const { error: insertError } = await supabase
        .from("user_tasks")
        .insert({
          user_id: user.id,
          task_id: taskId,
          status: "in_progress",
        });

      if (insertError) {
        console.error("[tasks/claim] INSERT ERROR:", JSON.stringify(insertError));
        throw insertError;
      }
    }

    // Link na ho to @username se bana do (task me target_id ho to)
    const chatRef = resolveTaskChatRef(task);
    const targetLink =
      task.target_link ||
      (chatRef && chatRef.startsWith("@") ? `https://t.me/${chatRef.slice(1)}` : null);

    return NextResponse.json({
      success: true,
      data: {
        task_id: taskId,
        target_link: targetLink,
        type: task.type,
        // join tasks ke liye reward sirf Bot-API membership check ke baad milega
        requires_verification: task.type === "channel_join" || task.type === "group_join",
      },
    });
  } catch (err) {
    console.error("[tasks/claim]", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
