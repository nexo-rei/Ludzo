import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { requireAdminAuth } from "@/lib/auth";
import { isSuperAdmin, moderatorForbidden, ROLE_MODERATOR } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-log";

/**
 * /api/admin/moderators — Moderator team management.
 * SIRF full admin (role != moderator) use kar sakta hai.
 *
 *   GET    → moderator list
 *   POST   { username, password }                       → naya moderator banao
 *   PATCH  { moderator_id, action, password? }         → activate / deactivate /
 *                                                        reset_password / delete
 */

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

const RESERVED_USERNAMES = new Set(["admin", "administrator", "root", "owner"]);

function validatePassword(password: string): string | null {
  if (!password || password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 128) return "Password too long";
  return null;
}

function validateUsername(username: string): string | null {
  if (!username || username.length < 3) return "Username must be at least 3 characters";
  if (username.length > 32) return "Username too long";
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    return "Username can only contain letters, numbers, dot, dash and underscore";
  }
  if (RESERVED_USERNAMES.has(username.toLowerCase())) return "This username is reserved";
  return null;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
  if (!isSuperAdmin(auth.role)) return moderatorForbidden();

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("admin_users")
      .select("id, username, role, is_active, created_by, created_at, updated_at")
      .eq("role", ROLE_MODERATOR)
      .order("created_at", { ascending: false });
    if (error) throw error;

    return NextResponse.json({ success: true, data: { items: data ?? [] } });
  } catch (err) {
    console.error("[admin/moderators GET]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
  if (!isSuperAdmin(auth.role)) return moderatorForbidden();

  try {
    const body = await req.json();
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");

    const usernameErr = validateUsername(username);
    if (usernameErr) return NextResponse.json({ success: false, error: usernameErr }, { status: 400 });
    const passwordErr = validatePassword(password);
    if (passwordErr) return NextResponse.json({ success: false, error: passwordErr }, { status: 400 });

    const supabase = createAdminClient();

    // Username clash check (existing admin/moderator dono se)
    const { data: existing } = await supabase
      .from("admin_users")
      .select("id")
      .ilike("username", username)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ success: false, error: "Username already taken" }, { status: 409 });
    }

    const { data: created, error } = await supabase
      .from("admin_users")
      .insert({
        username,
        password_hash: sha256(password),
        role: ROLE_MODERATOR,
        is_active: true,
        created_by: auth.adminId ?? null,
      })
      .select("id, username, role, is_active, created_at")
      .single();
    if (error) throw error;

    await logAdminAction(supabase, {
      adminId: auth.adminId,
      action: "moderator_created",
      targetType: "admin_user",
      targetId: created.id,
      details: { username },
    });

    return NextResponse.json({ success: true, data: created });
  } catch (err) {
    console.error("[admin/moderators POST]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
  if (!isSuperAdmin(auth.role)) return moderatorForbidden();

  try {
    const body = await req.json();
    const moderatorId = String(body.moderator_id ?? "").trim();
    const action = String(body.action ?? "").trim();

    if (!moderatorId || !action) {
      return NextResponse.json({ success: false, error: "moderator_id and action required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Target must exist AND must be a moderator — kabhi bhi full admin ko
    // moderator endpoint se touch na kiya ja sake.
    const { data: target, error: findErr } = await supabase
      .from("admin_users")
      .select("id, username, role")
      .eq("id", moderatorId)
      .maybeSingle();
    if (findErr) return NextResponse.json({ success: false, error: findErr.message }, { status: 500 });
    if (!target || target.role !== ROLE_MODERATOR) {
      return NextResponse.json({ success: false, error: "Moderator not found" }, { status: 404 });
    }

    if (action === "activate" || action === "deactivate") {
      const { error } = await supabase
        .from("admin_users")
        .update({ is_active: action === "activate" })
        .eq("id", moderatorId);
      if (error) throw error;
    } else if (action === "reset_password") {
      const password = String(body.password ?? "");
      const passwordErr = validatePassword(password);
      if (passwordErr) return NextResponse.json({ success: false, error: passwordErr }, { status: 400 });
      const { error } = await supabase
        .from("admin_users")
        .update({ password_hash: sha256(password) })
        .eq("id", moderatorId);
      if (error) throw error;
    } else if (action === "delete") {
      const { error } = await supabase.from("admin_users").delete().eq("id", moderatorId);
      if (error) throw error;
    } else {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    await logAdminAction(supabase, {
      adminId: auth.adminId,
      action: `moderator_${action}`,
      targetType: "admin_user",
      targetId: moderatorId,
      details: { username: target.username },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/moderators PATCH]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
