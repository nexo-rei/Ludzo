"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import Badge from "@/components/ui/Badge";
import { showToast } from "@/components/ui/Toast";
import { formatUSDT, formatCoins, formatDateTime } from "@/lib/utils";

interface AdminUser {
  id: string;
  telegram_id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  status: string;
  created_at: string;
  wallet: { coin_balance: number; usdt_balance: number };
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [adjustment, setAdjustment] = useState({ type: "add_coins", amount: "", reason: "" });

  const getToken = () => localStorage.getItem("ludzo_admin_token") ?? "";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), status });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/users?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.status === 401) { router.replace("/admin"); return; }
      const data = await res.json();
      if (data.success) { setUsers(data.data.items); setTotal(data.data.total); }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [page, search, status, router]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (action: string) => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const body: Record<string, unknown> = { user_id: selected.id, action };
      if (adjustment.amount) { body.amount = Number(adjustment.amount); body.reason = adjustment.reason; }
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Action completed successfully", "success");
        setSelected(null);
        setAdjustment({ type: "add_coins", amount: "", reason: "" });
        await load();
      } else {
        showToast(data.error ?? "Action failed", "error");
      }
    } catch { showToast("Connection error", "error"); }
    finally { setActionLoading(false); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <AdminShell title="Users">
      <div className="p-4 md:p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, username, or Telegram ID…"
              className="w-full pl-9 pr-4 py-2.5 bg-[#111] border border-[#333] rounded-xl text-white text-sm outline-none focus:border-[#7C3AED]"
            />
          </div>
          <select
            value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2.5 bg-[#111] border border-[#333] rounded-xl text-white text-sm outline-none focus:border-[#7C3AED]"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#222]">
                {["User", "Telegram ID", "Coins", "USDT", "Status", "Joined", "Actions"].map((h) => (
                  <th key={h} className="text-left text-xs text-gray-500 font-semibold uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500">Loading…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500">No users found</td></tr>
              ) : users.map((user) => (
                <tr key={user.id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">{user.first_name} {user.last_name ?? ""}</div>
                    {user.username && <div className="text-xs text-gray-500">@{user.username}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{user.telegram_id}</td>
                  <td className="px-4 py-3 text-yellow-400 font-numeric">{formatCoins(user.wallet.coin_balance)}</td>
                  <td className="px-4 py-3 text-green-400 font-numeric">${formatUSDT(user.wallet.usdt_balance)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.status === "active" ? "success" : "error"} size="sm">{user.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(user.created_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelected(user)}
                      className="px-3 py-1 rounded-lg bg-[#7C3AED]/20 text-[#A855F7] text-xs font-semibold hover:bg-[#7C3AED]/30 transition-colors"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Total: {total} users</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg bg-[#111] border border-[#333] disabled:opacity-40 hover:border-[#555]">
              <ChevronLeft size={14} />
            </button>
            <span className="px-3 py-2 rounded-lg bg-[#111] border border-[#333] text-white">{page}/{totalPages || 1}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 rounded-lg bg-[#111] border border-[#333] disabled:opacity-40 hover:border-[#555]">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* User action modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-sm bg-[#111] border border-[#333] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white">Manage User</h3>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <div>
              <p className="font-semibold text-white">{selected.first_name} {selected.last_name}</p>
              <p className="text-xs text-gray-500">@{selected.username} • {selected.telegram_id}</p>
            </div>

            {/* Balance adjustment */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-medium">Balance Adjustment</label>
              <select
                value={adjustment.type}
                onChange={(e) => setAdjustment((a) => ({ ...a, type: e.target.value }))}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-xl text-white text-sm outline-none focus:border-[#7C3AED]"
              >
                <option value="add_coins">Add Coins</option>
                <option value="remove_coins">Remove Coins</option>
                <option value="add_usdt">Add USDT</option>
                <option value="remove_usdt">Remove USDT</option>
              </select>
              <input
                type="number" min={0} value={adjustment.amount}
                onChange={(e) => setAdjustment((a) => ({ ...a, amount: e.target.value }))}
                placeholder="Amount"
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-xl text-white text-sm outline-none focus:border-[#7C3AED]"
              />
              <input
                type="text" value={adjustment.reason}
                onChange={(e) => setAdjustment((a) => ({ ...a, reason: e.target.value }))}
                placeholder="Reason (optional)"
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-xl text-white text-sm outline-none focus:border-[#7C3AED]"
              />
              <button
                onClick={() => handleAction(adjustment.type)}
                disabled={!adjustment.amount || actionLoading}
                className="w-full py-2.5 rounded-xl bg-[#7C3AED] text-white text-sm font-bold disabled:opacity-60 hover:bg-[#5B21B6] transition-colors"
              >
                {actionLoading ? "Processing…" : "Apply Adjustment"}
              </button>
            </div>

            <div className="border-t border-[#222] pt-3 flex gap-2">
              <button
                onClick={() => handleAction(selected.status === "active" ? "suspend" : "unsuspend")}
                disabled={actionLoading}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60 transition-colors ${
                  selected.status === "active"
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                }`}
              >
                {selected.status === "active" ? "Suspend" : "Unsuspend"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
