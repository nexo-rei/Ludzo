import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const limit = 20;
    const offset = (page - 1) * limit;
    const status = url.searchParams.get("status") ?? "all";
    const priority = url.searchParams.get("priority") ?? "all";

    const supabase = createAdminClient();
    let query = supabase
      .from("announcements")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status === "active") query = query.eq("is_active", true);
    else if (status === "inactive") query = query.eq("is_active", false);
    if (priority !== "all") query = query.eq("priority", priority);

    const { data, count, error } = await query;
    if (error) throw error;
    return NextResponse.json({ success: true, data: { items: data ?? [], total: count ?? 0, page, limit } });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const body = await req.json();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("announcements")
      .insert({ title: body.title, description: body.description ?? body.content, priority: body.priority ?? "low", is_active: body.is_active ?? true })
      .select("id").single();

    if (error) {
  console.error("ANNOUNCEMENT ERROR:", error);
  throw error;
    }

    await supabase.from("admin_logs").insert({
      admin_id: auth.adminId,
      action: "announcement_create",
      target_type: "announcement",
      target_id: data.id,
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const body = await req.json();
    const { id, ...fields } = body;
    const supabase = createAdminClient();
    await supabase.from("announcements").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", id);
    await supabase.from("admin_logs").insert({
      admin_id: auth.adminId, action: "announcement_update", target_type: "announcement", target_id: id,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "id required" }, { status: 400 });

    const supabase = createAdminClient();
    await supabase.from("announcements").delete().eq("id", id);
    await supabase.from("admin_logs").insert({
      admin_id: auth.adminId, action: "announcement_delete", target_type: "announcement", target_id: id,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
