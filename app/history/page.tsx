"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import Badge from "@/components/ui/Badge";
import { SkeletonList } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { useApp } from "@/hooks/useApp";
import { formatDateTime } from "@/lib/utils";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "coins", label: "Coins 🪙" },
  { value: "usdt", label: "USDT" },
  { value: "deposit", label: "Deposits" },
  { value: "withdrawal", label: "Withdrawals" },
  { value: "ad_reward", label: "Ads" },
  { value: "task_reward", label: "Tasks" },
  { value: "referral_commission", label: "Referrals" },
];

const TYPE_EMOJI: Record<string, string> = {
  ad_reward: "📺", task_reward: "✅", daily_streak: "🔥",
  deposit: "💰", withdrawal: "💸", referral_commission: "🤝",
  welcome_bonus: "🎁", referral_bonus: "👥", default: "💫",
};

interface TxItem {
  id: string;
  type: string;
  currency: string;
  amount: number;
  status: string;
  created_at: string;
}

export default function HistoryPage() {
  const { userId } = useApp();
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState<TxItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (f: string, p: number, append = false) => {
    if (!userId) return;
    p === 1 ? setLoading(true) : setLoadingMore(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "20" });
      if (f !== "all") params.set("filter", f);
      const res = await fetch(`/api/wallet/history?${params}`, { headers: { "x-user-id": userId } });
      const data = await res.json();
      if (data.success) {
        setItems((prev) => append ? [...prev, ...data.data.items] : data.data.items);
        setTotal(data.data.total);
      }
    } catch { /* silent */ }
    finally { setLoading(false); setLoadingMore(false); }
  }, [userId]);

  useEffect(() => { setPage(1); load(filter, 1, false); }, [filter, load]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    load(filter, next, true);
  };

  const hasMore = items.length < total;

  return (
    <AppShell hideNav>
      <PageHeader title="Transaction History" back />
      <div className="pb-6">
        {/* Filters */}
        <div className="px-4 py-3 overflow-x-auto scrollbar-none">
          <div className="flex gap-2 w-max">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                  filter === f.value
                    ? "bg-[#7C3AED] text-white border-[#7C3AED]"
                    : "border-[var(--border)] text-[var(--text-muted)] hover:border-[#7C3AED]/40"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4">
          {loading ? (
            <SkeletonList count={8} />
          ) : items.length === 0 ? (
            <EmptyState emoji="📊" title="No transactions" description="No transactions found for this filter." />
          ) : (
            <>
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden">
                {items.map((tx, i) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    className={`flex items-center gap-3 px-4 py-3 ${i < items.length - 1 ? "border-b border-[var(--border)]" : ""}`}
                  >
                    <span className="text-lg">{TYPE_EMOJI[tx.type] ?? TYPE_EMOJI.default}</span>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-[var(--text-primary)] capitalize">
                        {tx.type.replace(/_/g, " ")}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">{formatDateTime(tx.created_at)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-sm font-bold font-numeric ${Number(tx.amount) > 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                        {Number(tx.amount) > 0 ? "+" : ""}{tx.amount} {tx.currency === "usdt" ? "USDT" : "🪙"}
                      </span>
                      {tx.status !== "completed" && (
                        <Badge variant={tx.status === "pending" ? "warning" : "error"} size="sm">{tx.status}</Badge>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {hasMore && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full mt-4 py-3 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] font-medium hover:bg-[var(--card-bg)] transition-colors disabled:opacity-60"
                >
                  {loadingMore ? "Loading…" : "Load More"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
