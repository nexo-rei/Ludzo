import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";
import { isSuperAdmin, moderatorForbidden } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/admin/logs — admin action logs.
 *
 * Crash fix (page used to throw "Application error: a client-side exception"):
 *   • `details` JSONB ko hamesha **string** me convert karke bhejte hain —
 *     pehle object bhej rahe the aur React object ko child bana ke crash ho jata tha.
 *   • column names defensive hain (`action` / `action_type`, `admin_id` / `admin_user`),
 *     aur query fail hone par minimal select se retry hota hai.
 *   • response me `items` hamesha array hota hai (undefined nahi).
 */

const MISSING_TABLE = (code?: string, message?: string) =>
  code === "42P01" ||
  code === "PGRST205" ||
  /does not exist|schema cache|could not find the table/i.test(message ?? "");

function serializeDetails(details: unknown): string | undefined {
  if (details === undefined || details === null) return undefined;
  if (typeof details === "string") return details || undefined;
  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

type LogRow = Record<string, unknown>;

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
  if (!isSuperAdmin(auth.role)) return moderatorForbidden();

  try {
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const limit = Math.min(200, Math.max(10, Number(url.searchParams.get("limit") ?? "50")));
    const offset = (page - 1) * limit;
    const action = url.searchParams.get("action") ?? "all";

    const supabase = createAdminClient();

    const build = (columns: string) => {
      let q = supabase
        .from("admin_logs")
        .select(columns, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      if (action !== "all") q = q.eq("action", action);
      return q;
    };

    // Pehla attempt: naya schema. Fail ho to sirf guaranteed columns.
    let { data, count, error } = await build(
      "id, admin_id, admin_user, action, action_type, target_type, target_id, target, details, created_at"
    );

    if (error) {
      console.error("[admin/logs] full select failed:", error.message);
      const retry = await build("id, action_type, target, created_at");
      data = retry.data as typeof data;
      count = retry.count;
      error = retry.error;

      if (error && action !== "all") {
        // Purane schema me action column nahi hai — filter ke bina try karo
        const retry2 = await supabase
          .from("admin_logs")
          .select("id, action_type, target, created_at", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);
        data = retry2.data as typeof data;
        count = retry2.count;
        error = retry2.error;
      }
    }

    if (error) {
      if (MISSING_TABLE(error.code, error.message)) {
        return NextResponse.json({
          success: true,
          data: { items: [], total: 0, page, limit, warning: "admin_logs_table_missing" },
        });
      }
      throw error;
    }

    const rows = (data ?? []) as unknown as LogRow[];

    // Admin usernames resolve (agar admin_user column exist nahi karta)
    const adminIds = [...new Set(rows.map((r) => r.admin_id).filter(Boolean))] as string[];
    let adminMap: Record<string, string> = {};
    if (adminIds.length > 0) {
      try {
        const { data: admins } = await supabase.from("admin_users").select("id, username").in("id", adminIds);
        adminMap = Object.fromEntries((admins ?? []).map((a) => [a.id as string, a.username as string]));
      } catch {
        /* ignore */
      }
    }

    const items = rows.map((l) => ({
      id: String(l.id ?? Math.random().toString(36).slice(2)),
      admin_user:
        (typeof l.admin_user === "string" && l.admin_user) ||
        adminMap[String(l.admin_id ?? "")] ||
        (l.admin_id ? `admin:${String(l.admin_id).slice(0, 8)}` : "System"),
      action_type: String(l.action ?? l.action_type ?? "unknown"),
      target: (l.target_id ?? l.target ?? null) as string | null,
      target_type: (l.target_type ?? null) as string | null,
      details: serializeDetails(l.details) ?? null,
      created_at: (l.created_at ?? null) as string | null,
    }));

    return NextResponse.json({ success: true, data: { items, total: count ?? 0, page, limit } });
  } catch (err) {
    console.error("[admin/logs]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
