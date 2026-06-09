"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import { SkeletonList } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { formatUSDT } from "@/lib/utils";

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  first_name: string;
  username?: string;
  photo_url?: string;
  usdt_earned: number;
}

const MEDAL = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("all");

  const load = async (p: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?period=${p}&limit=50`);
      const data = await res.json();
      if (data.success) setEntries(data.data ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(period); }, [period]);

  const PERIODS = [
    { value: "all", label: "All Time" },
    { value: "month", label: "This Month" },
    { value: "week", label: "This Week" },
  ];

  return (
    <AppShell hideNav>
      <PageHeader title="Leaderboard" back />
      <div className="px-4 py-4 space-y-4 pb-6">
        {/* Period tabs */}
        <div className="flex gap-1.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                period === p.value
                  ? "bg-[#7C3AED] text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Note */}
        <p className="text-[10px] text-[var(--text-muted)] text-center">
          Ranked by total USDT earnings
        </p>

        {loading ? (
          <SkeletonList count={10} />
        ) : entries.length === 0 ? (
          <EmptyState emoji="🏆" title="No rankings yet" description="Be the first to earn USDT!" />
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => (
              <motion.div
                key={entry.user_id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`flex items-center gap-3 p-3 rounded-xl border ${
                  i < 3
                    ? "border-[#7C3AED]/40 bg-[#7C3AED]/05"
                    : "border-[var(--border)] bg-[var(--card-bg)]"
                }`}
              >
                <div className="w-7 text-center">
                  {i < 3 ? (
                    <span className="text-xl">{MEDAL[i]}</span>
                  ) : (
                    <span className="text-sm font-bold text-[var(--text-muted)]">#{entry.rank}</span>
                  )}
                </div>
                {entry.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.photo_url} alt="avatar" className="w-9 h-9 rounded-full" />
                ) : (
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
                                   ${i < 3 ? "bg-[#7C3AED]/20 text-[#A855F7]" : "bg-[var(--border)] text-[var(--text-muted)]"}`}>
                    {entry.first_name[0]}
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">
                    {entry.first_name}
                    {entry.username && <span className="text-[var(--text-muted)] font-normal ml-1">@{entry.username}</span>}
                  </div>
                </div>
                <div className={`text-sm font-black font-numeric ${i < 3 ? "text-[#10B981]" : "text-[var(--text-secondary)]"}`}>
                  ${formatUSDT(entry.usdt_earned)}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
