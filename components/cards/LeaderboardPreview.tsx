"use client";

import { type ReactElement } from "react";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import Badge from "@/components/ui/Badge";
import type { LeaderboardEntry } from "@/types";
import { formatUSDT } from "@/lib/utils";

interface LeaderboardPreviewProps {
  entries: LeaderboardEntry[];
}

const RANK_BADGE: Record<number, "gold" | "silver" | "bronze"> = { 1: "gold", 2: "silver", 3: "bronze" };

const RANK_COLORS: Record<number, { ring: string; bg: string; text: string }> = {
  1: { ring: "rgba(245,158,11,0.6)", bg: "rgba(245,158,11,0.12)", text: "#F59E0B" },
  2: { ring: "rgba(148,163,184,0.6)", bg: "rgba(148,163,184,0.1)", text: "#94A3B8" },
  3: { ring: "rgba(180,83,9,0.6)", bg: "rgba(180,83,9,0.1)", text: "#D97706" },
};

const RANK_ICONS: Record<number, ReactElement> = {
  1: <svg width="16" height="16" viewBox="0 0 24 24" fill="#F59E0B" stroke="none"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/></svg>,
  2: <svg width="16" height="16" viewBox="0 0 24 24" fill="#94A3B8" stroke="none"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/></svg>,
  3: <svg width="16" height="16" viewBox="0 0 24 24" fill="#D97706" stroke="none"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/></svg>,
};

export default function LeaderboardPreview({ entries }: LeaderboardPreviewProps) {
  const top3 = entries.slice(0, 3);

  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--card-bg)", border: "1px solid rgba(245,158,11,0.12)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#F59E0B" stroke="none">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/>
            </svg>
          </div>
          <span className="text-sm font-bold text-[var(--text-primary)]">Top Earners</span>
        </div>
        <Link href="/leaderboard"
          className="flex items-center gap-0.5 text-xs font-semibold hover:opacity-80 transition-opacity"
          style={{ color: "#A855F7" }}>
          View All <ChevronRight size={12} />
        </Link>
      </div>

      <div className="space-y-2">
        {top3.map((entry, i) => {
          const rankColors = RANK_COLORS[entry.rank] ?? { ring: "var(--border)", bg: "var(--bg-elevated)", text: "var(--text-muted)" };
          return (
            <motion.div
              key={entry.user_id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3 py-2 border-b last:border-0"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="w-6 h-6 flex items-center justify-center">
                {RANK_ICONS[entry.rank] ?? <span className="text-xs font-bold text-[var(--text-muted)]">#{entry.rank}</span>}
              </div>
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-bold"
                style={{ border: `1.5px solid ${rankColors.ring}`, background: rankColors.bg, color: rankColors.text }}>
                {entry.photo_url ? (
                  <Image src={entry.photo_url} alt={entry.first_name} width={32} height={32} className="object-cover" />
                ) : (
                  entry.first_name[0]
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                  {entry.first_name}
                  {entry.username && <span className="text-[var(--text-muted)] font-normal ml-1">@{entry.username}</span>}
                </div>
              </div>
              <Badge variant={RANK_BADGE[entry.rank] ?? "default"} size="sm">
                ${formatUSDT(entry.total_usdt_earned)}
              </Badge>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
