"use client";

import { useEffect, useState, type ReactElement } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

interface MyRank {
  rank: number;
  usdt_earned: number;
}

// ── Visual config ──────────────────────────────────────────────────────────────

const RANK_META: Record<number, { bar: string; glow: string; text: string; height: string; label: string }> = {
  1: {
    bar:    "linear-gradient(180deg, #FCD34D 0%, #F59E0B 100%)",
    glow:   "rgba(245,158,11,0.35)",
    text:   "#F59E0B",
    height: "h-20",
    label:  "1st",
  },
  2: {
    bar:    "linear-gradient(180deg, #E2E8F0 0%, #94A3B8 100%)",
    glow:   "rgba(148,163,184,0.25)",
    text:   "#94A3B8",
    height: "h-14",
    label:  "2nd",
  },
  3: {
    bar:    "linear-gradient(180deg, #FDBA74 0%, #D97706 100%)",
    glow:   "rgba(217,119,6,0.25)",
    text:   "#D97706",
    height: "h-10",
    label:  "3rd",
  },
};

const TROPHY: Record<number, ReactElement> = {
  1: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#F59E0B" stroke="none">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />
    </svg>
  ),
  2: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="#94A3B8" stroke="none">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />
    </svg>
  ),
  3: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="#D97706" stroke="none">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />
    </svg>
  ),
};

const PERIOD_LABEL: Record<string, string> = {
  all:   "All Time",
  month: "Monthly",
  week:  "Weekly",
};

// ── Avatar ─────────────────────────────────────────────────────────────────────

