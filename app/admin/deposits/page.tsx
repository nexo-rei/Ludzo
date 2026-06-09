"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import Badge from "@/components/ui/Badge";
import { showToast } from "@/components/ui/Toast";
import { formatUSDT, formatDateTime } from "@/lib/utils";

interface DepositItem {
  id: string;
  user: { first_name: string; username?: string };
  amount: number;
  status: string;
  created_at: string;
  completed_at?: string;
  binance_transaction_id?: string;
}

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "default"> = {
  completed: "success", pending: "warning", failed: "error",
};

export default function AdminDepositsPage() {
  const router = useRouter();
  const [deposits, setDeposits] = useState<DepositItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const getToken = () => localStorage.getItem("ludzo_admin_token") ?? "";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/admin/deposits?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.status === 401) { router.replace("/admin"); return; }
      const data = await res.json();
      if (data.success) { setDeposits(data.data.items); setTotal(data.data.total); }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [page, status, router]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setProcessing(id);
    try {
      const res = await fetch("/api/admin/deposits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ deposit_id: id, action }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Deposit ${action}ed`, "success");
        await load();
      } else {
        showToast(data.error ?? "Action failed", "error");
      }
    } catch { showToast("Connection error", "error"); }
    finally { setProcessing(null); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <AdminShell title="Deposits">
      <div className="p-4 md:p-6 space-y-4">
        {/* Filters */}
        <div className="flex gap-2">
          {["all", "pending", "completed", "failed"].map((s) => (
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
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-[#222]">
                {["User", "Amount", "Status", "Date", "Transaction ID", "Actions"].map((h) => (
                  <th key={h} className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">Loading…</td></tr>
              ) : deposits.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">No deposits found</td></tr>
              ) : deposits.map((d) => (
                <tr key={d.id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{d.user.first_name}</div>
                    {d.user.username && <div className="text-xs text-gray-500">@{d.user.username}</div>}
                  </td>
                  <td className="px-4 py-3 text-green-400 font-bold font-numeric">${formatUSDT(d.amount)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_COLOR[d.status] ?? "default"} size="sm">{d.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(d.created_at)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono truncate max-w-[120px]">
                    {d.binance_transaction_id ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {d.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAction(d.id, "approve")}
                          disabled={processing === d.id}
                          className="px-3 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs font-semibold hover:bg-green-500/30 disabled:opacity-40"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(d.id, "reject")}
                          disabled={processing === d.id}
                          className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30 disabled:opacity-40"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Total: {total} deposits</span>
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
    </AdminShell>
  );
}
