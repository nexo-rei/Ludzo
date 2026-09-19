import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { normalizeLeaderboardRows } from "@/lib/leaderboard";
import { trackApiRequest } from "@/lib/usage-tracker";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Cloudflare quota counter — in-memory batched, per-request DB write nahi hota
  trackApiRequest("api");
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

    // Display rows: account name only — never a @username (lib/leaderboard.ts).
    // Real accounts only: the old admin "Display Profiles" merge is gone, so a
    // rank always belongs to a real Telegram account with real earnings.
    const entries = normalizeLeaderboardRows(data as never[]);

    // ── Fetch caller's rank if they're outside the top-N list ─
    let my_rank: { rank: number; usdt_earned: number } | null = null;

    if (auth.ok) {
      const inList = entries.some((e) => e.user_id === auth.userId);

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
      data:    entries,
      my_rank,
    });

  } catch (err) {
    console.error("[leaderboard]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
