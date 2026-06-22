"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import AppShell from "@/components/layout/AppShell";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useApp } from "@/hooks/useApp";
import { formatUSDT, formatCoins } from "@/lib/utils";
import { 
  CoinIcon, 
  USDTIcon, 
  SettingsIcon, 
  TrophyIcon, 
  ClockIcon, 
  RewardIcon,
  HomeIcon,
  ProfileIcon,
  GamesIcon
} from "@/components/ui/Icons";
import { showToast } from "@/components/ui/Toast";

interface ProfileData {
  user: { first_name: string; last_name?: string; username?: string; telegram_id: string; photo_url?: string };
  wallet: { coin_balance: number; usdt_balance: number };
  stats: { total_tasks_completed: number; total_referrals: number; current_streak_day: number; total_streaks_claimed: number };
}

const MENU_ITEMS = [
  { label: "Transaction History", href: "/history",     color: "#7C3AED", bg: "rgba(124,58,237,0.12)", icon: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></> },
  { label: "Leaderboard",         href: "/leaderboard", color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  icon: <><rect x="18" y="3" width="4" height="18" rx="1" /><rect x="10" y="8" width="4" height="13" rx="1" /><rect x="2" y="13" width="4" height="8" rx="1" /></> },
  { label: "Refer & Earn",        href: "/refer",       color: "#3B82F6", bg: "rgba(59,130,246,0.12)",  icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></> },
  { label: "FAQ",                 href: "/faq",         color: "#A855F7", bg: "rgba(168,85,247,0.12)",  icon: <><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" /></> },
  { label: "Settings",            href: "/settings",    color: "#64748B", bg: "rgba(100,116,139,0.12)", icon: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></> },
  { label: "Legal Center",        href: "/legal",       color: "#7C3AED", bg: "rgba(124,58,237,0.12)", icon: <><path d="M12 2v20" /><path d="M5 22h14" /><path d="M5 6h14" /><path d="M5 6L2 12a3 3 0 006 0L5 6z" /><path d="M19 6l-3 6a3 3 0 006 0l-3-6z" /></> },
];

export default function ProfilePage() {
  const router = useRouter();
  const { userId, setUser, isInGamingHub, setIsInGamingHub, prefs, setPrefs } = useApp();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Initialize sound from localStorage
  useEffect(() => {
    const sound = localStorage.getItem("ludzo_sound_enabled");
    if (sound === "false") {
      setSoundEnabled(false);
    }
  }, []);

  const toggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem("ludzo_sound_enabled", nextVal ? "true" : "false");
    showToast(nextVal ? "Sound effects enabled" : "Sound effects muted", "info");
  };

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/profile", { headers: { "x-user-id": userId } });
      const data = await res.json();
      if (data.success) setProfile(data.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("ludzo_user");
    router.replace("/auth");
  };

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setPrefs({
      id: prefs?.id ?? "1",
      user_id: userId ?? "1",
      theme: newTheme,
      language: prefs?.language ?? "en",
      notifications_enabled: prefs?.notifications_enabled ?? true,
      updated_at: new Date().toISOString()
    });
    showToast(`Theme updated to ${newTheme}`, "success");
  };

  if (loading) {
    return (
      <AppShell>
        <div className="px-4 py-4 space-y-4 pb-6">
          <SkeletonCard lines={3} />
          <SkeletonCard />
        </div>
      </AppShell>
    );
  }

  // --- RENDER PREMIUM GAMING HUB PROFILE ---
  if (isInGamingHub) {
    const mockGamingStats = {
      totalMatches: 36,
      wins: 24,
      losses: 12,
      winRate: "66.7%",
      currentStreak: "3 Wins",
      bestStreak: "7 Wins",
    };

    const mockEconomyStats = {
      totalWon: 14500,
      totalLost: 6200,
      netProfit: "+8300 Coins",
      lifetimeEarnings: "$145.00",
    };

    return (
      <AppShell>
        <div className="relative min-h-screen pb-24 gaming-gradient-bg px-4 py-4 space-y-6 select-none text-white">
          {/* Ambient light glow */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <div className="absolute top-1/4 right-10 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl" />
            <div className="absolute bottom-1/4 left-10 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />
          </div>

          <div className="relative z-10 space-y-5">
            {/* Header */}
            <motion.div 
              className="flex items-center justify-between"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div>
                <h1 className="text-xl font-black text-slate-100 tracking-tight">
                  Gamer Profile
                </h1>
                <p className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest mt-0.5">
                  Pro Identity
                </p>
              </div>

              {/* Exit Button */}
              <motion.button
                onClick={() => {
                  setIsInGamingHub(false);
                  router.push("/home");
                }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-slate-900 border border-purple-500/40 text-purple-300 hover:text-white transition-colors"
              >
                Exit Hub
              </motion.button>
            </motion.div>

            {/* Profile Avatar Card */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-2xl p-5 border border-purple-500/30 bg-slate-950/70 backdrop-blur-xl flex items-center gap-4 shadow-[0_12px_40px_rgba(168,85,247,0.15)]"
            >
              {profile?.user.photo_url ? (
                <Image
                  src={profile.user.photo_url}
                  alt="avatar"
                  width={64}
                  height={64}
                  className="rounded-full ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-950"
                />
              ) : (
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black text-white bg-gradient-to-tr from-purple-600 to-indigo-600 ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-950">
                  {profile?.user.first_name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                  {profile?.user.first_name}{profile?.user.last_name ? ` ${profile.user.last_name}` : ""}
                  <span className="bg-purple-600/30 text-purple-400 border border-purple-500/30 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                    PRO
                  </span>
                </h2>
                {profile?.user.username && (
                  <p className="text-xs text-purple-400 mt-0.5">@{profile.user.username}</p>
                )}
                <p className="text-[10px] text-slate-500 mt-1 font-mono">TG-ID: {profile?.user.telegram_id}</p>
              </div>
            </motion.div>

            {/* Gaming Statistics Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="space-y-2.5"
            >
              <h3 className="text-[10px] font-black uppercase tracking-widest text-purple-400 px-0.5">
                Gaming Statistics
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 text-center space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Matches</span>
                  <span className="text-base font-black font-numeric text-slate-100">{mockGamingStats.totalMatches}</span>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 text-center space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Wins</span>
                  <span className="text-base font-black font-numeric text-emerald-400">{mockGamingStats.wins}</span>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 text-center space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Losses</span>
                  <span className="text-base font-black font-numeric text-red-400">{mockGamingStats.losses}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 text-center space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Win Rate</span>
                  <span className="text-sm font-black font-numeric text-purple-300">{mockGamingStats.winRate}</span>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 text-center space-y-1 flex flex-col justify-center items-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Streak</span>
                  <span className="text-sm font-black text-amber-400 flex items-center gap-1 justify-center mt-1 leading-none font-numeric">
                    🔥 {mockGamingStats.currentStreak.split(" ")[0]}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 text-center space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Best Streak</span>
                  <span className="text-sm font-black font-numeric text-purple-300">{mockGamingStats.bestStreak}</span>
                </div>
              </div>
            </motion.div>

            {/* Economy Section */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-2.5"
            >
              <h3 className="text-[10px] font-black uppercase tracking-widest text-purple-400 px-0.5">
                Economy Statistics
              </h3>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 divide-y divide-slate-900 overflow-hidden text-xs">

                {/* Total Balance info */}
                <div className="flex items-center justify-between p-4 bg-slate-950/60">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <CoinIcon size={14} className="text-amber-400" />
                    Coin Balance
                  </span>
                  <span className="font-black font-numeric text-white text-sm">
                    {profile?.wallet.coin_balance.toLocaleString()} Coins
                  </span>
                </div>

                <div className="flex items-center justify-between p-4">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <USDTIcon size={14} className="text-emerald-400" />
                    Cash Balance
                  </span>
                  <span className="font-black font-numeric text-emerald-400 text-sm">
                    ${profile?.wallet.usdt_balance.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    Total Coins Won
                  </span>
                  <span className="font-bold font-numeric text-slate-200">
                    {mockEconomyStats.totalWon.toLocaleString()} Coins
                  </span>
                </div>

                <div className="flex items-center justify-between p-4">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    Total Coins Lost
                  </span>
                  <span className="font-bold font-numeric text-slate-400">
                    {mockEconomyStats.totalLost.toLocaleString()} Coins
                  </span>
                </div>

                <div className="flex items-center justify-between p-4">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    Lifetime Earnings
                  </span>
                  <span className="font-bold font-numeric text-emerald-400">
                    {mockEconomyStats.lifetimeEarnings}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-purple-950/10">
                  <span className="text-purple-300 font-bold flex items-center gap-1.5">
                    Net Profit
                  </span>
                  <span className="font-black font-numeric text-purple-300">
                    {mockEconomyStats.netProfit}
                  </span>
                </div>

              </div>
            </motion.div>

            {/* Gaming Settings */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-2.5"
            >
              <h3 className="text-[10px] font-black uppercase tracking-widest text-purple-400 px-0.5">
                Gaming Settings
              </h3>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 space-y-4 text-xs">

                {/* Theme Selector */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Interface Theme
                  </div>
                  <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950/80 rounded-xl border border-slate-900">
                    {(["light", "dark", "system"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => handleThemeChange(t)}
                        className={`py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                          prefs?.theme === t
                            ? "bg-purple-600 text-white shadow-[0_2px_8px_rgba(168,85,247,0.3)]"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sound Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                  <span className="text-slate-300 font-bold">Sound Effects</span>
                  <button
                    onClick={toggleSound}
                    className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                      soundEnabled
                        ? "bg-purple-600/20 border border-purple-500/40 text-purple-300"
                        : "bg-slate-900 border border-slate-800 text-slate-500"
                    }`}
                  >
                    {soundEnabled ? "On" : "Off"}
                  </button>
                </div>

              </div>
            </motion.div>

            {/* Support and Signout */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-2.5"
            >
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  showToast("Redirecting to Ludzo Support...", "info");
                  window.open("https://t.me/ludzo_support", "_blank");
                }}
                className="w-full h-11 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/30 text-purple-400 font-bold uppercase tracking-wider text-[11px] flex items-center justify-center gap-2 transition-all shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
              >
                🎮 CONTACT GAMING SUPPORT
              </motion.button>
            </motion.div>

          </div>
        </div>
      </AppShell>
    );
  }

  // --- RENDER ORIGINAL PROFILE PAGE ---
  return (
    <AppShell>
      <div className="px-4 py-4 space-y-4 pb-6">
        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl p-5 overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(59,130,246,0.1) 100%)",
            border: "1px solid rgba(124,58,237,0.2)",
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none opacity-20"
            style={{ background: "radial-gradient(circle, #7C3AED 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
          <div className="flex items-center gap-4">
            {profile?.user.photo_url ? (
              <Image
                src={profile.user.photo_url} alt="avatar" width={64} height={64}
                className="rounded-full"
                style={{ border: "2px solid rgba(168,85,247,0.6)", boxShadow: "0 0 16px rgba(124,58,237,0.3)" }}
              />
            ) : (
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white"
                style={{ background: "linear-gradient(135deg, #7C3AED, #A855F7)", boxShadow: "0 0 16px rgba(124,58,237,0.3)", border: "2px solid rgba(168,85,247,0.4)" }}>
                {profile?.user.first_name[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black text-white leading-tight">
                {profile?.user.first_name}{profile?.user.last_name ? ` ${profile.user.last_name}` : ""}
              </h2>
              {profile?.user.username && (
                <p className="text-xs text-[#94A3B8] mt-0.5">@{profile.user.username}</p>
              )}
              <p className="text-[10px] text-[#64748B] mt-0.5 font-mono">ID: {profile?.user.telegram_id}</p>
            </div>
          </div>
        </motion.div>

        {/* Balance grid */}
        <div className="grid grid-cols-2 gap-3.5">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] space-y-1"
          >
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Coins Wallet</span>
            <span className="text-xl font-black font-numeric text-[var(--text-primary)] block">
              {profile?.wallet.coin_balance.toLocaleString()}
            </span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] space-y-1"
          >
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Cash Wallet</span>
            <span className="text-xl font-black font-numeric text-emerald-500 block">
              ${profile?.wallet.usdt_balance.toFixed(2)}
            </span>
          </motion.div>
        </div>

        {/* Menu Items */}
        <div className="rounded-2xl border border-[var(--border)] overflow-hidden bg-[var(--card-bg)]">
          {MENU_ITEMS.map((item, i) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center justify-between p-4 transition-colors hover:bg-slate-900/10 dark:hover:bg-white/5"
              style={{ borderBottom: i < MENU_ITEMS.length - 1 ? "1px solid var(--border)" : "none" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: item.bg, border: `1px solid ${item.color}30` }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" style={{ color: item.color }} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    {item.icon}
                  </svg>
                </div>
                <span className="text-xs font-bold text-[var(--text-primary)]">{item.label}</span>
              </div>
              <ChevronRight size={16} className="text-[var(--text-muted)]" />
            </Link>
          ))}
        </div>

        {/* Signout button */}
        <motion.button
          onClick={handleLogout}
          whileTap={{ scale: 0.98 }}
          className="w-full h-11 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-black uppercase tracking-wider hover:bg-red-500/20 transition-all"
        >
          Sign Out
        </motion.button>
      </div>
    </AppShell>
  );
}
