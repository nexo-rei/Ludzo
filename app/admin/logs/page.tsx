"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon, RefreshIcon } from "@/components/ui/DuotoneIcons";
import AdminShell from "@/components/admin/AdminShell";
import { formatDateTime } from "@/lib/utils";

interface LogEntry {
  id: string;
  admin_user: string;
  action_type: string;
  target?: string | null;
  target_type?: string | null;
  details?: string | null;
  created_at?: string | null;
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
  support_reply: "text-cyan-400",
  support_update: "text-cyan-400",
};

const ACTION_TYPES = [
  "all", "user_suspend", "deposit_approve", "deposit_reject",
  "withdrawal_approve", "withdrawal_reject", "withdrawal_mark_paid",
  "settings_update", "task_create", "task_delete", "balance_adjustment",
  "support_reply", "support_update",
];

const prettyLabel = (value: string) =>
  String(value ?? "unknown").replace(/_/g, " ");

/**
 * details JSONB ko hamesha text me render karo.
 * (Pehle object directly render hota tha → React "Objects are not valid as a
 * React child" throw karta tha aur poora page crash ho jata tha.)
 */
function formatDetails(details?: string | null): string | null {
  if (!details) return null;
  const text = typeof details === "string" ? details : JSON.stringify(details);
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") {
      const entries = Object.entries(parsed as Record<string, unknown>)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
      return entries.length > 0 ? entries.join("  ·  ") : null;
    }
    return String(parsed);
  } catch {
    return text;
  }
}

export default function AdminLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionType, setActionType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const limit = 50;

  const getToken = () => localStorage.getItem("ludzo_admin_token") ?? "";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (actionType !== "all") params.set("action", actionType);
      const res = await fetch(`/api/admin/logs?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.status === 401) { router.replace("/admin"); return; }
      const data = await res.json();
      const payload = data?.data ?? {};
      setLogs(Array.isArray(payload.items) ? payload.items : []);
      setTotal(Number(payload.total ?? 0));
      setWarning(payload.warning ?? null);
    } catch {
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, actionType, router]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

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
                actionType === type ? "bg-[#23856C] text-white" : "bg-[#111] border border-[#333] text-gray-400 hover:border-[#555]"
              }`}
            >
              {type === "all" ? "All" : prettyLabel(type)}
            </button>
          ))}
          <button
            onClick={load}
            className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111] border border-[#333] text-xs text-gray-300 hover:border-[#555] transition-colors whitespace-nowrap"
          >
            <RefreshIcon size={13} /> Refresh
          </button>
        </div>

        {warning === "admin_logs_table_missing" && (
          <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-300 leading-relaxed">
            admin_logs table nahi mila. Supabase SQL editor me
            <span className="font-mono"> sql/05_support_and_task_verification.sql </span>
            run karo.
          </div>
        )}

        {/* Logs list */}
        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading…</div>
        ) : (
          <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
            {logs.length === 0 ? (
              <div className="text-center text-gray-500 py-10">No logs found</div>
            ) : (
              logs.map((log, i) => {
                const details = formatDetails(log.details);
                return (
                  <div
                    key={log.id}
                    className={`px-4 py-3 ${i < logs.length - 1 ? "border-b border-[#1a1a1a]" : ""} hover:bg-[#1a1a1a] transition-colors`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-white">{log.admin_user || "System"}</span>
                          <span className={`text-xs font-semibold ${ACTION_COLORS[log.action_type] ?? "text-gray-400"}`}>
                            {prettyLabel(log.action_type)}
                          </span>
                          {log.target && (
                            <span className="text-xs text-gray-500 break-words">→ {String(log.target).slice(0, 60)}</span>
                          )}
                        </div>
                        {details && (
                          <p className="text-[11px] text-gray-600 mt-0.5 font-mono break-words">{details}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-600 whitespace-nowrap">
                        {log.created_at ? formatDateTime(log.created_at) : "—"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Total: {total} entries</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg bg-[#111] border border-[#333] disabled:opacity-40">
              <ChevronLeftIcon size={14} />
            </button>
            <span className="px-3 py-2 rounded-lg bg-[#111] border border-[#333] text-white">{page}/{totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 rounded-lg bg-[#111] border border-[#333] disabled:opacity-40">
              <ChevronRightIcon size={14} />
            </button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
