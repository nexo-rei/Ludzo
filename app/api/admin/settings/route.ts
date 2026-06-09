import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("settings").select("key, value");
    if (error) throw error;

    const settings: Record<string, string> = {};
    (data ?? []).forEach(({ key, value }) => { settings[key] = value; });

    return NextResponse.json({ success: true, data: settings });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const body = await req.json();
    const settings = body as Record<string, string>;

    const supabase = createAdminClient();
    const upserts = Object.entries(settings).map(([key, value]) => ({
      key,
      value: String(value),
      updated_at: new Date().toISOString(),
      updated_by: auth.adminId,
    }));

    await supabase.from("settings").upsert(upserts, { onConflict: "key" });

    await supabase.from("admin_logs").insert({
      admin_id: auth.adminId,
      action: "settings_update",
      details: settings,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
