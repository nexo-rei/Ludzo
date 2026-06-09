"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AppShell from "@/components/layout/AppShell";
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

const ACTIVITY_ICONS: Record<string, string> = {
  ad_reward: "📺", task_reward: "✅", daily_streak: "🔥",
  deposit: "💰", withdrawal: "💸", referral_commission: "🤝",
  welcome_bonus: "🎁", referral_bonus: "👥", default: "💫",
};

export default function HomePage() {
  const router = useRouter();
  const { userId } = useApp();
  const [data, setData] = useState<HomePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState(0);

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

  const refresh = () => { setKey((k) => k + 1); loadData(); };

  if (loading) {
    return (
      <AppShell>
        <div className="px-4 py-5 space-y-4">
          <SkeletonList count={4} />
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <EmptyState emoji="⚠️" title="Failed to load" description="Could not load home data." action={{ label: "Retry", onClick: refresh }} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-4 py-5 space-y-4 pb-6">
        {/* Header */}
        <motion.div className="flex items-center justify-between" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div>
            <h1 className="text-xl font-black text-[var(--text-primary)] tracking-tight">
              Hey, {data.user.first_name} 👋
            </h1>
            <p className="text-xs text-[var(--text-muted)]">Welcome back to LUDZO</p>
          </div>
          {data.user.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.user.photo_url} alt="avatar" className="w-10 h-10 rounded-full border-2 border-[#7C3AED]" />
          )}
        </motion.div>

        {/* Wallet */}
        <WalletCards
          coinBalance={data.wallet.coin_balance}
          usdtBalance={data.wallet.usdt_balance}
          coinRate={data.settings.coin_rate}
        />

        {/* Ads */}
        <AdSection
          adsWatchedToday={data.ads.watched_today}
          dailyLimit={data.ads.daily_limit}
          adReward={data.ads.reward_per_ad}
          onAdWatched={loadData}
        />

        {/* Streak */}
        <StreakSection
          streak={data.streak}
          todayReward={data.streak?.today_reward ?? 2}
          onClaimed={loadData}
        />

        {/* Announcements */}
        {data.announcements.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-2 px-0.5">
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
          <div className="flex items-center justify-between mb-2 px-0.5">
            <h2 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">
              Recent Activity
            </h2>
            <button onClick={() => router.push("/history")} className="text-xs text-[#7C3AED] font-medium">
              View All
            </button>
          </div>
          {data.recent_activity.length === 0 ? (
            <EmptyState emoji="📊" title="No activity yet" description="Start watching ads to earn Coins!" />
          ) : (
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden">
              {data.recent_activity.map((tx, i) => (
                <div key={tx.id} className={`flex items-center gap-3 px-4 py-3 ${i < data.recent_activity.length - 1 ? "border-b border-[var(--border)]" : ""}`}>
                  <span className="text-lg">{ACTIVITY_ICONS[tx.type] ?? ACTIVITY_ICONS.default}</span>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-[var(--text-primary)] capitalize">
                      {tx.type.replace(/_/g, " ")}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)]">{formatDateTime(tx.created_at)}</div>
                  </div>
                  <div className={`text-sm font-bold font-numeric ${Number(tx.amount) > 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                    {Number(tx.amount) > 0 ? "+" : ""}{tx.amount} {tx.currency === "usdt" ? "USDT" : "🪙"}
                  </div>
                </div>
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
