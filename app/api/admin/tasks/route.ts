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
    const type = url.searchParams.get("type") ?? "all";
    const status = url.searchParams.get("status") ?? "all";

    const supabase = createAdminClient();
    let query = supabase
      .from("tasks")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (type !== "all") query = query.eq("type", type);
    if (status === "active") query = query.eq("is_active", true);
    else if (status === "inactive") query = query.eq("is_active", false);

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
  .from("tasks")
  .insert({
    title: body.title,
    description: body.description ?? null,
    type: body.type,
    reward_coins: Number(body.reward_coins),
    target_link: body.target_link ?? null,
    target_id: body.target_id ?? null,
    is_active: body.is_active ?? true,
    sort_order: body.sort_order ?? 0,
  })
  .select("id")
  .single();

if (error) {
  console.error(
    "TASK_CREATE_ERROR:",
    JSON.stringify(error)
  );
  throw error;
}

    await supabase.from("admin_logs").insert({
      admin_id: auth.adminId,
      action: "task_create",
      target_type: "task",
      target_id: data.id,
      details: { title: body.title },
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
    await supabase.from("tasks").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", id);

    await supabase.from("admin_logs").insert({
      admin_id: auth.adminId,
      action: "task_update",
      target_type: "task",
      target_id: id,
      details: fields,
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
    await supabase.from("tasks").delete().eq("id", id);

    await supabase.from("admin_logs").insert({
      admin_id: auth.adminId,
      action: "task_delete",
      target_type: "task",
      target_id: id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
