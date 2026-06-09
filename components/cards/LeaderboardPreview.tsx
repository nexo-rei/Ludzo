"use client";

import { motion } from "framer-motion";
import { Crown, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import Badge from "@/components/ui/Badge";
import type { LeaderboardEntry } from "@/types";
import { formatUSDT } from "@/lib/utils";

interface LeaderboardPreviewProps {
  entries: LeaderboardEntry[];
}

const RANK_BADGE: Record<number, "gold" | "silver" | "bronze"> = {
  1: "gold",
  2: "silver",
  3: "bronze",
};

const RANK_EMOJI: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function LeaderboardPreview({ entries }: LeaderboardPreviewProps) {
  const top3 = entries.slice(0, 3);

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Crown size={16} className="text-[#F59E0B]" />
          <span className="text-sm font-bold text-[var(--text-primary)]">Top Earners</span>
        </div>
        <Link
          href="/leaderboard"
          className="flex items-center gap-0.5 text-xs text-[#7C3AED] font-medium hover:text-[#A855F7]"
        >
          View All <ChevronRight size={12} />
        </Link>
      </div>

      <div className="space-y-2">
        {top3.map((entry, i) => (
          <motion.div
            key={entry.user_id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0"
          >
            <span className="text-base w-5 text-center">
              {RANK_EMOJI[entry.rank] ?? `#${entry.rank}`}
            </span>
            <div className="w-7 h-7 rounded-full bg-[var(--border)] overflow-hidden flex-shrink-0">
              {entry.photo_url ? (
                <Image src={entry.photo_url} alt={entry.first_name} width={28} height={28} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[var(--text-secondary)]">
                  {entry.first_name[0]}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                {entry.first_name} {entry.username ? `@${entry.username}` : ""}
              </div>
              {entry.country && (
                <div className="text-[10px] text-[var(--text-muted)]">{entry.country}</div>
              )}
            </div>
            <Badge variant={RANK_BADGE[entry.rank] ?? "default"} size="sm">
              ${formatUSDT(entry.total_usdt_earned)}
            </Badge>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
