"use client";

import { useEffect, useState, type ReactElement } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
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

const RANK_META: Record<number, { bar: string; text: string; height: string; label: string }> = {
  1: { bar: "linear-gradient(180deg, #FCD34D 0%, #F59E0B 100%)", text: "#F59E0B", height: "h-20", label: "1st" },
  2: { bar: "linear-gradient(180deg, #E2E8F0 0%, #94A3B8 100%)", text: "#94A3B8", height: "h-14", label: "2nd" },
  3: { bar: "linear-gradient(180deg, #D97706 0%, #B45309 100%)", text: "#D97706", height: "h-10", label: "3rd" },
};

const TROPHY_ICONS: Record<number, ReactElement> = {
  1: <svg width="20" height="20" viewBox="0 0 24 24" fill="#F59E0B" stroke="none"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/></svg>,
  2: <svg width="18" height="18" viewBox="0 0 24 24" fill="#94A3B8" stroke="none"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/></svg>,
  3: <svg width="16" height="16" viewBox="0 0 24 24" fill="#D97706" stroke="none"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/></svg>,
};

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

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const PERIODS = [{ value: "all", label: "All Time" }, { value: "month", label: "Monthly" }, { value: "week", label: "Weekly" }];

  // podium order: 2nd, 1st, 3rd
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumRanks = [2, 1, 3];

  return (
    <AppShell hideNav>
      <PageHeader title="Leaderboard" back />
      <div className="px-4 py-4 space-y-4 pb-6">
        {/* Period tabs */}
        <div className="flex gap-1 rounded-xl p-1"
          style={{ background: "var(--card-bg)", border: "1px solid rgba(255,255,255,0.05)" }}>
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-150"
              style={period === p.value
                ? { background: "linear-gradient(135deg, #7C3AED, #5B21B6)", color: "white", boxShadow: "0 2px 8px rgba(124,58,237,0.3)" }
                : { color: "#64748B" }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {loading ? (
          <SkeletonList count={10} />
        ) : entries.length === 0 ? (
          <EmptyState title="No rankings yet" description="Be the first to earn USDT!" variant="compact" />
        ) : (
          <>
            {/* Podium */}
            {top3.length === 3 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative rounded-2xl p-6 overflow-hidden"
                style={{ background: "linear-gradient(180deg, rgba(124,58,237,0.1) 0%, transparent 100%)", border: "1px solid rgba(124,58,237,0.1)" }}
              >
                <div className="flex items-end justify-center gap-4">
                  {podiumOrder.map((entry, i) => {
                    if (!entry) return null;
                    const rank = podiumRanks[i];
                    const meta = RANK_META[rank];
                    const isFirst = rank === 1;
                    return (
                      <motion.div
                        key={entry.user_id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex flex-col items-center gap-1.5"
                        style={{ width: isFirst ? 88 : 72 }}
                      >
                        <div className="flex items-center justify-center">{TROPHY_ICONS[rank]}</div>
                        <div className="relative">
                          {entry.photo_url ? (
                            <Image src={entry.photo_url} alt={entry.first_name} width={isFirst ? 52 : 42} height={isFirst ? 52 : 42}
                              className="rounded-full" style={{ border: `2.5px solid ${meta.text}`, boxShadow: `0 0 12px ${meta.text}40` }} />
                          ) : (
                            <div className={`rounded-full flex items-center justify-center font-black text-white ${isFirst ? "w-13 h-13" : "w-10 h-10"}`}
                              style={{ width: isFirst ? 52 : 42, height: isFirst ? 52 : 42, background: `linear-gradient(135deg, ${meta.text}90, ${meta.text}50)`, border: `2px solid ${meta.text}` }}>
                              {entry.first_name[0]}
                            </div>
                          )}
                        </div>
                        <div className="text-center">
                          <div className="text-xs font-bold text-white truncate" style={{ maxWidth: isFirst ? 80 : 64 }}>{entry.first_name}</div>
                          <div className="text-[10px] font-black font-numeric" style={{ color: meta.text }}>${formatUSDT(entry.usdt_earned)}</div>
                        </div>
                        <div className={`w-full ${meta.height} rounded-t-lg`} style={{ background: meta.bar }} />
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Rest of rankings */}
            {rest.length > 0 && (
              <div className="space-y-2">
                {rest.map((entry, i) => (
                  <motion.div
                    key={entry.user_id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: "var(--card-bg)", border: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <span className="w-7 text-center text-xs font-bold text-[#475569]">#{entry.rank}</span>
                    {entry.photo_url ? (
                      <Image src={entry.photo_url} alt={entry.first_name} width={36} height={36} className="rounded-full" />
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-white"
                        style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(168,85,247,0.3))" }}>
                        {entry.first_name[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                        {entry.first_name}
                        {entry.username && <span className="text-[#475569] font-normal ml-1">@{entry.username}</span>}
                      </div>
                    </div>
                    <div className="text-xs font-black font-numeric text-[#10B981]">${formatUSDT(entry.usdt_earned)}</div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
