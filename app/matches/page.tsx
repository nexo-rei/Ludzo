"use client";

/**
 * LUDZO — /matches now lives inside the Gaming Hub as /games/matches
 * ─────────────────────────────────────────────────────────────────────────────
 * The "Matches" tab was removed from the hub nav (3 tabs now: Home, Play,
 * Profile) and match history moved under Profile → "Battle History".
 * This route is kept so old links / bookmarks never dead-end.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MatchesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/games/matches");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
      <div className="flex flex-col items-center gap-3">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500/30 border-t-purple-500" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          Opening battle history…
        </span>
      </div>
    </div>
  );
}
