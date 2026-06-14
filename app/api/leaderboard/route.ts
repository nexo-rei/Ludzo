import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const url    = new URL(req.url);
    const period = url.searchParams.get("period") ?? "all"; // all | month | week
    const limit  = Math.min(100, Number(url.searchParams.get("limit") ?? "50"));

    // Auth optional — only used to return the current user's own rank
    const auth = await requireAuth(req).catch(() => ({ ok: false as const, error: "" }));

    const supabase = createAdminClient();

    // ── Fetch top-N leaderboard ──────────────────────────────
    const { data, error } = await supabase.rpc("get_leaderboard", {
      p_limit:  limit,
      p_period: period,
    });

    if (error) {
      console.error("[leaderboard] rpc get_leaderboard error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // ── Fetch caller's rank if they're outside the top-N list ─
    let my_rank: { rank: number; usdt_earned: number } | null = null;

    if (auth.ok) {
      const inList = (data ?? []).some(
        (e: { user_id: string }) => e.user_id === auth.userId
      );

      if (!inList) {
        const { data: rankData, error: rankError } = await supabase.rpc("get_user_rank", {
          p_user_id: auth.userId!,
          p_period:  period,
        });

        if (rankError) {
          console.error("[leaderboard] rpc get_user_rank error:", rankError);
        } else if (rankData?.[0]) {
          my_rank = {
            rank:        Number(rankData[0].rank),
            usdt_earned: Number(rankData[0].usdt_earned),
          };
        }
      }
    }

    return NextResponse.json({
      success: true,
      data:    data ?? [],
      my_rank,
    });

  } catch (err) {
    console.error("[leaderboard]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
