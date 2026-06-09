"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import Badge from "@/components/ui/Badge";
import { showToast } from "@/components/ui/Toast";
import { formatUSDT, formatDateTime } from "@/lib/utils";

interface WithdrawalItem {
  id: string;
  user: { first_name: string; username?: string; telegram_id: string };
  amount: number;
  fee_amount: number;
  net_amount: number;
  wallet_address: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
}

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "default"> = {
  paid: "success", approved: "success", pending: "warning", rejected: "error",
};

export default function AdminWithdrawalsPage() {
  const router = useRouter();
  const [items, setItems] = useState<WithdrawalItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selected, setSelected] = useState<WithdrawalItem | null>(null);

  const getToken = () => localStorage.getItem("ludzo_admin_token") ?? "";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/admin/withdrawals?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.status === 401) { router.replace("/admin"); return; }
      const data = await res.json();
      if (data.success) { setItems(data.data.items); setTotal(data.data.total); }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [page, status, router]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (id: string, action: "approve" | "reject" | "mark_paid") => {
    setProcessing(id);
    try {
      const res = await fetch("/api/admin/withdrawals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ withdrawal_id: id, action }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Withdrawal ${action.replace("_", " ")}`, "success");
        setSelected(null);
        await load();
      } else {
        showToast(data.error ?? "Action failed", "error");
      }
    } catch { showToast("Connection error", "error"); }
    finally { setProcessing(null); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <AdminShell title="Withdrawals">
      <div className="p-4 md:p-6 space-y-4">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "approved", "paid", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                status === s ? "bg-[#7C3AED] text-white" : "bg-[#111] border border-[#333] text-gray-400 hover:border-[#555]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-[#222]">
                {["User", "Amount", "Fee", "Net", "Wallet", "Status", "Date", "Actions"].map((h) => (
                  <th key={h} className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-500">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-500">No withdrawals found</td></tr>
              ) : items.map((w) => (
                <tr key={w.id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{w.user.first_name}</div>
                    {w.user.username && <div className="text-xs text-gray-500">@{w.user.username}</div>}
                  </td>
                  <td className="px-4 py-3 text-white font-numeric">${formatUSDT(w.amount)}</td>
                  <td className="px-4 py-3 text-red-400 font-numeric text-xs">-${formatUSDT(w.fee_amount)}</td>
                  <td className="px-4 py-3 text-green-400 font-bold font-numeric">${formatUSDT(w.net_amount)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono truncate max-w-[120px]">{w.wallet_address}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_COLOR[w.status] ?? "default"} size="sm">{w.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(w.created_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelected(w)}
                      className="px-3 py-1 rounded-lg bg-[#7C3AED]/20 text-[#A855F7] text-xs font-semibold hover:bg-[#7C3AED]/30"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Total: {total} withdrawals</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg bg-[#111] border border-[#333] disabled:opacity-40">
              <ChevronLeft size={14} />
            </button>
            <span className="px-3 py-2 rounded-lg bg-[#111] border border-[#333] text-white">{page}/{totalPages || 1}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 rounded-lg bg-[#111] border border-[#333] disabled:opacity-40">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Review modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-sm bg-[#111] border border-[#333] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white">Review Withdrawal</h3>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ["User", `${selected.user.first_name} (@${selected.user.username ?? selected.user.telegram_id})`],
                ["Amount", `$${formatUSDT(selected.amount)} USDT`],
                ["Fee (5%)", `-$${formatUSDT(selected.fee_amount)}`],
                ["Net Amount", `$${formatUSDT(selected.net_amount)} USDT`],
                ["Wallet", selected.wallet_address],
                ["Status", selected.status],
                ["Date", formatDateTime(selected.created_at)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-gray-500">{label}</span>
                  <span className={`text-white text-right font-medium ${label === "Wallet" ? "font-mono text-xs break-all" : ""}`}>{value}</span>
                </div>
              ))}
            </div>
            {selected.status === "pending" && (
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleAction(selected.id, "approve")}
                  disabled={processing === selected.id}
                  className="flex-1 py-2.5 rounded-xl bg-green-500/20 text-green-400 text-sm font-bold hover:bg-green-500/30 disabled:opacity-40"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleAction(selected.id, "reject")}
                  disabled={processing === selected.id}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/30 disabled:opacity-40"
                >
                  Reject
                </button>
              </div>
            )}
            {selected.status === "approved" && (
              <button
                onClick={() => handleAction(selected.id, "mark_paid")}
                disabled={processing === selected.id}
                className="w-full py-2.5 rounded-xl bg-[#7C3AED] text-white text-sm font-bold hover:bg-[#5B21B6] disabled:opacity-40"
              >
                ✓ Mark as Paid
              </button>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
