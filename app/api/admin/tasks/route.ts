import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-log";
import { getBotChatAccess, normalizeChatRef } from "@/lib/telegram-chat";

const JOIN_TYPES = ["channel_join", "group_join"];

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const limit = Math.min(200, Math.max(5, Number(url.searchParams.get("limit") ?? "20")));
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
    console.error("[admin/tasks GET]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const body = await req.json();

    const title = String(body.title ?? "").trim();
    const type = String(body.type ?? "channel_join");
    if (!title) return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });

    // Channel/group task ke liye verifiable chat chahiye
    const targetLink: string | null = body.target_link ? String(body.target_link).trim() : null;
    const targetId: string | null = normalizeChatRef(body.target_id) ?? normalizeChatRef(targetLink);

    if (JOIN_TYPES.includes(type) && !targetId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Channel/group task ke liye target link (@username ya t.me/public-channel) ya numeric Chat ID daalo. " +
            "Private invite link (+hash) verify nahi ho sakta — wahan -100… chat id chahiye.",
        },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title,
        description: body.description ?? null,
        type,
        reward_coins: Number(body.reward_coins ?? 0),
        target_link: targetLink,
        target_id: targetId,
        is_active: body.is_active ?? true,
        sort_order: Number(body.sort_order ?? 0),
      })
      .select("id")
      .single();

    if (error) {
      console.error("TASK_CREATE_ERROR:", JSON.stringify(error));
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Bot us chat me admin hai ya nahi — soft warning (task phir bhi ban jayega)
    let warning: string | null = null;
    if (JOIN_TYPES.includes(type) && targetId) {
      const access = await getBotChatAccess(targetId);
      if (!access.ok) {
        warning = access.reason === "chat_not_found"
          ? `Chat "${targetId}" Telegram pe nahi mila — link/ID check karo.`
          : `Bot is chat me admin nahi hai (${targetId}). Bot ko admin banao, warna users verify nahi kar payenge.`;
      }
    }

    await logAdminAction(supabase, {
      adminId: auth.adminId,
      action: "task_create",
      targetType: "task",
      targetId: data.id,
      details: { title, type, target_id: targetId },
    });

    return NextResponse.json({ success: true, data, warning });
  } catch (err) {
    console.error("[admin/tasks POST]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const body = await req.json();
    const { id, ...rest } = body;
    if (!id) return NextResponse.json({ success: false, error: "id required" }, { status: 400 });

    const fields: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() };
    if (fields.target_link !== undefined) fields.target_link = fields.target_link || null;
    if (fields.target_id !== undefined) fields.target_id = normalizeChatRef(String(fields.target_id ?? "")) ?? null;
    if (fields.reward_coins !== undefined) fields.reward_coins = Number(fields.reward_coins);
    if (fields.sort_order !== undefined) fields.sort_order = Number(fields.sort_order);

    const supabase = createAdminClient();
    const { error } = await supabase.from("tasks").update(fields).eq("id", id);
    if (error) throw error;

    await logAdminAction(supabase, {
      adminId: auth.adminId,
      action: "task_update",
      targetType: "task",
      targetId: id,
      details: fields,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/tasks PATCH]", err);
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
    // Soft delete — user_tasks history aur rewards intact rehte hain
    const { error } = await supabase
      .from("tasks")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;

    await logAdminAction(supabase, {
      adminId: auth.adminId,
      action: "task_delete",
      targetType: "task",
      targetId: id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/tasks DELETE]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
