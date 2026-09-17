"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronRightIcon } from "@/components/ui/DuotoneIcons";
import Image from "next/image";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import LudzoCoin from "@/components/ui/LudzoCoin";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useApp } from "@/hooks/useApp";

interface ProfileData {
  user: { first_name: string; last_name?: string; username?: string; telegram_id: string; photo_url?: string };
  wallet: { coin_balance: number; usdt_balance: number };
  stats: { total_tasks_completed: number; total_referrals: number; current_streak_day: number; total_streaks_claimed: number };
}

const MENU_ITEMS = [
  { label: "Ludo Arena",           href: "/games/home",  color: "#63D9B4", bg: "rgba(99,217,180,0.12)", icon: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="8.6" cy="8.6" r="1.3" fill="currentColor" stroke="none" /><circle cx="15.4" cy="15.4" r="1.3" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /></> },
  { label: "Transaction History", href: "/history",     color: "#23856C", bg: "rgba(35,133,108,0.12)", icon: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></> },
  { label: "Leaderboard",         href: "/leaderboard", color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  icon: <><rect x="18" y="3" width="4" height="18" rx="1" /><rect x="10" y="8" width="4" height="13" rx="1" /><rect x="2" y="13" width="4" height="8" rx="1" /></> },
  { label: "Refer & Earn",        href: "/refer",       color: "#3B82F6", bg: "rgba(59,130,246,0.12)",  icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></> },
  { label: "FAQ",                 href: "/faq",         color: "#63D9B4", bg: "rgba(99,217,180,0.12)",  icon: <><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" /></> },
  { label: "Support",             href: "/support",     color: "#06B6D4", bg: "rgba(6,182,212,0.12)",   icon: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><path d="M4.9 4.9l4.3 4.3M14.8 14.8l4.3 4.3M19.1 4.9l-4.3 4.3M9.2 14.8l-4.3 4.3" /></> },
  { label: "Support & Disputes",  href: "/support-disputes", color: "#EF4444", bg: "rgba(239,68,68,0.12)", icon: <><path d="M12 22s8-3.4 8-10V5.6L12 3 4 5.6V12c0 6.6 8 10 8 10z" /><path d="M9.5 12h5M12 9.5v5" /></> },
  { label: "Settings",            href: "/settings",    color: "#64748B", bg: "rgba(100,116,139,0.12)", icon: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></> },
  { label: "Legal Center",        href: "/legal",       color: "#23856C", bg: "rgba(35,133,108,0.12)", icon: <><path d="M12 2v20" /><path d="M5 22h14" /><path d="M5 6h14" /><path d="M5 6L2 12a3 3 0 006 0L5 6z" /><path d="M19 6l-3 6a3 3 0 006 0l-3-6z" /></> },
];

export default function ProfilePage() {
  const router = useRouter();
  const { userId, setUser, wallet, wonCoinsBalance } = useApp();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
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
            background: "linear-gradient(135deg, rgba(35,133,108,0.18) 0%, rgba(59,130,246,0.1) 100%)",
            border: "1px solid rgba(35,133,108,0.2)",
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none opacity-20"
            style={{ background: "radial-gradient(circle, #23856C 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
          <div className="flex items-center gap-4">
            {profile?.user.photo_url ? (
              <Image
                src={profile.user.photo_url} alt="avatar" width={64} height={64}
                className="rounded-full"
                style={{ border: "2px solid rgba(99,217,180,0.6)", boxShadow: "0 0 16px rgba(35,133,108,0.3)" }}
              />
            ) : (
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white"
                style={{ background: "linear-gradient(135deg, #23856C, #63D9B4)", boxShadow: "0 0 16px rgba(35,133,108,0.3)", border: "2px solid rgba(99,217,180,0.4)" }}>
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
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              Coins Wallet <LudzoCoin size={13} />
            </span>
            <span className="text-xl font-black font-numeric text-[var(--text-primary)] block">
              {profile?.wallet.coin_balance.toLocaleString()}
            </span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] space-y-1"
          >
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Cash Wallet</span>
            <span className="text-xl font-black font-numeric text-emerald-500 block">
              ${profile?.wallet.usdt_balance.toFixed(2)}
            </span>
          </motion.div>
        </div>

        {/* Won Coins — live DB value (wallets.won_coins_balance) */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden p-4 rounded-2xl space-y-1"
          style={{
            background: "linear-gradient(135deg, rgba(99,217,180,0.16) 0%, rgba(35,133,108,0.06) 100%)",
            border: "1px solid rgba(99,217,180,0.28)",
          }}
        >
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-25 pointer-events-none"
            style={{ background: "radial-gradient(circle, #63D9B4 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
          <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "#94A3B8" }}>
            Won Coins (Ludo prizes) <LudzoCoin size={13} />
          </span>
          <div className="flex items-end justify-between">
            <motion.span
              key={wonCoinsBalance}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xl font-black font-numeric block"
              style={{ color: "#8AE4C6" }}
            >
              {(wallet?.won_coins_balance ?? wonCoinsBalance).toLocaleString()}
            </motion.span>
            <span className="text-[10px] font-bold" style={{ color: "#64748B" }}>
              100 Won Coins = $1
            </span>
          </div>
        </motion.div>

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
              <ChevronRightIcon size={16} className="text-[var(--text-muted)]" />
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
