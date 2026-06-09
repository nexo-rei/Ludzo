"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { formatDateTime } from "@/lib/utils";

interface LogEntry {
  id: string;
  admin_user: string;
  action_type: string;
  target?: string;
  details?: string;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  user_suspend: "text-red-400",
  user_unsuspend: "text-green-400",
  deposit_approve: "text-green-400",
  deposit_reject: "text-red-400",
  withdrawal_approve: "text-green-400",
  withdrawal_reject: "text-red-400",
  withdrawal_mark_paid: "text-blue-400",
  settings_update: "text-yellow-400",
  task_create: "text-purple-400",
  task_update: "text-purple-400",
  task_delete: "text-red-400",
  announcement_create: "text-blue-400",
  announcement_update: "text-blue-400",
  announcement_delete: "text-red-400",
  balance_adjustment: "text-yellow-400",
};

export default function AdminLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionType, setActionType] = useState("all");
  const [loading, setLoading] = useState(true);

  const getToken = () => localStorage.getItem("ludzo_admin_token") ?? "";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (actionType !== "all") params.set("action", actionType);
      const res = await fetch(`/api/admin/logs?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.status === 401) { router.replace("/admin"); return; }
      const data = await res.json();
      if (data.success) { setLogs(data.data.items); setTotal(data.data.total); }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [page, actionType, router]);

  useEffect(() => { load(); }, [load]);

  const ACTION_TYPES = [
    "all", "user_suspend", "deposit_approve", "deposit_reject",
    "withdrawal_approve", "withdrawal_reject", "withdrawal_mark_paid",
    "settings_update", "task_create", "task_delete", "balance_adjustment",
  ];

  const totalPages = Math.ceil(total / 50);

  return (
    <AdminShell title="Admin Logs">
      <div className="p-4 md:p-6 space-y-4">
        {/* Filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {ACTION_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => { setActionType(type); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                actionType === type ? "bg-[#7C3AED] text-white" : "bg-[#111] border border-[#333] text-gray-400 hover:border-[#555]"
              }`}
            >
              {type === "all" ? "All" : type.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        {/* Logs list */}
        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading…</div>
        ) : (
          <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
            {logs.length === 0 ? (
              <div className="text-center text-gray-500 py-10">No logs found</div>
            ) : (
              logs.map((log, i) => (
                <div
                  key={log.id}
                  className={`px-4 py-3 ${i < logs.length - 1 ? "border-b border-[#1a1a1a]" : ""} hover:bg-[#1a1a1a] transition-colors`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">{log.admin_user}</span>
                        <span className={`text-xs font-semibold ${ACTION_COLORS[log.action_type] ?? "text-gray-400"}`}>
                          {log.action_type.replace(/_/g, " ")}
                        </span>
                        {log.target && (
                          <span className="text-xs text-gray-500">→ {log.target}</span>
                        )}
                      </div>
                      {log.details && (
                        <p className="text-[11px] text-gray-600 mt-0.5 font-mono">{log.details}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-600 whitespace-nowrap">{formatDateTime(log.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Total: {total} entries</span>
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
