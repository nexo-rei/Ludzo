"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { ChevronRightIcon, TrophyDuotoneIcon } from "@/components/ui/DuotoneIcons";
import { cn, displayName, formatUSDT, initials } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types";
import { useI18n } from "@/hooks/useI18n";

interface LeaderboardPreviewProps {
  entries: LeaderboardEntry[];
}

const RANK_BADGE: Record<number, "gold" | "silver" | "bronze"> = { 1: "gold", 2: "silver", 3: "bronze" };

const RANK_TONE: Record<number, { ring: string; bg: string; text: string }> = {
  1: { ring: "var(--accent)", bg: "var(--accent-soft)", text: "var(--accent)" },
  2: { ring: "var(--border)", bg: "var(--bg-elevated)", text: "var(--text-secondary)" },
  3: { ring: "var(--border)", bg: "var(--bg-elevated)", text: "var(--text-muted)" },
};

export default function LeaderboardPreview({ entries }: LeaderboardPreviewProps) {
  const { t } = useI18n();
  const top3 = entries.slice(0, 3);

  if (top3.length === 0) return null;

  return (
    <div className="rounded-2xl border" style={{ borderColor: "var(--border)", background: "var(--card-bg)" }}>
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--accent)]"
            style={{ background: "var(--accent-soft)" }}
            aria-hidden
          >
            <TrophyDuotoneIcon size={15} />
          </span>
          <span className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">{t("top_earners")}</span>
        </div>
        <Link
          href="/leaderboard"
          className="flex items-center gap-0.5 rounded-lg px-1.5 py-1 text-xs font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent-soft)]"
        >
          {t("view_all")} <ChevronRightIcon size={12} />
        </Link>
      </div>

      <ul>
        {top3.map((entry, i) => {
          const tone = RANK_TONE[entry.rank] ?? RANK_TONE[3];
          const name = displayName(entry);
          return (
            <motion.li
              key={entry.user_id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.26, ease: "easeOut" }}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--bg-elevated)]",
                i < top3.length - 1 && "border-b"
              )}
              style={{ borderColor: "var(--border)" }}
            >
              <span
                className="flex h-6 w-6 flex-none items-center justify-center rounded-lg text-[11px] font-semibold font-numeric"
                style={{ border: `1px solid ${tone.ring}`, background: tone.bg, color: tone.text }}
              >
                {entry.rank}
              </span>

              <span
                className="flex h-8 w-8 flex-none items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold"
                style={{ border: `1.5px solid ${tone.ring}`, background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
                aria-hidden
              >
                {entry.photo_url ? (
                  <Image src={entry.photo_url} alt="" width={32} height={32} className="h-full w-full object-cover" />
                ) : (
                  initials(name)
                )}
              </span>

              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--text-primary)]">{name}</span>

              <Badge variant={RANK_BADGE[entry.rank] ?? "default"} size="sm">
                ${formatUSDT(entry.usdt_earned)}
              </Badge>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
