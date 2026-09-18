import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAdminToken, requireAdminAuth } from "@/lib/auth";
import { logAdminAction } from "@/lib/admin-log";

/**
 * POST /api/admin/auth — login (admin + moderator dono yahin se).
 * GET  /api/admin/auth — "me": token se current username/role (client hydrate).
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body as { username?: string; password?: string };

    if (!username || !password) {
      return NextResponse.json({ success: false, error: "Username and password required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: admin } = await supabase
      .from("admin_users")
      .select("id, username, password_hash, role, is_active")
      .eq("username", username)
      .maybeSingle();

    if (!admin || !admin.is_active) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
    }

    // Verify password (sha256 hex comparison)
    const { createHash } = await import("crypto");
    const hash = createHash("sha256").update(password).digest("hex");
    if (admin.password_hash !== hash) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
    }

    const token = await generateAdminToken({ adminId: admin.id, username: admin.username, role: admin.role ?? "admin" });

    // Log login
    await logAdminAction(supabase, {
      adminId: admin.id,
      adminUsername: username,
      action: "admin_login",
      details: { username, role: admin.role },
    });

    return NextResponse.json({
      success: true,
      data: {
        token,
        admin: { id: admin.id, username: admin.username, role: admin.role ?? "admin" },
      },
    });
  } catch (err) {
    console.error("[admin/auth]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("admin_users")
    .select("id, username, role")
    .eq("id", auth.adminId!)
    .maybeSingle();

  const username = row?.username ?? auth.username ?? "admin";
  const role = (row?.role ?? auth.role ?? "admin") as string;

  return NextResponse.json({ success: true, data: { id: auth.adminId, username, role } });
}
