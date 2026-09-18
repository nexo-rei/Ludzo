"use client";

/**
 * LUDZO — Leaderboard
 * ─────────────────────────────────────────────────────────────────────────────
 * Rebuilt on the workspace design tokens (var(--card-bg) / --border / --accent /
 * --text-* …) instead of the old hard-coded gold-silver-bronze + blue-purple
 * palette, so the board finally reads as part of the same app in light AND dark
 * mode. Nothing here assumes a dark background any more (`text-white` and the
 * slate-only rank numbers were invisible on the light theme).
 *
 * Rows 4+ used to render "First name @handle". Rankings now expose a single
 * `display_name` (see lib/leaderboard.ts) — the account name, never the handle —
 * so every row, podium slot and the pinned "your rank" card use one helper.
 *
 * Motion is deliberate: a spring-driven segmented period switch, the podium
 * rising into place, rows staggering in as they enter the viewport, amounts that
 * count up once, and share bars that grow to their value — all of it collapsed by
 * MotionConfig / prefers-reduced-motion.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { RefreshIcon, TrophyDuotoneIcon } from "@/components/ui/DuotoneIcons";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn, displayName, formatUSDT, initials } from "@/lib/utils";
import { useApp } from "@/hooks/useApp";
import { useTelegram } from "@/hooks/useTelegram";
import type { LeaderboardEntry } from "@/types";

type Period = "all" | "month" | "week";

interface MyRank {
  rank: number;
  usdt_earned: number;
}

const PERIODS: Array<{ value: Period; label: string; caption: string }> = [
  { value: "all",   label: "All time", caption: "Lifetime USDT earned" },
  { value: "month", label: "Monthly",  caption: "USDT earned this calendar month" },
  { value: "week",  label: "Weekly",   caption: "USDT earned this week" },
];

/**
 * Medal tones, all pulled from the shared theme so light/dark stay consistent.
 * The champion carries the accent; 2nd and 3rd step down into neutrals, which is
 * what the rest of the workspace does instead of painting three different hues.
 */
const MEDAL_TONE: Record<number, { ring: string; bar: string; amount: string; height: number }> = {
  1: {
    ring: "var(--accent)",
    bar: "linear-gradient(180deg, var(--accent) 0%, var(--accent-soft) 100%)",
    amount: "var(--accent)",
    height: 74,
  },
  2: {
    ring: "var(--text-muted)",
    bar: "linear-gradient(180deg, var(--border) 0%, var(--bg-elevated) 100%)",
    amount: "var(--text-secondary)",
    height: 50,
  },
  3: {
    ring: "var(--border)",
    bar: "linear-gradient(180deg, var(--bg-elevated) 0%, var(--bg) 100%)",
    amount: "var(--text-secondary)",
    height: 34,
  },
};

// ── Small pieces ─────────────────────────────────────────────────────────────

/** Counts to `value` once per change; honours the OS reduced-motion setting. */
function useCountUp(value: number, duration = 650) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(reduceMotion ? value : 0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (reduceMotion || !Number.isFinite(value)) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    let frame = 0;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(from + (value - from) * eased);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frame);
      fromRef.current = value;
    };
  }, [value, duration, reduceMotion]);

  return display;
}

function Amount({ value, className }: { value: number; className?: string }) {
  const animated = useCountUp(value);
  return <span className={cn("font-numeric tabular-nums", className)}>${formatUSDT(animated)}</span>;
}

function Avatar({
  entry,
  size,
  ring,
}: {
  entry: LeaderboardEntry;
  size: number;
  ring: string;
}) {
  const name = displayName(entry);
  return (
    <span
      className="flex flex-none items-center justify-center overflow-hidden rounded-full border bg-[var(--bg-elevated)]"
      style={{ width: size, height: size, borderColor: ring, borderWidth: 2 }}
    >
      {entry.photo_url ? (
        <Image
          src={entry.photo_url}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="font-semibold text-[var(--text-secondary)]" style={{ fontSize: size * 0.36 }}>
          {initials(name)}
        </span>
      )}
    </span>
  );
}

