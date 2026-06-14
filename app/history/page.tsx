"use client";

import { useEffect, useState, useCallback, type ReactElement } from "react";
import { motion } from "framer-motion";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import Badge from "@/components/ui/Badge";
import { SkeletonList } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { useApp } from "@/hooks/useApp";
import { formatDateTime } from "@/lib/utils";

const FILTERS = [
  { value: "all",                 label: "All"         },
  { value: "coins",               label: "Coins"       },
  { value: "usdt",                label: "USDT"        },
  { value: "deposit",             label: "Deposits"    },
  { value: "withdrawal",          label: "Withdrawals" },
  { value: "ad_reward",           label: "Ads"         },
  { value: "task_reward",         label: "Tasks"       },
  { value: "referral_commission", label: "Referrals"   },
];

interface TxItem {
  id: string;
  type: string;
  currency: string;
  amount: number;
  status: string;
  created_at: string;
}

interface IconConfig { paths: ReactElement; color: string; bg: string }

const TYPE_ICON_MAP: Record<string, IconConfig> = {
  ad_reward: {
    color: "#3B82F6", bg: "rgba(59,130,246,0.1)",
    paths: <polygon points="5 3 19 12 5 21 5 3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>,
  },
  task_reward: {
    color: "#10B981", bg: "rgba(16,185,129,0.1)",
    paths: <>
      <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </>,
  },
  daily_streak: {
    color: "#F59E0B", bg: "rgba(245,158,11,0.1)",
    paths: <>
      <path d="M12 2c0 0-4 4-4 8a4 4 0 008 0c0-4-4-8-4-8z" fill="currentColor" opacity="0.3"/>
      <path d="M12 2c0 0-4 4-4 8a4 4 0 008 0c0-4-4-8-4-8z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M9 13c0 0 1 2 3 2s3-2 3-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </>,
  },
  deposit: {
    color: "#10B981", bg: "rgba(16,185,129,0.1)",
    paths: <>
      <path d="M12 22V12M16 16l-4 4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20 10V6a2 2 0 00-2-2H6a2 2 0 00-2 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </>,
  },
  withdrawal: {
    color: "#A855F7", bg: "rgba(168,85,247,0.1)",
    paths: <>
      <path d="M12 2v10M8 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </>,
  },
  referral_commission: {
    color: "#7C3AED", bg: "rgba(124,58,237,0.1)",
    paths: <>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </>,
  },
  welcome_bonus: {
    color: "#F59E0B", bg: "rgba(245,158,11,0.1)",
    paths: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>,
  },
  referral_bonus: {
    color: "#3B82F6", bg: "rgba(59,130,246,0.1)",
    paths: <>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    </>,
  },
};

const DEFAULT_ICON_CFG: IconConfig = {
  color: "#94A3B8", bg: "rgba(148,163,184,0.1)",
  paths: <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none"/>,
};

function TxIcon({ type }: { type: string }) {
  const c = TYPE_ICON_MAP[type] ?? DEFAULT_ICON_CFG;
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
      style={{ background: c.bg, border: `1px solid ${c.color}25` }}>
      <svg width="16" height="16" viewBox="0 0 24 24" style={{ color: c.color }}>{c.paths}</svg>
    </div>
  );
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

  const loadMore = () => { const next = page + 1; setPage(next); load(filter, next, true); };
  const hasMore = items.length < total;

  return (
    <AppShell hideNav>
      <PageHeader title="Transaction History" back />
      <div className="pb-6">
        {/* Filters */}
        <div className="px-4 py-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <div className="flex gap-2 w-max">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
                style={filter === f.value
                  ? { background: "#7C3AED", color: "white", boxShadow: "0 2px 8px rgba(124,58,237,0.3)" }
                  : { background: "var(--card-bg)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4">
          {loading ? (
            <SkeletonList count={8}/>
          ) : items.length === 0 ? (
            <EmptyState title="No transactions" description="No transactions found for this filter."/>
          ) : (
            <>
              <div className="rounded-2xl overflow-hidden"
                style={{ background: "var(--card-bg)", border: "1px solid var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                {items.map((tx, i) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none" }}
                  >
                    <TxIcon type={tx.type}/>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold capitalize truncate" style={{ color: "var(--text-primary)" }}>
                        {tx.type.replace(/_/g, " ")}
                      </div>
                      <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{formatDateTime(tx.created_at)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-sm font-bold font-numeric ${Number(tx.amount) > 0 ? "text-[#059669]" : "text-[#DC2626]"}`}>
                        {Number(tx.amount) > 0 ? "+" : ""}{tx.amount} {tx.currency === "usdt" ? "USDT" : "Coins"}
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
                  onClick={loadMore} disabled={loadingMore}
                  className="w-full mt-4 py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
                  style={{ background: "var(--card-bg)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
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
