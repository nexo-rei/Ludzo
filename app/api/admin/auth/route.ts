import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAdminToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body as { username?: string; password?: string };

    if (!username || !password) {
      return NextResponse.json({ success: false, error: "Username and password required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: allAdmins, error } = await supabase
      .from("admin_users")
      .select("username");

console.log("ALL_ADMINS:", JSON.stringify(allAdmins));
console.log("ADMIN_ERROR:", JSON.stringify(error));
    const { data: admin } = await supabase
      .from("admin_users")
      .select("id, username, password_hash, role, is_active")
      .eq("username", username)
      .maybeSingle();
    console.log("LOGIN_USERNAME:", username);
    console.log("ADMIN_ROW:", JSON.stringify(admin));

    if (!admin || !admin.is_active) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
    }

    // Verify password (bcrypt comparison)
    const { createHash } = await import("crypto");
    const hash = createHash("sha256").update(password).digest("hex");
  console.log("INPUT_HASH:", hash);
  console.log("DB_HASH:", admin?.password_hash);
  console.log("HASH_MATCH:", admin?.password_hash === hash);
    if (admin.password_hash !== hash) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
    }

    const token = await generateAdminToken({ adminId: admin.id, username: admin.username, role: admin.role });

    // Log login
    await supabase.from("admin_logs").insert({
      admin_id: admin.id,
      action: "admin_login",
      details: { username },
    });

    return NextResponse.json({
      success: true,
      data: { token, admin: { id: admin.id, username: admin.username, role: admin.role } },
    });
  } catch (err) {
    console.error("[admin/auth]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
