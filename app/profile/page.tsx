"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Settings, Clock, Trophy, Users, CheckSquare, ChevronRight } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useApp } from "@/hooks/useApp";
import { formatUSDT, formatCoins } from "@/lib/utils";

interface ProfileData {
  user: { first_name: string; last_name?: string; username?: string; telegram_id: string; photo_url?: string };
  wallet: { coin_balance: number; usdt_balance: number };
  stats: { total_tasks_completed: number; total_referrals: number; current_streak_day: number; total_streaks_claimed: number };
}

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

  const MENU_ITEMS = [
    { icon: Clock, label: "Transaction History", href: "/history" },
    { icon: Trophy, label: "Leaderboard", href: "/leaderboard" },
    { icon: Users, label: "Refer & Earn", href: "/refer" },
    { icon: CheckSquare, label: "FAQ", href: "/faq" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  return (
    <AppShell>
      <div className="px-4 py-6 space-y-5 pb-6">
        {loading ? (
          <>
            <SkeletonCard lines={3} />
            <SkeletonCard />
          </>
        ) : (
          <>
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4"
            >
              {profile?.user.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.user.photo_url}
                  alt="avatar"
                  className="w-16 h-16 rounded-full border-2 border-[#7C3AED]"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#7C3AED]/20 border-2 border-[#7C3AED] flex items-center justify-center text-2xl font-bold text-[#A855F7]">
                  {profile?.user.first_name[0]}
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-lg font-black text-[var(--text-primary)]">
                  {profile?.user.first_name} {profile?.user.last_name ?? ""}
                </h2>
                {profile?.user.username && (
                  <p className="text-sm text-[var(--text-muted)]">@{profile.user.username}</p>
                )}
                <p className="text-xs text-[var(--text-muted)]">ID: {profile?.user.telegram_id}</p>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="grid grid-cols-2 gap-3"
            >
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 text-center">
                <div className="text-2xl font-black font-numeric text-[var(--text-primary)]">
                  {formatCoins(profile?.wallet.coin_balance ?? 0)}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">Total Coins 🪙</div>
              </div>
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 text-center">
                <div className="text-2xl font-black font-numeric text-[#10B981]">
                  ${formatUSDT(profile?.wallet.usdt_balance ?? 0)}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">USDT Balance</div>
              </div>
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 text-center">
                <div className="text-2xl font-black font-numeric text-[#F59E0B]">
                  Day {profile?.stats.current_streak_day ?? 1}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">Current Streak 🔥</div>
              </div>
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 text-center">
                <div className="text-2xl font-black font-numeric text-[#A855F7]">
                  {profile?.stats.total_referrals ?? 0}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">Referrals 👥</div>
              </div>
            </motion.div>

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden"
            >
              {MENU_ITEMS.map(({ icon: Icon, label, href }, i) => (
                <button
                  key={href}
                  onClick={() => router.push(href)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--border)]/50 transition-colors text-left
                              ${i < MENU_ITEMS.length - 1 ? "border-b border-[var(--border)]" : ""}`}
                >
                  <Icon size={17} className="text-[#7C3AED]" />
                  <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">{label}</span>
                  <ChevronRight size={14} className="text-[var(--text-muted)]" />
                </button>
              ))}
            </motion.div>

            {/* Legal links */}
            <div className="flex items-center justify-center gap-6">
              {[["Privacy", "/privacy"], ["Terms", "/terms"], ["Support", "/support"]].map(([label, href]) => (
                <button
                  key={href}
                  onClick={() => router.push(href)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full py-3 rounded-xl border border-[#EF4444]/40 text-[#EF4444] text-sm font-semibold hover:bg-[#EF4444]/10 transition-colors"
            >
              Log Out
            </button>
          </>
        )}
      </div>
    </AppShell>
  );
}
