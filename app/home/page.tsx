"use client";

import { useEffect, useState, useCallback, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
import { 
  CoinIcon, 
  USDTIcon, 
  TrophyIcon, 
  RewardIcon, 
  GamesIcon,
  HomeIcon,
  TaskIcon,
  ReferralIcon,
  ProfileIcon
} from "@/components/ui/Icons";

// SVG icon mapping for activity types
const ACTIVITY_SVG: Record<string, { icon: ReactElement; color: string; bg: string }> = {
  ad_reward:           { icon: <polygon points="5 3 19 12 5 21 5 3" stroke="currentColor" strokeWidth="1.5" fill="none" />, color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
  task_reward:         { icon: <><path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>, color: "#10B981", bg: "rgba(16,185,129,0.12)" },
  daily_streak:        { icon: <path d="M12 2c0 0-4 4-4 8a4 4 0 008 0c0-4-4-8-4-8z" fill="currentColor" />, color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  deposit:             { icon: <><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M2 10h20" stroke="currentColor" strokeWidth="1.5" /></>, color: "#10B981", bg: "rgba(16,185,129,0.12)" },
  withdrawal:          { icon: <><path d="M12 2v10M8 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>, color: "#A855F7", bg: "rgba(168,85,247,0.12)" },
  referral_commission: { icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>, color: "#A855F7", bg: "rgba(168,85,247,0.12)" },
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
  const { userId, isInGamingHub, setIsInGamingHub, wonCoinsBalance } = useApp();
  const [data, setData] = useState<HomePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState(0);

  // Dynamic Online Players state (beside exit hub button)
  const [onlineCount, setOnlineCount] = useState<number>(7531);

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
  }, [userId, loadData, router]);

  // Online Players counter setup: range 5000-10000, updates every 10s with ±10, ±50, or ±100
  useEffect(() => {
    const initial = Math.floor(Math.random() * (10000 - 5000 + 1)) + 5000;
    setOnlineCount(initial);

    const interval = setInterval(() => {
      const choices = [-100, -50, -10, 10, 50, 100];
      const fluctuation = choices[Math.floor(Math.random() * choices.length)];
      setOnlineCount((prev) => {
        const next = prev + fluctuation;
        return Math.min(10000, Math.max(5000, next));
      });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

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

  // --- RENDER PREMIUM GAMING HUB DASHBOARD ---
  if (isInGamingHub) {
    const mockAnnouncements = [
      { id: "a1", title: "🏆 Ludo Sunday Mega Cup", desc: "Join Ludo Clash this Sunday for a massive 20,000 Coin reward pool!" },
      { id: "a2", title: "🔥 Double Wins Weekend", desc: "For the next 48 hours, all completed Ludo matches yield double Coin rewards!" },
    ];

    return (
      <AppShell>
        <div className="relative min-h-screen pb-24 gaming-gradient-bg px-4 py-4 space-y-5 select-none text-white">

          {/* Animated glow backgrounds */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <div className="absolute top-1/4 left-10 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl" />
            <div className="absolute top-2/3 right-10 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />
          </div>

          <div className="relative z-10 space-y-5">
            {/* Top Navigation Row (Gamer Header with Online Player counter beside exit button) */}
            <motion.div 
              className="flex items-center justify-between"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-3">
                {data.user.photo_url ? (
                  <Image
                    src={data.user.photo_url}
                    alt="avatar"
                    width={44}
                    height={44}
                    className="rounded-full ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-950"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-black text-white bg-gradient-to-tr from-purple-600 to-indigo-600 ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-950">
                    {data.user.first_name[0]}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-extrabold text-slate-100 tracking-tight leading-none">
                      @{data.user.first_name.toLowerCase()}
                    </span>
                    <span className="bg-purple-600/30 text-purple-400 border border-purple-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                      PRO
                    </span>
                  </div>
                  <span className="text-[10px] text-purple-400 font-medium uppercase tracking-widest mt-0.5 block">
                    Gamer Lobby
                  </span>
                </div>
              </div>

              {/* Online players beside Exit Button */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-1 rounded-xl shadow-lg">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[9px] font-black text-emerald-400 font-numeric leading-none">{onlineCount.toLocaleString()}</span>
                  <span className="text-[8px] text-slate-400 uppercase font-bold tracking-wider leading-none">on</span>
                </div>

                <motion.button
                  onClick={() => setIsInGamingHub(false)}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[9px] font-bold uppercase tracking-wider bg-slate-900 border border-purple-500/40 text-purple-300 hover:text-white transition-all shadow-[0_0_12px_rgba(168,85,247,0.15)]"
                >
                  Exit Hub
                </motion.button>
              </div>
            </motion.div>

            {/* Economy Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 }}
              className="relative rounded-2xl overflow-hidden p-5 border border-purple-500/30 bg-slate-950/70 backdrop-blur-xl shadow-[0_12px_40px_rgba(168,85,247,0.15)]"
            >
              <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none opacity-20 bg-radial-gradient from-purple-500 to-transparent" />
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Balance (Dashboard)</span>
                  <div className="flex items-center gap-2 mt-1">
                    <CoinIcon size={24} className="text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                    <span className="text-2xl font-black font-numeric tracking-tight text-white">
                      {data.wallet.coin_balance.toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 mt-1">Coins</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Won Coins (Convertible)</span>
                  <div className="flex items-center gap-1.5 mt-1 justify-end">
                    <TrophyIcon size={18} className="text-purple-400 drop-shadow-[0_0_6px_rgba(168,85,247,0.5)]" />
                    <span className="text-lg font-black font-numeric tracking-tight text-purple-300">
                      {wonCoinsBalance.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-purple-500/10 flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-400/90 tracking-wide">
                  ⚡ conversion: 100 Won Coins = $1.00 USDT
                </span>
                <span className="text-[9px] bg-slate-900 border border-slate-800 text-emerald-400 font-mono font-bold">
                  Cash Wallet: ${data.wallet.usdt_balance.toFixed(2)}
                </span>
              </div>
            </motion.div>

            {/* Play Ludo CTA (Featured Game) */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="relative rounded-2xl overflow-hidden border border-purple-500/40 bg-gradient-to-b from-purple-950 to-slate-950 shadow-[0_16px_48px_rgba(124,58,237,0.2)] group"
            >
              {/* Ludo Board background grid */}
              <div className="absolute inset-0 opacity-10 pointer-events-none z-0">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" fill="none">
                  <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>

              {/* Realistic Ludo Board SVG Artwork */}
              <div className="absolute top-4 right-4 opacity-30 z-0 pointer-events-none group-hover:scale-110 transition-transform duration-300">
                <svg width="125" height="125" viewBox="0 0 100 100" fill="none">
                  <rect width="100" height="100" rx="10" fill="#1E293B" stroke="#475569" strokeWidth="2"/>
                  {/* Top-Left Red quadrant */}
                  <rect x="5" y="5" width="36" height="36" rx="4" fill="#EF4444" stroke="#fff" strokeWidth="1.5"/>
                  <rect x="14" y="14" width="18" height="14" rx="2" fill="#fff"/>
                  {/* Top-Right Green quadrant */}
                  <rect x="59" y="5" width="36" height="36" rx="4" fill="#22C55E" stroke="#fff" strokeWidth="1.5"/>
                  <rect x="68" y="14" width="18" height="14" rx="2" fill="#fff"/>
                  {/* Bottom-Left Yellow quadrant */}
                  <rect x="5" y="59" width="36" height="36" rx="4" fill="#EAB308" stroke="#fff" strokeWidth="1.5"/>
                  <rect x="14" y="68" width="18" height="14" rx="2" fill="#fff"/>
                  {/* Bottom-Right Blue quadrant */}
                  <rect x="59" y="59" width="36" height="36" rx="4" fill="#3B82F6" stroke="#fff" strokeWidth="1.5"/>
                  <rect x="68" y="68" width="18" height="14" rx="2" fill="#fff"/>
                  {/* Paths & Center triangles */}
                  <polygon points="50,50 41,41 59,41" fill="#22C55E"/>
                  <polygon points="50,50 41,59 59,59" fill="#EAB308"/>
                  <polygon points="50,50 41,41 41,59" fill="#EF4444"/>
                  <polygon points="50,50 59,41 59,59" fill="#3B82F6"/>
                  <rect x="41" y="41" width="18" height="18" stroke="#fff" strokeWidth="1.5"/>
                </svg>
              </div>

              <div className="relative z-10 p-6 flex flex-col justify-between h-48">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="bg-purple-600 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest animate-pulse">
                      FEATURED STAKE
                    </span>
                    <span className="text-[10px] text-purple-400 font-extrabold tracking-widest uppercase">
                      MULTIPLAYER PvP
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white mt-1.5 tracking-tight">
                    LUDO CLASH
                  </h3>
                  <p className="text-xs text-slate-300 max-w-[220px] mt-1 font-medium leading-relaxed">
                    Battle against live players, roll the dice, and claim Coin stakes instantly!
                  </p>
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push("/games")}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-widest shadow-[0_0_24px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2 border border-purple-400/40"
                >
                  <GamesIcon size={16} />
                  PLAY LUDO NOW
                </motion.button>
              </div>
            </motion.div>

            {/* Gaming Announcements */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="space-y-3"
            >
              <h3 className="text-[10px] font-black uppercase tracking-widest text-purple-400 px-0.5">
                Gaming Announcements
              </h3>
              <div className="space-y-2.5">
                {mockAnnouncements.map((ann) => (
                  <div 
                    key={ann.id}
                    className="p-4 rounded-xl border border-purple-500/20 bg-slate-950/60 flex items-start gap-3"
                  >
                    <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 shrink-0 text-purple-400 mt-0.5">
                      <TrophyIcon size={14} />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-100 tracking-tight leading-none">
                        {ann.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium leading-normal">
                        {ann.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

          </div>
        </div>
      </AppShell>
    );
  }

  // Render Original Dashboard when NOT in Gaming Hub
  return (
    <AppShell>
      <div className="px-4 py-4 space-y-4 pb-6" key={key}>
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
              <h1 className="text-lg font-black tracking-tight text-[var(--text-primary)] leading-tight">
                Hey, {data.user.first_name}
              </h1>
              <p className="text-[11px] text-[var(--text-muted)]">Welcome back to LUDZO</p>
            </div>
          </div>
          {data.user.photo_url ? (
            <Image
              src={data.user.photo_url}
              alt="avatar"
              width={40}
              height={40}
              className="rounded-full"
              style={{ border: "2px solid rgba(124,58,237,0.5)", boxShadow: "0 0 12px rgba(124,58,237,0.2)" }}
            />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, #7C3AED, #5B21B6)" }}>
              {data.user.first_name[0]}
            </div>
          )}
        </motion.div>

        {/* Wallet Cards */}
        <WalletCards
          coinBalance={data.wallet.coin_balance}
          usdtBalance={data.wallet.usdt_balance}
          coinRate={data.settings.coin_rate}
        />

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
              style={{ color: "#A855F7" }}>
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
                  <div className={`text-sm font-black font-numeric ${Number(tx.amount) > 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                    {Number(tx.amount) > 0 ? "+" : ""}{tx.amount}
                    <span className="text-[10px] font-normal ml-0.5 text-[var(--text-muted)]">
                      {tx.currency === "usdt" ? "USDT" : "Coins"}
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
