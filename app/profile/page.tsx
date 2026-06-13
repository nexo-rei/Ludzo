"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import AppShell from "@/components/layout/AppShell";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useApp } from "@/hooks/useApp";
import { formatUSDT, formatCoins } from "@/lib/utils";

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
];

export default function ProfilePage() {
  const router = useRouter();
  const { userId, setUser } = useApp();
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

  return (
    <AppShell>
      <div className="px-4 py-4 space-y-4 pb-6">
        {loading ? (
          <><SkeletonCard lines={3} /><SkeletonCard /></>
        ) : (
          <>
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
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="grid grid-cols-2 gap-3"
            >
              <div className="rounded-2xl p-4 text-center" style={{ background: "linear-gradient(135deg, #2A1F4E, #1E1640)", border: "1px solid rgba(124,58,237,0.25)" }}>
                <div className="text-xl font-black font-numeric" style={{ color: "#A855F7" }}>{formatCoins(profile?.wallet.coin_balance ?? 0)}</div>
                <div className="text-[10px] text-[#64748B] mt-0.5">Coin Balance</div>
              </div>
              <div className="rounded-2xl p-4 text-center" style={{ background: "linear-gradient(135deg, #0D2E26, #0A1F1B)", border: "1px solid rgba(16,185,129,0.25)" }}>
                <div className="text-xl font-black font-numeric text-[#10B981]">${formatUSDT(profile?.wallet.usdt_balance ?? 0)}</div>
                <div className="text-[10px] text-[#64748B] mt-0.5">USDT Balance</div>
              </div>
              <div className="rounded-2xl p-4 text-center" style={{ background: "var(--card-bg)", border: "1px solid rgba(245,158,11,0.15)" }}>
                <div className="text-xl font-black font-numeric" style={{ color: "#F59E0B" }}>Day {profile?.stats.current_streak_day ?? 1}</div>
                <div className="text-[10px] text-[#64748B] mt-0.5">Current Streak</div>
              </div>
              <div className="rounded-2xl p-4 text-center" style={{ background: "var(--card-bg)", border: "1px solid rgba(59,130,246,0.15)" }}>
                <div className="text-xl font-black font-numeric" style={{ color: "#60A5FA" }}>{profile?.stats.total_referrals ?? 0}</div>
                <div className="text-[10px] text-[#64748B] mt-0.5">Referrals</div>
              </div>
            </motion.div>

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="rounded-2xl overflow-hidden"
              style={{ background: "var(--card-bg)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              {MENU_ITEMS.map(({ label, href, color, bg, icon }, i) => (
                <button
                  key={href}
                  onClick={() => router.push(href)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[rgba(124,58,237,0.06)] transition-colors"
                  style={{ borderBottom: i < MENU_ITEMS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: bg, border: `1px solid ${color}30` }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
                  </div>
                  <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">{label}</span>
                  <ChevronRight size={13} className="text-[#475569]" />
                </button>
              ))}
            </motion.div>

            {/* Legal links */}
            <div className="flex items-center justify-center gap-6">
              {[["Privacy", "/privacy"], ["Terms", "/terms"], ["Support", "/support"]].map(([label, href]) => (
                <button key={href} onClick={() => router.push(href)}
                  className="text-xs text-[#475569] hover:text-[#64748B] transition-colors">{label}</button>
              ))}
            </div>

            {/* Logout */}
            <motion.button
              onClick={handleLogout}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#F87171" }}
            >
              Log Out
            </motion.button>
          </>
        )}
      </div>
    </AppShell>
  );
}
