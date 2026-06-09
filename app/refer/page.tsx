"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Copy, Share2 } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { showToast } from "@/components/ui/Toast";
import { useApp } from "@/hooks/useApp";
import { formatUSDT } from "@/lib/utils";

interface ReferralStats {
  total_referrals: number;
  total_commission: number;
  pending_commission: number;
  referral_link: string;
}

interface ReferralHistory {
  id: string;
  name: string;
  username?: string;
  commission_amount: number;
  commission_status: string;
  joined_at: string;
}

export default function ReferPage() {
  const { userId } = useApp();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [history, setHistory] = useState<ReferralHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [statsRes, histRes] = await Promise.all([
        fetch("/api/referrals", { headers: { "x-user-id": userId } }),
        fetch("/api/referrals/history", { headers: { "x-user-id": userId } }),
      ]);
      const [statsData, histData] = await Promise.all([statsRes.json(), histRes.json()]);
      if (statsData.success) setStats(statsData.data);
      if (histData.success) setHistory(histData.data.items ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleCopy = () => {
    if (stats?.referral_link) {
      navigator.clipboard.writeText(stats.referral_link);
      showToast("Referral link copied! 📋", "success");
    }
  };

  const handleShare = () => {
    if (!stats?.referral_link) return;
    const text = `Join LUDZO and earn rewards! Use my referral link: ${stats.referral_link}`;
    if (typeof window !== "undefined" && (window as Window & { Telegram?: { WebApp?: { openTelegramLink?: (url: string) => void } } }).Telegram?.WebApp?.openTelegramLink) {
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(stats.referral_link)}&text=${encodeURIComponent("Join LUDZO and start earning! 🚀")}`;
      (window as Window & { Telegram?: { WebApp?: { openTelegramLink?: (url: string) => void } } }).Telegram?.WebApp?.openTelegramLink?.(shareUrl);
    } else {
      navigator.clipboard.writeText(text);
      showToast("Link copied to clipboard!", "info");
    }
  };

  return (
    <AppShell>
      <PageHeader title="Refer & Earn" />
      <div className="px-4 py-4 space-y-4 pb-6">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-3 gap-2"
            >
              {[
                { label: "Referrals", value: stats?.total_referrals ?? 0, icon: "👥" },
                { label: "Total Earned", value: `$${formatUSDT(stats?.total_commission ?? 0)}`, icon: "💰" },
                { label: "Pending", value: `$${formatUSDT(stats?.pending_commission ?? 0)}`, icon: "⏳" },
              ].map((s) => (
                <div key={s.label} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-3 text-center">
                  <div className="text-xl mb-1">{s.icon}</div>
                  <div className="font-numeric text-base font-bold text-[var(--text-primary)]">{s.value}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{s.label}</div>
                </div>
              ))}
            </motion.div>

            {/* Referral link */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-2xl p-4"
            >
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Your Referral Link</h3>
              <div className="flex items-center gap-2 bg-[var(--bg)] rounded-xl p-3 mb-3">
                <span className="flex-1 text-xs text-[var(--text-muted)] truncate font-mono">
                  {stats?.referral_link ?? "Loading..."}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                             bg-[#7C3AED] text-white text-sm font-semibold hover:bg-[#5B21B6] transition-colors"
                >
                  <Copy size={14} /> Copy Link
                </button>
                <button
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                             bg-[var(--border)] text-[var(--text-primary)] text-sm font-semibold hover:bg-[var(--border)]/80 transition-colors"
                >
                  <Share2 size={14} /> Share
                </button>
              </div>
            </motion.div>

            {/* How it works */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4"
            >
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">How It Works</h3>
              <div className="space-y-2">
                {[
                  { icon: "🔗", text: "Share your unique referral link" },
                  { icon: "👤", text: "New user joins & gets 10 Coins bonus" },
                  { icon: "💵", text: "They make their first deposit" },
                  { icon: "💰", text: "You earn 10% commission in USDT (first deposit only)" },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-base mt-0.5">{step.icon}</span>
                    <span className="text-xs text-[var(--text-secondary)] leading-relaxed">{step.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* History */}
            <div>
              <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                Referral History
              </h2>
              {history.length === 0 ? (
                <EmptyState emoji="🤝" title="No referrals yet" description="Share your link to start earning commission." />
              ) : (
                <div className="space-y-2">
                  {history.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 p-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-[#7C3AED]/20 flex items-center justify-center text-sm font-bold text-[#A855F7]">
                        {r.name[0]}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-[var(--text-primary)]">
                          {r.name} {r.username ? `@${r.username}` : ""}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          ${formatUSDT(r.commission_amount)} commission
                        </div>
                      </div>
                      <Badge variant={r.commission_status === "earned" ? "success" : "warning"} size="sm">
                        {r.commission_status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
