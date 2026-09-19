import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackApiRequest } from "@/lib/usage-tracker";

export async function GET(_req: NextRequest) {
  // Cloudflare quota counter — in-memory batched, per-request DB write nahi hota
  trackApiRequest("api");
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("announcements")
      .select("id, title, description, priority, created_at")
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;
    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    console.error("[announcements]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
