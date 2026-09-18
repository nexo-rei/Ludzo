import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * PostgREST / Postgres "column does not exist" — admin DBs ke schema drift
 * ki wajah se reviewed_by / paid_at / admin_note jaise columns missing ho
 * sakte hain. Update ko un columns ke bina retry karo, kaam rukna nahi chahiye.
 */
function missingColumn(message: string): string | null {
  const patterns = [
    /Could not find the '([^']+)' column/i,
    /column ["']([a-zA-Z0-9_]+)["'] of relation/i,
    /column ["']?([a-zA-Z0-9_]+)["']? does not exist/i,
    /schema cache.*['"]([a-zA-Z0-9_]+)['"]/i,
  ];
  for (const re of patterns) {
    const m = message.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

export async function updateById(
  supabase: SupabaseClient,
  table: string,
  id: string,
  payload: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; error: string; code?: string }> {
  let fields: Record<string, unknown> = { ...payload };
  for (let attempt = 0; attempt < 8; attempt++) {
    const { error, data } = await supabase
      .from(table)
      .update(fields)
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (!error) {
      if (!data) return { ok: false, error: "Row was not updated" };
      return { ok: true };
    }

    const col = missingColumn(error.message ?? "");
    if (col && Object.prototype.hasOwnProperty.call(fields, col)) {
      const next = { ...fields };
      delete next[col];
      fields = next;
      continue;
    }

    return { ok: false, error: error.message ?? "Update failed", code: error.code };
  }
  return { ok: false, error: "Update failed after retries" };
}

export async function rpcOrError(
  supabase: SupabaseClient,
  fn: string,
  args: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.rpc(fn, args);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
