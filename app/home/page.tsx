"use client";

import { useEffect, useState, useCallback } from "react";
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
import { formatDateTime, displayName, initials } from "@/lib/utils";
import type { HomePageData } from "@/types";
import LudzoLogo from "@/components/layout/LudzoLogo";
import LudzoCoin from "@/components/ui/LudzoCoin";
import TxTypeIcon from "@/components/ui/TxTypeIcon";

export default function HomePage() {
  const router = useRouter();
  const { userId, wallet, wonCoinsBalance, refreshWallet, t } = useApp();
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
    refreshWallet();
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
        <EmptyState title={t("error")} description={t("error")} action={{ label: t("retry"), onClick: refresh }} />
      </AppShell>
    );
  }

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
                {t("welcome_user", { name: data.user.first_name?.trim() || "player" })}
              </h1>
              <p className="text-[11px] text-[var(--text-muted)]">{t("workspace_sub")}</p>
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
              {initials(displayName(data.user), 1)}
            </div>
          )}
        </motion.div>

        <section className="dashboard-hero">
          <div className="hero-copy">
            <span className="eyebrow"><span /> {t("eyebrow")}</span>
            <h2>{t("hero_heading")}</h2>
            <p>{t("hero_desc")}</p>
            <Link href="/games/home" className="hero-link">{t("enter_arena")} <ArrowUpRightIcon size={17} /></Link>
          </div>
          <ArenaArtwork />
        </section>

        <div className="section-heading">
          <h2>{t("your_wallet")}</h2>
          <span>{t("balances_glance")}</span>
        </div>

        <WalletCards
          coinBalance={data.wallet.coin_balance}
          usdtBalance={data.wallet.usdt_balance}
          coinRate={data.settings.coin_rate}
          wonCoins={wallet?.won_coins_balance ?? data.wallet.won_coins_balance ?? wonCoinsBalance}
        />

        <div className="dashboard-rewards">
          <AdSection
            adsWatchedToday={data.ads.watched_today}
            dailyLimit={data.ads.daily_limit}
            adReward={data.ads.reward_per_ad}
            onAdWatched={loadData}
          />

          <StreakSection
            streak={data.streak}
            todayReward={data.streak?.today_reward ?? 2}
            dayRewards={data.streak?.day_rewards}
            bonusAdsToday={data.streak?.bonus_ads_today ?? 0}
            onClaimed={loadData}
          />
        </div>

        {/* Announcements */}
        {data.announcements.length > 0 && (
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2.5 px-0.5">
              {t("announcements")}
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
              {t("recent_activity")}
            </h2>
            <button onClick={() => router.push("/history")}
              className="text-[11px] font-semibold transition-opacity hover:opacity-70"
              style={{ color: "#63D9B4" }}>
              {t("view_all")}
            </button>
          </div>
          {data.recent_activity.length === 0 ? (
            <EmptyState title={t("no_activity")} description={t("no_activity_desc")} variant="compact" />
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
                  <TxTypeIcon type={tx.type} size={15} box={32} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[var(--text-primary)] capitalize truncate">
                      {tx.type.replace(/_/g, " ")}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)]">{formatDateTime(tx.created_at)}</div>
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-black font-numeric ${Number(tx.amount) > 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                    {Number(tx.amount) > 0 ? "+" : ""}{tx.amount}
                    <span className="text-[10px] font-normal text-[var(--text-muted)] inline-flex items-center gap-1">
                      {tx.currency === "usdt" ? "USDT" : <><LudzoCoin size={11} /> {t("coins")}</>}
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