function PodiumSlot({
  entry,
  rank,
  isLeader,
  index,
}: {
  entry: LeaderboardEntry;
  rank: number;
  isLeader: boolean;
  index: number;
}) {
  const tone = MEDAL_TONE[rank] ?? MEDAL_TONE[3];
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.06 * index, type: "spring", stiffness: 260, damping: 26 }}
      className={cn("flex min-w-0 flex-col items-center", isLeader ? "w-[36%] max-w-[132px]" : "w-[28%] max-w-[104px]")}
    >
      <span className="flex h-5 items-end justify-center">
        {isLeader && (
          <span className={cn("text-[var(--accent)]", !reduceMotion && "crown-bob")}>
            <TrophyDuotoneIcon size={18} />
          </span>
        )}
      </span>

      <span
        className="relative mt-1.5 rounded-full"
        style={{
          // Only the champion earns a glow — the workspace keeps everything else flat.
          boxShadow: isLeader ? "0 0 0 3px var(--card-bg), 0 8px 20px -10px var(--accent)" : "0 0 0 3px var(--card-bg)",
        }}
      >
        <Avatar entry={entry} size={isLeader ? 54 : 44} ring={tone.ring} />
      </span>

      <span
        className={cn(
          "mt-2 w-full truncate text-center font-semibold text-[var(--text-primary)]",
          isLeader ? "text-[13px]" : "text-xs"
        )}
      >
        {displayName(entry)}
      </span>

      <span style={{ color: tone.amount }}>
        <Amount value={entry.usdt_earned} className="mt-0.5 block text-center text-[12px] font-semibold" />
      </span>
      <span className="mt-1 block w-full text-center text-[9px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
        USDT
      </span>

      <span
        className="relative mt-2.5 flex w-full items-start justify-center overflow-hidden rounded-t-xl border-x border-t"
        style={{ height: tone.height, background: tone.bar, borderColor: "var(--border)" }}
      >
        <span
          className="mt-2 text-[11px] font-semibold font-numeric"
          style={{ color: isLeader ? "var(--accent-contrast)" : "var(--text-muted)" }}
        >
          {rank}
        </span>
        {isLeader && !reduceMotion && (
          <span className="podium-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-white/25 blur-[2px]" />
        )}
      </span>
    </motion.div>
  );
}

function StandingRow({
  entry,
  share,
  index,
  isMe,
}: {
  entry: LeaderboardEntry;
  share: number;
  index: number;
  isMe: boolean;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ delay: Math.min(index * 0.03, 0.2), duration: 0.26, ease: "easeOut" }}
      className={cn(
        "flex items-center gap-3 px-3.5 py-3 transition-colors",
        isMe ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--bg-elevated)]"
      )}
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <span className="w-6 flex-none text-center text-xs font-semibold font-numeric text-[var(--text-muted)] tabular-nums">
        {entry.rank}
      </span>

      <Avatar entry={entry} size={34} ring={isMe ? "var(--accent)" : "var(--border)"} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">{displayName(entry)}</p>
          {isMe && (
            <span className="flex-none rounded-full px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-[var(--accent-contrast)]" style={{ background: "var(--accent)" }}>
              You
            </span>
          )}
        </div>
        <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full" style={{ background: "var(--bg-elevated)" }}>
          <motion.span
            className="block h-full rounded-full"
            style={{ background: isMe ? "var(--accent)" : "var(--text-muted)", opacity: isMe ? 1 : 0.55 }}
            initial={{ width: 0 }}
            whileInView={{ width: `${Math.max(share, 2)}%` }}
            viewport={{ once: true }}
            transition={{ delay: 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      <Amount value={entry.usdt_earned} className="flex-none text-[13px] font-semibold text-[var(--text-primary)]" />
    </motion.li>
  );
}

function BoardSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--card-bg)" }}>
        <div className="flex items-end justify-center gap-3">
          {[58, 46, 38].map((height, i) => (
            <div key={i} className="flex w-1/3 flex-col items-center gap-2">
              <Skeleton className="h-11 w-11 rounded-full" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-2.5 w-10" />
              <Skeleton className="w-full rounded-t-xl" style={{ height }} />
            </div>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--border)", background: "var(--card-bg)" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b px-3.5 py-3 last:border-0" style={{ borderColor: "var(--border)" }}>
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const router = useRouter();
  const { user, userId } = useApp();
  const { haptic } = useTelegram();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<MyRank | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [period, setPeriod] = useState<Period>("all");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = useCallback(
    async (p: Period) => {
      setLoading(true);
      setFailed(false);
      try {
        const headers: HeadersInit = userId ? { "x-user-id": userId } : {};
        const res = await fetch(`/api/leaderboard?period=${p}&limit=50`, { headers, cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error("leaderboard");
        setEntries(Array.isArray(json.data) ? (json.data as LeaderboardEntry[]) : []);
        setMyRank(json.my_rank ?? null);
        setUpdatedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      } catch {
        setFailed(true);
        setEntries([]);
        setMyRank(null);
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    load(period);
  }, [period, load]);

  const myId = user?.id ?? userId ?? "";
  const iAmInList = useMemo(() => entries.some((e) => e.user_id === myId), [entries, myId]);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const leaderAmount = top3[0]?.usdt_earned ?? 0;

  /* Podium order is the classic 2 · 1 · 3, and missing places simply drop out. */
  const podium = [top3[1], top3[0], top3[2]]
    .map((entry, i) => ({ entry, rank: [2, 1, 3][i] }))
    .filter((slot) => Boolean(slot.entry));

  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? "All time";

  const changePeriod = (next: Period) => {
    if (next === period) return;
    haptic("impact");
    setPeriod(next);
  };

  return (
    <AppShell hideNav>
      <PageHeader
        title="Leaderboard"
        back
        backHref="/home"
        right={
          <button
            type="button"
            onClick={() => { haptic("impact"); load(period); }}
            aria-label="Refresh leaderboard"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)] active:scale-95"
          >
            <motion.span animate={loading ? { rotate: 360 } : { rotate: 0 }} transition={loading ? { duration: 1, repeat: Infinity, ease: "linear" } : { duration: 0.2 }}>
              <RefreshIcon size={18} />
            </motion.span>
          </button>
        }
      />

      <div className="mx-auto w-full max-w-[560px] px-4 pb-6 pt-4">
        {/* Period switch — the sliding pill is the only motion in the header. */}
        <div
          className="relative flex gap-1 rounded-xl border p-1"
          role="group"
          aria-label="Leaderboard period"
          style={{ borderColor: "var(--border)", background: "var(--card-bg)" }}
        >
          {PERIODS.map((option) => {
            const active = option.value === period;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => changePeriod(option.value)}
                className="relative flex-1 rounded-lg py-2 text-xs font-semibold transition-colors"
                style={{ color: active ? "var(--accent-contrast)" : "var(--text-muted)" }}
              >
                {active && (
                  <motion.span
                    layoutId="leaderboard-period-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="absolute inset-0 rounded-lg"
                    style={{ background: "var(--accent)" }}
                  />
                )}
                <span className="relative z-10">{option.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex items-center justify-between px-0.5">
          <p className="text-[11px] text-[var(--text-muted)]">
            {loading ? "Loading rankings…" : PERIODS.find((p) => p.value === period)?.caption}
          </p>
          {!loading && updatedAt && (
            <p className="text-[11px] font-numeric text-[var(--text-muted)]">Updated {updatedAt}</p>
          )}
        </div>

        <div className="mt-3 space-y-3">
          <AnimatePresence mode="wait" initial={false}>
            {loading ? (
              <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <BoardSkeleton />
              </motion.div>
            ) : failed ? (
              <motion.div key="error" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <EmptyState
                  variant="compact"
                  title="Leaderboard unavailable"
                  description="We could not reach the rankings. Check your connection and try again."
                  action={{ label: "Retry", onClick: () => load(period) }}
                />
              </motion.div>
            ) : entries.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <EmptyState
                  emoji="🏆"
                  variant="compact"
                  title={`No ${periodLabel.toLowerCase()} rankings yet`}
                  description="Earn USDT from matches and streaks and you will appear on this board."
                  action={{ label: "Back to home", onClick: () => router.push("/home") }}
                />
              </motion.div>
            ) : (
              <motion.div key={period} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {/* ── Podium ── */}
                {podium.length > 0 && (
                  <section
                    className="overflow-hidden rounded-2xl border"
                    style={{ borderColor: "var(--border)", background: "var(--card-bg)" }}
                    aria-label={`Top ${podium.length} for ${periodLabel.toLowerCase()}`}
                  >
                    <div className="flex items-center justify-between px-4 pt-3.5">
                      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Podium
                      </h2>
                      <span className="text-[11px] font-numeric text-[var(--text-muted)]">{periodLabel}</span>
                    </div>

                    <div className="flex items-end justify-center gap-2 px-3 pt-2">
                      {podium.map((slot, i) => (
                        <PodiumSlot key={slot.entry.user_id} entry={slot.entry} rank={slot.rank} isLeader={slot.rank === 1} index={i} />
                      ))}
                    </div>
                  </section>
                )}

                {/* ── Ranks 4 … n ── */}
                {rest.length > 0 && (
                  <section
                    className="overflow-hidden rounded-2xl border"
                    style={{ borderColor: "var(--border)", background: "var(--card-bg)" }}
                  >
                    <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: "var(--border)" }}>
                      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Standings
                      </h2>
                      <span className="text-[11px] font-numeric text-[var(--text-muted)] tabular-nums">
                        {rest.length} ranked
                      </span>
                    </div>
                    <ul>
                      {rest.map((entry, i) => (
                        <StandingRow
                          key={entry.user_id}
                          entry={entry}
                          index={i}
                          isMe={entry.user_id === myId}
                          share={leaderAmount > 0 ? (entry.usdt_earned / leaderAmount) * 100 : 0}
                        />
                      ))}
                    </ul>
                  </section>
                )}

                {/* ── Your rank, pinned while the list scrolls ── */}
                {myRank && !iAmInList && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 28 }}
                    className="sticky bottom-3 z-30"
                  >
                    <div
                      className="flex items-center gap-3 rounded-2xl border px-3.5 py-3"
                      style={{
                        borderColor: "var(--accent)",
                        background: "var(--card-bg)",
                        boxShadow: "0 14px 34px -18px rgba(0,0,0,0.45)",
                      }}
                    >
                      <span
                        className="flex h-8 w-8 flex-none items-center justify-center rounded-xl text-xs font-semibold font-numeric"
                        style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
                      >
                        {myRank.rank}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">
                          {displayName(user, "Your rank")}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {myRank.rank > entries.length && entries.length > 0
                            ? `Outside this ${periodLabel.toLowerCase()} top ${entries.length}`
                            : `Rank #${myRank.rank} · ${periodLabel.toLowerCase()}`}
                        </p>
                      </div>
                      <Amount value={myRank.usdt_earned} className="flex-none text-[13px] font-semibold" />
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppShell>
  );
}
