import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Admin action logging — best-effort, **kabhi throw nahi karta**.
 *
 * Kyun: admin_logs table ka schema purane DBs me alag tha
 * (`admin_user` + `action_type` + `target`) aur naye code me
 * (`admin_id` + `action` + `target_type` + `target_id` + `details`).
 * Ye helper dono shapes me likhne ki koshish karta hai aur `details` ko
 * hamesha JSON **string** bhejta hai — is se React me "objects are not valid
 * as a React child" crash nahi hota (jo /admin/logs page ko tod raha tha).
 */
export interface AdminLogInput {
  adminId?: string | null;
  adminUsername?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  details?: unknown;
}

function serializeDetails(details: unknown): string | null {
  if (details === undefined || details === null) return null;
  if (typeof details === "string") return details;
  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

export async function logAdminAction(supabase: SupabaseClient, input: AdminLogInput): Promise<void> {
  const details = serializeDetails(input.details);

  const modern: Record<string, unknown> = {
    admin_id: input.adminId ?? null,
    admin_user: input.adminUsername ?? null,
    action: input.action,
    action_type: input.action,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    target: input.targetId ?? null,
    details,
  };

  const { error } = await supabase.from("admin_logs").insert(modern);
  if (!error) return;

  console.error("[logAdminAction] modern insert failed, trying legacy shape:", error.message);

  // Legacy shape: `admin_user` + `action_type` + `target`
  const legacy: Record<string, unknown> = {
    admin_user: input.adminUsername ?? "admin",
    action_type: input.action,
    target: input.targetId ?? null,
    details,
  };

  const { error: legacyErr } = await supabase.from("admin_logs").insert(legacy);
  if (legacyErr) {
    console.error("[logAdminAction] legacy insert failed too:", legacyErr.message);
  }
}
