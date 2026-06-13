import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Start a task (sets status to in_progress)
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const body = await req.json();
    const taskId = body.task_id as string;
    if (!taskId) return NextResponse.json({ success: false, error: "task_id required" }, { status: 400 });

    const supabase = createAdminClient();
    const { data: user } = await supabase
      .from("users").select("id, status").eq("telegram_id", auth.userId!).maybeSingle();
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    if (user.status === "suspended") return NextResponse.json({ success: false, error: "Account suspended" }, { status: 403 });

    // Check task exists
    const { data: task } = await supabase
      .from("tasks").select("*").eq("id", taskId).eq("is_active", true).maybeSingle();
    if (!task) return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });

    // Already completed?
    const { data: existing } = await supabase
      .from("user_tasks")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("task_id", taskId)
      .maybeSingle();

    if (existing?.status === "completed") {
      return NextResponse.json({ success: false, error: "Task already completed" }, { status: 400 });
    }

    if (!existing) {
  const { error: insertError } = await supabase
    .from("user_tasks")
    .insert({
      user_id: user.id,
      task_id: taskId,
      status: "in_progress",
    });

  console.log("USER_TASK_INSERT_ERROR:", JSON.stringify(insertError));

  if (insertError) {
    throw insertError;
  }
    }

    return NextResponse.json({ success: true, data: { task_id: taskId, target_link: task.target_link } });
  } catch (err) {
    console.error("[tasks/claim]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
