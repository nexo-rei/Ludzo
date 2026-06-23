import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { queue_id } = await req.json();
    if (!queue_id) {
      return NextResponse.json({ success: false, error: "Queue ID is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const userId = auth.userId!;

    // Call cancellation RPC function (atomic and safe refund)
    const { data: success, error } = await supabase.rpc("cancel_ludo_queue", {
      p_queue_id: queue_id,
      p_user_id: userId
    });

    if (error || !success) {
      return NextResponse.json({ success: false, error: error?.message || "Failed to cancel or already matched" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[ludo_cancel_queue]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
