import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const supabase = createAdminClient();
    const { data: user } = await supabase
      .from("users").select("id").eq("id", auth.userId!).maybeSingle();
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    const { data: prefs } = await supabase
      .from("user_preferences").select("*").eq("user_id", user.id).maybeSingle();

    return NextResponse.json({ success: true, data: prefs ?? { theme: "dark", language: "en" } });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const body = await req.json();
    const allowed = ["theme", "language", "notifications_enabled"];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    const supabase = createAdminClient();
    const { data: user } = await supabase
      .from("users").select("id").eq("id", auth.userId!).maybeSingle();
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    await supabase
      .from("user_preferences")
      .upsert({ user_id: user.id, ...update, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
