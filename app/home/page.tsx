"use client";

import { useEffect, useState, useCallback, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRightIcon } from "@/components/ui/DuotoneIcons";
import ArenaArtwork from "@/components/layout/ArenaArtwork";
import Image from "next/image";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import WalletCards from "@/components/cards/WalletCards";
import AdSection from "@/components/cards/AdSection";
import StreakSection from "@/components/cards/StreakSection";
import AnnouncementCard from "@/components/cards/AnnouncementCard";
import LeaderboardPreview from "@/components/cards/LeaderboardPreview";
import { SkeletonList } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { useApp } from "@/hooks/useApp";
import { formatDateTime } from "@/lib/utils";
import type { HomePageData } from "@/types";
import LudzoLogo from "@/components/layout/LudzoLogo";
import LudzoCoin from "@/components/ui/LudzoCoin";

// SVG icon mapping for activity types
const ACTIVITY_SVG: Record<string, { icon: ReactElement; color: string; bg: string }> = {
  ad_reward:           { icon: <polygon points="5 3 19 12 5 21 5 3" stroke="currentColor" strokeWidth="1.5" fill="none" />, color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
  task_reward:         { icon: <><path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>, color: "#10B981", bg: "rgba(16,185,129,0.12)" },
  daily_streak:        { icon: <path d="M12 2c0 0-4 4-4 8a4 4 0 008 0c0-4-4-8-4-8z" fill="currentColor" />, color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  deposit:             { icon: <><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M2 10h20" stroke="currentColor" strokeWidth="1.5" /></>, color: "#10B981", bg: "rgba(16,185,129,0.12)" },
  withdrawal:          { icon: <><path d="M12 2v10M8 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>, color: "#63D9B4", bg: "rgba(99,217,180,0.12)" },
  referral_commission: { icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>, color: "#63D9B4", bg: "rgba(99,217,180,0.12)" },
  welcome_bonus:       { icon: <><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.5" fill="none" /></>, color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  referral_bonus:      { icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" /></>, color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
};

const DEFAULT_ICON = { icon: <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />, color: "#64748B", bg: "rgba(100,116,139,0.12)" };

function ActivityIcon({ type }: { type: string }) {
  const { icon, color, bg } = ACTIVITY_SVG[type] ?? DEFAULT_ICON;
  return (
    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
      style={{ background: bg, border: `1px solid ${color}30` }}>
      <svg width="14" height="14" viewBox="0 0 24 24" style={{ color }}>{icon}</svg>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { userId, wallet, wonCoinsBalance, refreshWallet } = useApp();
  const [data, setData] = useState<HomePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState(0);

  // Fetch API info
  const loadData = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch("/api/home", { headers: { "x-user-id": userId } });
      const json = await res.json();
      if (json.success) setData(json.data);
      else if (json.error === "maintenance") router.replace("/maintenance");
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [userId, router]);

  useEffect(() => {
    if (!userId) { router.replace("/auth"); return; }
    loadData();
    refreshWallet();          // keep Coins / Won Coins fresh after matches
  }, [userId, loadData, router, refreshWallet]);

  const refresh = () => { setKey((k) => k + 1); loadData(); };

  if (loading) {
    return (
      <AppShell>
        <PageHeader title="" showLogo transparent />
        <div className="px-4 py-3 space-y-4"><SkeletonList count={4} /></div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <EmptyState title="Failed to load" description="Could not load home data." action={{ label: "Retry", onClick: refresh }} />
      </AppShell>
    );
  }

  // ── Main app dashboard (the arena lives under /games/* now) ────────────────
  return (
    <AppShell>
      <div className="dashboard-page px-4 py-4 space-y-6 pb-6" key={key}>
        {/* Hero Header */}
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="flex items-center gap-3">
            <LudzoLogo size={34} />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] leading-tight">
                Welcome back, {data.user.first_name}
              </h1>
              <p className="text-[11px] text-[var(--text-muted)]">Here’s what’s happening in your workspace.</p>
            </div>
          </div>
          {data.user.photo_url ? (
            <Image
              src={data.user.photo_url}
              alt="avatar"
              width={40}
              height={40}
              className="rounded-full"
              style={{ border: "2px solid rgba(35,133,108,0.5)", boxShadow: "0 0 12px rgba(35,133,108,0.2)" }}
            />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, #23856C, #196A55)" }}>
              {data.user.first_name[0]}
            </div>
          )}
        </motion.div>

        <section className="dashboard-hero">
          <div className="hero-copy"><span className="eyebrow"><span /> THE LUDZO WORKSPACE</span><h2>Make your next<br />move count.</h2><p>Play a round. Build your streak. Keep all your rewards in one place.</p><Link href="/games/home" className="hero-link">Enter the arena <ArrowUpRightIcon size={17} /></Link></div>
          <ArenaArtwork />
        </section>
        <div className="section-heading"><h2>Your wallet</h2><span>Balances at a glance</span></div>
        {/* Wallet Cards — Won Coins comes from wallets.won_coins_balance (DB) */}
        <WalletCards
          coinBalance={data.wallet.coin_balance}
          usdtBalance={data.wallet.usdt_balance}
          coinRate={data.settings.coin_rate}
          wonCoins={wallet?.won_coins_balance ?? data.wallet.won_coins_balance ?? wonCoinsBalance}
        />

        <div className="dashboard-rewards">
        {/* Ad Rewards */}
        <AdSection
          adsWatchedToday={data.ads.watched_today}
          dailyLimit={data.ads.daily_limit}
          adReward={data.ads.reward_per_ad}
          onAdWatched={loadData}
        />

        {/* Daily Streak */}
        <StreakSection
          streak={data.streak}
          todayReward={data.streak?.today_reward ?? 2}
          onClaimed={loadData}
        />

        </div>
        {/* Announcements */}
        {data.announcements.length > 0 && (
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2.5 px-0.5">
              Announcements
            </h2>
            <div className="space-y-2">
              {data.announcements.map((a, i) => (
                <AnnouncementCard key={a.id} announcement={a} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-2.5 px-0.5">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              Recent Activity
            </h2>
            <button onClick={() => router.push("/history")}
              className="text-[11px] font-semibold transition-opacity hover:opacity-70"
              style={{ color: "#63D9B4" }}>
              View All
            </button>
          </div>
          {data.recent_activity.length === 0 ? (
            <EmptyState title="No activity yet" description="Start watching ads to earn Coins!" variant="compact" />
          ) : (
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}>
              {data.recent_activity.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < data.recent_activity.length - 1 ? "1px solid var(--border)" : "none" }}
                >
                  <ActivityIcon type={tx.type} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[var(--text-primary)] capitalize truncate">
                      {tx.type.replace(/_/g, " ")}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)]">{formatDateTime(tx.created_at)}</div>
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-black font-numeric ${Number(tx.amount) > 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                    {Number(tx.amount) > 0 ? "+" : ""}{tx.amount}
                    <span className="text-[10px] font-normal text-[var(--text-muted)] inline-flex items-center gap-1">
                      {tx.currency === "usdt" ? "USDT" : <><LudzoCoin size={11} /> Coins</>}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Leaderboard Preview */}
        {data.leaderboard_top3.length > 0 && (
          <LeaderboardPreview entries={data.leaderboard_top3} />
        )}
      </div>
    </AppShell>
  );
}