function Avatar({
  entry,
  size,
  borderColor,
}: {
  entry: LeaderboardEntry;
  size: number;
  borderColor: string;
}) {
  return entry.photo_url ? (
    <Image
      src={entry.photo_url}
      alt={entry.first_name}
      width={size}
      height={size}
      className="rounded-full object-cover"
      style={{ border: `2.5px solid ${borderColor}` }}
    />
  ) : (
    <div
      className="rounded-full flex items-center justify-center font-black text-white"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${borderColor}90, ${borderColor}40)`,
        border: `2.5px solid ${borderColor}`,
        fontSize: size * 0.38,
      }}
    >
      {entry.first_name[0]?.toUpperCase()}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const [entries, setEntries]   = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank]     = useState<MyRank | null>(null);
  const [loading, setLoading]   = useState(true);
  const [period, setPeriod]     = useState("all");

  const load = async (p: string) => {
    setLoading(true);
    setEntries([]);
    setMyRank(null);
    try {
      // Read userId from localStorage — same pattern as useApp.tsx wallet fetch
      const stored = localStorage.getItem("ludzo_user");
      const userId = stored ? (JSON.parse(stored) as { id: string }).id : null;
      const headers: HeadersInit = userId ? { "x-user-id": userId } : {};

      const res  = await fetch(`/api/leaderboard?period=${p}&limit=50`, { headers });
      const json = await res.json();
      if (json.success) {
        setEntries(json.data ?? []);
        setMyRank(json.my_rank ?? null);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(period); }, [period]);

  const top3   = entries.slice(0, 3);
  const rest   = entries.slice(3);

  // Podium display order: 2nd | 1st | 3rd — only slots with real entries
  const podiumSlots: Array<{ entry: LeaderboardEntry; rank: number }> = [];
  if (top3[1]) podiumSlots.push({ entry: top3[1], rank: 2 }); // left
  if (top3[0]) podiumSlots.push({ entry: top3[0], rank: 1 }); // center
  if (top3[2]) podiumSlots.push({ entry: top3[2], rank: 3 }); // right
  // Re-sort so center (rank 1) is always in the middle visually
  const podiumOrder2 = [
    podiumSlots.find(s => s.rank === 2) ?? null,
    podiumSlots.find(s => s.rank === 1) ?? null,
    podiumSlots.find(s => s.rank === 3) ?? null,
  ].filter(Boolean) as Array<{ entry: LeaderboardEntry; rank: number }>;

  const PERIODS = [
    { value: "all",   label: "All Time" },
    { value: "month", label: "Monthly"  },
    { value: "week",  label: "Weekly"   },
  ];

  return (
    <AppShell hideNav>
      <PageHeader title="Leaderboard" back />

      <div className="px-4 py-4 space-y-4 pb-24">

        {/* ── Period tabs ── */}
        <div
          className="flex gap-1 rounded-xl p-1"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
        >
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200"
              style={
                period === p.value
                  ? {
                      background: "linear-gradient(135deg, #7C3AED, #5B21B6)",
                      color: "white",
                      boxShadow: "0 2px 10px rgba(124,58,237,0.35)",
                    }
                  : { color: "var(--text-muted)" }
              }
            >
              {p.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SkeletonList count={10} />
            </motion.div>
          ) : entries.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EmptyState
                title={`No ${PERIOD_LABEL[period]} rankings yet`}
                description={
                  period === "all"
                    ? "Users with USDT balance will appear here."
                    : "Earn USDT this period to appear on the board!"
                }
                variant="compact"
              />
            </motion.div>
          ) : (
            <motion.div
              key={period}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >

              {/* ── Podium ── */}
              {top3.length >= 1 && (
                <div
                  className="relative rounded-2xl px-4 pt-5 pb-0 overflow-hidden"
                  style={{
                    background: "linear-gradient(180deg, rgba(124,58,237,0.1) 0%, transparent 100%)",
                    border: "1px solid rgba(124,58,237,0.12)",
                  }}
                >
                  <div className="flex items-end justify-center gap-3">
                    {podiumOrder2.map(({ entry, rank }, i) => {
                      const meta = RANK_META[rank];
                      const isFirst = rank === 1;
                      const avatarSize = isFirst ? 56 : 44;

                      return (
                        <motion.div
                          key={entry.user_id}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08, type: "spring", stiffness: 200 }}
                          className="flex flex-col items-center gap-1"
                          style={{ width: isFirst ? 90 : 72 }}
                        >
                          {/* Trophy */}
                          <div className="flex items-center justify-center mb-0.5">
                            {TROPHY[rank]}
                          </div>

                          {/* Avatar with glow */}
                          <div
                            className="rounded-full"
                            style={{ boxShadow: `0 0 16px ${meta.glow}` }}
                          >
                            <Avatar entry={entry} size={avatarSize} borderColor={meta.text} />
                          </div>

                          {/* Name */}
                          <div
                            className="text-xs font-bold text-white text-center truncate mt-1"
                            style={{ maxWidth: isFirst ? 84 : 68 }}
                          >
                            {entry.first_name}
                          </div>

                          {/* Amount */}
                          <div
                            className="text-[11px] font-black font-numeric text-center"
                            style={{ color: meta.text }}
                          >
                            ${formatUSDT(entry.usdt_earned)}
                          </div>

                          {/* Podium bar */}
                          <div
                            className={`w-full ${meta.height} rounded-t-lg mt-1`}
                            style={{ background: meta.bar }}
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Ranks 4–N ── */}
              {rest.length > 0 && (
                <div className="space-y-2">
                  {rest.map((entry, i) => (
                    <motion.div
                      key={entry.user_id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.025 }}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
                    >
                      <span className="w-7 text-center text-xs font-bold text-[#475569]">
                        #{entry.rank}
                      </span>

                      <Avatar entry={entry} size={36} borderColor="var(--border)" />

                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                          {entry.first_name}
                          {entry.username && (
                            <span className="text-[var(--text-muted)] font-normal ml-1">
                              @{entry.username}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-xs font-black font-numeric text-[#10B981]">
                        ${formatUSDT(entry.usdt_earned)}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* ── My rank (if outside top list) ── */}
              {myRank && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{
                    background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(91,33,182,0.08))",
                    border: "1px solid rgba(124,58,237,0.3)",
                  }}
                >
                  <span className="w-7 text-center text-xs font-bold" style={{ color: "#A855F7" }}>
                    #{myRank.rank}
                  </span>
                  <div className="flex-1 text-xs font-semibold text-[var(--text-primary)]">
                    You
                  </div>
                  <div className="text-xs font-black font-numeric text-[#A855F7]">
                    ${formatUSDT(myRank.usdt_earned)}
                  </div>
                </motion.div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
