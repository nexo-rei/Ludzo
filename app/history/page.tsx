"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import Badge from "@/components/ui/Badge";
import { SkeletonList } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import TxTypeIcon from "@/components/ui/TxTypeIcon";
import { useApp } from "@/hooks/useApp";
import { formatDateTime } from "@/lib/utils";

interface TxItem {
  id: string;
  type: string;
  currency: string;
  amount: number;
  status: string;
  created_at: string;
}

export default function HistoryPage() {
  const { userId, t } = useApp();
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState<TxItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const FILTERS = [
    { value: "all",                 label: t("all") },
    { value: "coins",               label: t("coins") },
    { value: "usdt",                label: t("usdt") },
    { value: "deposit",             label: t("filter_deposits") },
    { value: "withdrawal",          label: t("filter_withdrawals") },
    { value: "ad_reward",           label: t("filter_ads") },
    { value: "task_reward",         label: t("filter_tasks") },
    { value: "referral_commission", label: t("filter_referrals") },
  ];

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
      <PageHeader title={t("history_title")} back />
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
                  ? { background: "#23856C", color: "white", boxShadow: "0 2px 8px rgba(35,133,108,0.3)" }
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
            <EmptyState title={t("no_transactions")} description={t("no_transactions_desc")}/>
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
                    <TxTypeIcon type={tx.type} size={16} box={36} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold capitalize truncate" style={{ color: "var(--text-primary)" }}>
                        {tx.type.replace(/_/g, " ")}
                      </div>
                      <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{formatDateTime(tx.created_at)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-sm font-bold font-numeric ${Number(tx.amount) > 0 ? "text-[#059669]" : "text-[#DC2626]"}`}>
                        {Number(tx.amount) > 0 ? "+" : ""}{tx.amount} {tx.currency === "usdt" ? "USDT" : t("coins")}
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
                  {loadingMore ? t("loading") : t("load_more")}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
