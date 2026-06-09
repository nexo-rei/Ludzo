import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const supabase = createAdminClient();
    const { data: user } = await supabase
      .from("users").select("id").eq("telegram_id", auth.userId!).maybeSingle();
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    const { data: userTasks } = await supabase
      .from("user_tasks")
      .select("task_id, status, completed_at")
      .eq("user_id", user.id);

    const userTaskMap = new Map(
      (userTasks ?? []).map((ut) => [ut.task_id, ut])
    );

    const result = (tasks ?? []).map((task) => ({
      ...task,
      user_task: userTaskMap.get(task.id) ?? null,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[tasks]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
