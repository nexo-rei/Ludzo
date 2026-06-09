import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const limit = 50;
    const offset = (page - 1) * limit;
    const action = url.searchParams.get("action") ?? "all";

    const supabase = createAdminClient();
    let query = supabase
      .from("admin_logs")
      .select("id, admin_id, action, target_type, target_id, details, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (action !== "all") query = query.eq("action", action);

    const { data: logs, count, error } = await query;
    if (error) throw error;

    // Attach admin usernames
    const adminIds = [...new Set((logs ?? []).map((l) => l.admin_id).filter(Boolean))];
    let adminMap: Record<string, string> = {};
    if (adminIds.length > 0) {
      const { data: admins } = await supabase
        .from("admin_users").select("id, username").in("id", adminIds);
      adminMap = Object.fromEntries((admins ?? []).map((a) => [a.id, a.username]));
    }

    const items = (logs ?? []).map((l) => ({
      ...l,
      // Alias for page consumption
      admin_user: adminMap[l.admin_id] ?? "Unknown",
      action_type: l.action,
    }));

    return NextResponse.json({ success: true, data: { items, total: count ?? 0, page, limit } });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
