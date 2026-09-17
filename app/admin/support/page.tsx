"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon, RefreshIcon, SendIcon, SearchIcon } from "@/components/ui/DuotoneIcons";
import AdminShell from "@/components/admin/AdminShell";
import { showToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/utils";

interface TicketUser {
  first_name?: string;
  last_name?: string;
  username?: string;
  telegram_id?: string;
  status?: string;
}

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  category: string;
  priority: string;
  status: string;
  admin_reply?: string | null;
  created_at: string;
  updated_at: string;
  user: TicketUser | null;
  message_count: number;
  last_message_at: string;
  last_sender: string;
}

interface TicketMessage {
  id: string;
  sender_type: string;
  sender_name?: string;
  body: string;
  created_at: string;
}

const STATUSES = ["all", "open", "in_progress", "resolved", "closed"] as const;

const STATUS_STYLE: Record<string, string> = {
  open: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  in_progress: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  resolved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  closed: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

const PRIORITY_STYLE: Record<string, string> = {
  urgent: "text-red-400",
  high: "text-orange-400",
  normal: "text-gray-400",
  low: "text-gray-500",
};

const label = (v: string) => v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function AdminSupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ open: 0, in_progress: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);

  const [active, setActive] = useState<Ticket | null>(null);
  const [thread, setThread] = useState<TicketMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const getToken = () => localStorage.getItem("ludzo_admin_token") ?? "";
  const limit = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), status, limit: String(limit) });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/admin/support?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.status === 401) { router.replace("/admin"); return; }
      const data = await res.json();
      const payload = data?.data ?? {};
      setTickets(Array.isArray(payload.items) ? payload.items : []);
      setTotal(Number(payload.total ?? 0));
      setStats(payload.stats ?? { open: 0, in_progress: 0 });
      setWarning(data.warning ?? payload.warning ?? null);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [page, status, search, router]);

  useEffect(() => { load(); }, [load]);

  const openTicket = async (ticket: Ticket) => {
    setActive(ticket);
    setThread([]);
    setThreadLoading(true);
    try {
      const res = await fetch(`/api/admin/support?ticket_id=${ticket.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        const payload = data.data ?? {};
        setThread(Array.isArray(payload.messages) ? payload.messages : []);
        setActive((prev) => (prev ? { ...prev, ...payload, user: payload.user ?? prev.user } : payload));
      }
    } catch {
      showToast("Could not load the thread", "error");
    } finally {
      setThreadLoading(false);
    }
  };

  const sendReply = async () => {
    if (!active || reply.trim().length < 2) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/support", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ticket_id: active.id, message: reply.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        showToast(data.error ?? "Reply failed", "error");
        return;
      }
      setThread((t) => [...t, data.data]);
      setReply("");
      showToast("Reply sent", "success");
      await load();
    } catch {
      showToast("Connection error. Please try again.", "error");
    } finally {
      setSending(false);
    }
  };

  const setTicketStatus = async (ticketId: string, next: string) => {
    try {
      const res = await fetch("/api/admin/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ticket_id: ticketId, status: next }),
      });
      const data = await res.json();
      if (!data.success) { showToast(data.error ?? "Update failed", "error"); return; }
      setActive((prev) => (prev ? { ...prev, status: next } : prev));
      showToast(`Ticket marked ${label(next)}`, "success");
      await load();
    } catch {
      showToast("Connection error. Please try again.", "error");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <AdminShell title="Support">
      <div className="p-4 md:p-6 space-y-4">
        {/* Stats + refresh */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-2 rounded-xl bg-[#111] border border-[#222] text-xs text-gray-400">
            <span className="text-amber-400 font-bold">{stats.open}</span> open
          </div>
          <div className="px-3 py-2 rounded-xl bg-[#111] border border-[#222] text-xs text-gray-400">
            <span className="text-blue-400 font-bold">{stats.in_progress}</span> in progress
          </div>
          <div className="px-3 py-2 rounded-xl bg-[#111] border border-[#222] text-xs text-gray-400">
            <span className="text-white font-bold">{total}</span> matching
          </div>
          <button
            onClick={load}
            className="ml-auto flex items-center gap-2 px-3 py-2 rounded-xl bg-[#111] border border-[#333] text-xs text-gray-300 hover:border-[#555] transition-colors"
          >
            <RefreshIcon size={14} /> Refresh
          </button>
        </div>

        {warning === "support_table_missing" && (
          <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-300 leading-relaxed">
            support_tickets table nahi mila. Supabase SQL editor me
            <span className="font-mono"> sql/05_support_and_task_verification.sql </span>
            run karo, phir Refresh dabao.
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => { setStatus(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  status === s ? "bg-[#23856C] text-white" : "bg-[#111] border border-[#333] text-gray-400 hover:border-[#555]"
                }`}
              >
                {s === "all" ? "All" : label(s)}
              </button>
            ))}
          </div>
          <form
            className="md:ml-auto flex items-center gap-2 bg-[#111] border border-[#333] rounded-xl px-3 py-2"
            onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }}
          >
            <SearchIcon size={14} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subject or message"
              className="bg-transparent outline-none text-xs text-white placeholder:text-gray-600 w-full md:w-56"
            />
          </form>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center text-gray-500 py-10">Loading…</div>
        ) : tickets.length === 0 ? (
          <div className="text-center text-gray-500 py-12 bg-[#111] border border-[#222] rounded-2xl">
            No support tickets here yet
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => openTicket(t)}
                className="w-full text-left p-4 bg-[#111] border border-[#222] rounded-xl hover:border-[#333] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white truncate">{t.subject}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${STATUS_STYLE[t.status] ?? STATUS_STYLE.open}`}>
                        {label(t.status)}
                      </span>
                      <span className={`text-[10px] font-bold uppercase ${PRIORITY_STYLE[t.priority] ?? "text-gray-400"}`}>
                        {t.priority}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#222] text-gray-400">{label(t.category)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.message}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-600">
                      <span className="text-gray-400 font-semibold">
                        {t.user ? (t.user.username ? `@${t.user.username}` : t.user.first_name ?? "User") : "Unknown user"}
                      </span>
                      {t.user?.telegram_id && <span className="font-mono">ID {t.user.telegram_id}</span>}
                      <span>{t.message_count} message{t.message_count === 1 ? "" : "s"}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-600 whitespace-nowrap">{formatDateTime(t.last_message_at)}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Total: {total} tickets</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-[#111] border border-[#333] disabled:opacity-40"
            >
              <ChevronLeftIcon size={14} />
            </button>
            <span className="px-3 py-2 rounded-lg bg-[#111] border border-[#333] text-white">{page}/{totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg bg-[#111] border border-[#333] disabled:opacity-40"
            >
              <ChevronRightIcon size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Ticket detail modal */}
      {active && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center overflow-y-auto p-4">
          <div className="w-full max-w-2xl bg-[#111] border border-[#333] rounded-2xl my-6">
            {/* Header */}
            <div className="flex items-start gap-3 p-5 border-b border-[#222]">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white">{active.subject}</h3>
                <div className="flex items-center gap-2 flex-wrap mt-1.5 text-[10px] text-gray-500">
                  <span className={`px-2 py-0.5 rounded-full border font-semibold ${STATUS_STYLE[active.status] ?? STATUS_STYLE.open}`}>
                    {label(active.status)}
                  </span>
                  <span className="bg-[#222] px-2 py-0.5 rounded-full text-gray-400">{label(active.category)}</span>
                  <span className="text-gray-400 font-semibold">
                    {active.user ? (active.user.username ? `@${active.user.username}` : active.user.first_name ?? "User") : "Unknown"}
                  </span>
                  {active.user?.telegram_id && <span className="font-mono">ID {active.user.telegram_id}</span>}
                  <span>{formatDateTime(active.created_at)}</span>
                </div>
              </div>
              <button onClick={() => setActive(null)} className="text-gray-500 hover:text-white text-lg leading-none">✕</button>
            </div>

            {/* Thread */}
            <div className="p-5 space-y-3 max-h-[46vh] overflow-y-auto">
              {threadLoading ? (
                <div className="text-center text-gray-500 text-xs py-6">Loading thread…</div>
              ) : thread.length === 0 ? (
                <div className="bg-[#1a1a1a] border border-[#262626] rounded-xl p-3">
                  <div className="text-[10px] text-gray-500 mb-1">User · {formatDateTime(active.created_at)}</div>
                  <p className="text-xs text-gray-200 whitespace-pre-wrap">{active.message}</p>
                </div>
              ) : (
                thread.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-xl p-3 border ${
                      m.sender_type === "admin"
                        ? "bg-[#23856C]/10 border-[#23856C]/30 ml-6"
                        : "bg-[#1a1a1a] border-[#262626] mr-6"
                    }`}
                  >
                    <div className="text-[10px] text-gray-500 mb-1">
                      {m.sender_type === "admin" ? `Support · ${m.sender_name ?? "admin"}` : `User · ${m.sender_name ?? ""}`} · {formatDateTime(m.created_at)}
                    </div>
                    <p className="text-xs text-gray-200 whitespace-pre-wrap">{m.body}</p>
                  </div>
                ))
              )}
            </div>

            {/* Reply box */}
            <div className="p-5 border-t border-[#222] space-y-3">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                placeholder="Type your reply…"
                className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-white text-sm outline-none focus:border-[#23856C] resize-none"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={sendReply}
                  disabled={sending || reply.trim().length < 2}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#23856C] text-white text-sm font-bold hover:bg-[#196A55] transition-colors disabled:opacity-50"
                >
                  <SendIcon size={14} /> {sending ? "Sending…" : "Send reply"}
                </button>
                <div className="ml-auto flex flex-wrap gap-2">
                  {["in_progress", "resolved", "closed"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setTicketStatus(active.id, s)}
                      className="px-3 py-2 rounded-xl bg-[#1a1a1a] border border-[#333] text-xs text-gray-300 hover:border-[#555] transition-colors"
                    >
                      Mark {label(s)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
