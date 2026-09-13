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

        const { error: upsertErr } = await supabase
      .from("settings")
      .upsert(upserts, { onConflict: "key" });

    if (upsertErr) {
      console.error(
        `[ADMIN SETTINGS] UPSERT FAILED code=${upsertErr.code} ${upsertErr.message} ` +
        `details=${upsertErr.details ?? "-"} hint=${upsertErr.hint ?? "-"} ` +
        `keys=${JSON.stringify(upserts.map(u => u.key))}`
      );
      return NextResponse.json(
        { success: false, error: `Save failed: ${upsertErr.message}` },
        { status: 500 }
      );
    }

    const { data: verify } = await supabase
      .from("settings")
      .select("key, value")
      .eq("key", "maintenance_mode")
      .maybeSingle();
    console.log(`[ADMIN SETTINGS] saved. maintenance_mode now = ${JSON.stringify(verify?.value)}`);

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
