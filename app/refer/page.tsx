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
import Button from "@/components/ui/Button";

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

const HOW_IT_WORKS = [
  { color: "#7C3AED", bg: "rgba(124,58,237,0.12)", icon: <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />, text: "Share your unique referral link" },
  { color: "#3B82F6", bg: "rgba(59,130,246,0.12)", icon: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></>, text: "New user joins and gets 10 Coins bonus" },
  { color: "#10B981", bg: "rgba(16,185,129,0.12)", icon: <><rect x="2" y="5" width="20" height="14" rx="2" fill="none" /><path d="M2 10h20" /></>, text: "They make their first deposit" },
  { color: "#F59E0B", bg: "rgba(245,158,11,0.12)", icon: <><circle cx="12" cy="12" r="10" /><path d="M12 6v12M8 9h8M9 12h6" /></>, text: "You earn 10% commission in USDT" },
];

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
      showToast("Referral link copied!", "success");
    }
  };

  const handleShare = () => {
    if (!stats?.referral_link) return;
    const text = `Join LUDZO and earn rewards! Use my referral link: ${stats.referral_link}`;
    const tg = (window as Window & { Telegram?: { WebApp?: { openTelegramLink?: (url: string) => void } } }).Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(stats.referral_link)}&text=${encodeURIComponent("Join LUDZO and start earning!")}`;
      tg.openTelegramLink(shareUrl);
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
          <><SkeletonCard /><SkeletonCard /></>
        ) : (
          <>
            {/* Stats grid */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-2">
              {[
                {
                  label: "Referrals", value: stats?.total_referrals ?? 0,
                  color: "#A855F7", bg: "rgba(168,85,247,0.12)",
                  icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" /></>,
                },
                {
                  label: "Total", value: `$${formatUSDT(stats?.total_commission ?? 0)}`,
                  color: "#10B981", bg: "rgba(16,185,129,0.12)",
                  icon: <><circle cx="12" cy="12" r="10" /><path d="M12 6v12M8 9h8M9 12h6" strokeLinecap="round" /></>,
                },
                {
                  label: "Pending", value: `$${formatUSDT(stats?.pending_commission ?? 0)}`,
                  color: "#F59E0B", bg: "rgba(245,158,11,0.12)",
                  icon: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" strokeLinecap="round" /></>,
                },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl p-3 text-center"
                  style={{ background: s.bg, border: `1px solid ${s.color}30` }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="1.5" className="mx-auto mb-1">{s.icon}</svg>
                  <div className="font-numeric text-base font-bold text-[var(--text-primary)]">{s.value}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{s.label}</div>
                </div>
              ))}
            </motion.div>

            {/* Referral link card */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl p-4"
              style={{ background: "var(--card-bg)", border: "1px solid rgba(124,58,237,0.15)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.2)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="1.5">
                    <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Your Referral Link</h3>
              </div>
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-3"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="flex-1 text-xs text-[var(--text-muted)] truncate font-mono">
                  {stats?.referral_link ?? "Loading..."}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" className="flex-1 gap-1.5" onClick={handleCopy}>
                  <Copy size={13} /> Copy Link
                </Button>
                <Button variant="secondary" size="sm" className="flex-1 gap-1.5" onClick={handleShare}>
                  <Share2 size={13} /> Share
                </Button>
              </div>
            </motion.div>

            {/* How it works */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl p-4"
              style={{ background: "var(--card-bg)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">How It Works</h3>
              <div className="space-y-2.5">
                {HOW_IT_WORKS.map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: step.bg, border: `1px solid ${step.color}30` }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={step.color} strokeWidth="1.5">
                        {step.icon}
                      </svg>
                    </div>
                    <span className="text-xs text-[var(--text-secondary)] leading-relaxed">{step.text}</span>
                    <span className="ml-auto text-xs font-bold text-[var(--text-muted)] shrink-0">{i + 1}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* History */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Referral History</h2>
                {history.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(124,58,237,0.15)", color: "#A855F7" }}>
                    {history.length}
                  </span>
                )}
              </div>
              {history.length === 0 ? (
                <EmptyState title="No referrals yet" description="Share your link to start earning commission." variant="compact" />
              ) : (
                <div className="space-y-2">
                  {history.map((r, i) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: "var(--card-bg)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white"
                        style={{ background: "linear-gradient(135deg, #7C3AED, #A855F7)" }}>
                        {r.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                          {r.name}{r.username ? ` @${r.username}` : ""}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          ${formatUSDT(r.commission_amount)} commission
                        </div>
                      </div>
                      <Badge variant={r.commission_status === "earned" ? "success" : "warning"} size="sm">
                        {r.commission_status}
                      </Badge>
                    </motion.div>
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
