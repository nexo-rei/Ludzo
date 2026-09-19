"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import AdminShell from "@/components/admin/AdminShell";
import { SkeletonCard } from "@/components/ui/Skeleton";
import SymbolIcon from "@/components/ui/SymbolIcon";
import { showToast } from "@/components/ui/Toast";
import { useAdminUser, isModeratorUser } from "@/hooks/useAdminUser";
import { formatDateTime } from "@/lib/utils";
import {
  ActivityIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  CloseCircleIcon,
  LifeBuoyIcon,
  LoaderIcon,
  RefreshIcon,
  ShieldIcon,
  WrenchIcon,
  ZapIcon,
} from "@/components/ui/DuotoneIcons";

/* ══════════════════════════════════════════════════════════════════════════
 * System / Bot Health — SIRF full admin (moderator ko nav me dikhta hi nahi,
 * API bhi 403 deta hai). Auto-refresh har 20s me live data.
 * ══════════════════════════════════════════════════════════════════════════ */

interface HourlyRow {
  hour: number;
  requests: number;
  ad_plays: number;
  matches: number;
  signups: number;
}

interface DailyTrendRow {
  day: string;
  signups: number;
  matches: number;
  ad_plays: number;
  requests: number;
}

interface SystemData {
  live: {
    active_users?: number;
    active_users_window_min?: number;
    active_matches?: number;
    countdown_matches?: number;
    queue_waiting?: number;
    signups_today?: number;
    matches_today?: number;
    ad_plays_today?: number;
    daily_trend?: DailyTrendRow[];
    peak_hours?: HourlyRow[];
  };
  quota: {
    daily_limit?: number;
    used_today?: number;
    api_today?: number;
    game_polls_today?: number;
    match_actions_today?: number;
    remaining?: number;
    percent_used?: number;
    requests_per_minute?: number;
    requests_per_minute_15m?: number;
    current_rate_rpm?: number;
    eta_iso?: string | null;
    eta_minutes?: number | null;
    projected_today?: number;
    will_hit_limit_today?: boolean;
    counting_since?: string | null;
    history?: Array<{
      date: string;
      api_requests: number;
      game_polls: number;
      match_actions: number;
      total: number;
    }>;
  };
  db: {
    size_mb?: number;
    size_bytes?: number;
    percent_used?: number;
    free_limit_mb?: number;
    top_tables?: Array<{
      table_name: string;
      total_mb: number;
      index_mb: number;
      row_estimate: number;
    }>;
    connections?: { total: number; active: number; idle: number; max: number };
  };
  telegram: {
    online?: boolean;
    token_configured?: boolean;
    bot_username?: string | null;
    webhook_url?: string;
    webhook_set?: boolean;
    pending_update_count?: number;
    last_error_message?: string | null;
    last_error_date?: string | null;
    max_connections?: number | null;
    error?: string;
    webhook_error?: string;
  };
  capacity: {
    active_users?: number;
    active_matches?: number;
    queue_waiting?: number;
    max_concurrent_users?: number;
    max_concurrent_matches?: number;
    max_queue_capacity?: number;
    enforcement?: "block" | "warn";
    server_full_message?: string;
    users_over?: boolean;
    matches_over?: boolean;
    queue_over?: boolean;
    any_over?: boolean;
  };
  errors?: Array<{ section: string; error: string }>;
  generated_at?: string;
}

interface CapacityForm {
  max_concurrent_users: number;
  max_concurrent_matches: number;
  max_queue_capacity: number;
  capacity_enforcement: "block" | "warn";
  server_full_message: string;
}

const DEFAULT_FORM: CapacityForm = {
  max_concurrent_users: 200,
  max_concurrent_matches: 100,
  max_queue_capacity: 500,
  capacity_enforcement: "warn",
  server_full_message:
    "LUDZO servers are at full capacity right now. Please try again in a few minutes!",
};

const REFRESH_INTERVAL_MS = 20_000;
const CF_DAILY_LIMIT = 100_000;

/* ─── chhote helpers ──────────────────────────────────────────────────────── */

const fmt = (n?: number | null) => (n ?? 0).toLocaleString();

const fmtMB = (mb?: number | null) =>
  mb == null ? "—" : mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;

function quotaColor(pct: number): string {
  if (pct >= 85) return "#EF4444";
  if (pct >= 60) return "#F59E0B";
  return "#23856C";
}

function etaLabel(q: SystemData["quota"]): { text: string; danger: boolean } {
  const used = q.used_today ?? 0;
  if (used >= CF_DAILY_LIMIT) {
    return { text: "⚠️ Quota khatam — app aaj Error 1027 de sakta hai!", danger: true };
  }
  const rate = q.current_rate_rpm ?? 0;
  if (rate <= 0 || !q.eta_iso) {
    return { text: "Abhi traffic nahi chal raha — quota safe hai", danger: false };
  }
  const eta = new Date(q.eta_iso);
  const time = eta.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (q.will_hit_limit_today) {
    const mins = q.eta_minutes ?? 0;
    const dur = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
    return {
      text: `⚠️ Current rate (${rate}/min) pe quota ~${time} (${dur} baad) khatam ho jayega`,
      danger: true,
    };
  }
  return {
    text: `✅ Aaj ka projection: ${fmt(q.projected_today)} / ${fmt(CF_DAILY_LIMIT)} — quota bach jayega`,
    danger: false,
  };
}

function hourLabel(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

/* ─── page ────────────────────────────────────────────────────────────────── */

export default function AdminSystemPage() {
  const router = useRouter();
  const { user, loading: meLoading } = useAdminUser();
  const isMod = isModeratorUser(user);

  const [data, setData] = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [peakMetric, setPeakMetric] = useState<"requests" | "ad_plays" | "matches" | "signups">("requests");

  const [form, setForm] = useState<CapacityForm>(DEFAULT_FORM);
  const [formDirty, setFormDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  // Ref version — taaki form edit karne se load() ka identity change na ho
  // (warna har keystroke pe ek aur API fetch trigger hota).
  const formDirtyRef = useRef(false);

  const getToken = () => localStorage.getItem("ludzo_admin_token") ?? "";

  // Moderator / unauthenticated ko ye page allowed nahi — dashboard pe wapas.
  // (Asli protection API me 403 hai — ye sirf UX.)
  useEffect(() => {
    if (!meLoading && (!user || isMod)) router.replace(isMod ? "/admin/dashboard" : "/admin");
  }, [meLoading, user, isMod, router]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/system", {
        headers: { Authorization: `Bearer ${getToken()}` } ,
      });
      if (res.status === 401) { router.replace("/admin"); return; }
      const json = await res.json();
      if (json.success) {
        setData(json.data as SystemData);
        setLastUpdated(new Date());
        // Form ko sync karo jab tak admin ne khud edit na kiya ho.
        if (!formDirtyRef.current && json.data.capacity) {
          const c = json.data.capacity;
          setForm((f) => ({
            ...f,
            max_concurrent_users: c.max_concurrent_users ?? f.max_concurrent_users,
            max_concurrent_matches: c.max_concurrent_matches ?? f.max_concurrent_matches,
            max_queue_capacity: c.max_queue_capacity ?? f.max_queue_capacity,
            capacity_enforcement: c.enforcement === "block" ? "block" : "warn",
            server_full_message: c.server_full_message || f.server_full_message,
          }));
        }
      }
    } catch { /* silent — agli auto-refresh me phir try hoga */ }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    if (!meLoading && user && !isMod) load();
  }, [load, meLoading, user, isMod]);

  // Auto-refresh — har 20s (tab background me ho to skip, agli visibility pe turant).
  useEffect(() => {
    if (!autoRefresh || isMod || !user) return;
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      load();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [autoRefresh, load, isMod, user]);

  const saveCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/system", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Capacity settings saved", "success");
        setFormDirty(false);
        formDirtyRef.current = false;
        await load();
      } else {
        showToast(json.error ?? "Save failed", "error");
      }
    } catch {
      showToast("Connection error", "error");
    } finally {
      setSaving(false);
    }
  };

  const setFormValue = <K extends keyof CapacityForm>(key: K, value: CapacityForm[K]) => {
    setFormDirty(true);
    formDirtyRef.current = true;
    setForm((f) => ({ ...f, [key]: value }));
  };

  /* ─── derived ───────────────────────────────────────────────────────────── */

  const q = data?.quota ?? {};
  const used = q.used_today ?? 0;
  const pct = Math.min(100, q.percent_used ?? 0);
  const qColor = quotaColor(pct);
  const eta = etaLabel(q);

  const live = data?.live ?? {};
  const liveCards = [
    { label: `Active Users (${live.active_users_window_min ?? 5}m)`, value: fmt(live.active_users), icon: "users", color: "#23856C" },
    { label: "In Queue", value: fmt(live.queue_waiting), icon: "clock", color: "#F59E0B" },
    { label: "Live Matches", value: fmt(live.active_matches), icon: "dice", color: "#63D9B4" },
    { label: "Starting…", value: fmt(live.countdown_matches), icon: "bolt", color: "#38BDF8" },
    { label: "Signups Today", value: fmt(live.signups_today), icon: "star", color: "#63D9B4" },
    { label: "Matches Today", value: fmt(live.matches_today), icon: "target", color: "#23856C" },
    { label: "Ad Plays Today", value: fmt(live.ad_plays_today), icon: "fast", color: "#F59E0B" },
    { label: "Req / min", value: fmt(q.requests_per_minute), icon: "activity", color: "#38BDF8" },
  ];

  const peakData = (live.peak_hours ?? []).map((h) => ({
    name: hourLabel(h.hour),
    requests: h.requests,
    ad_plays: h.ad_plays,
    matches: h.matches,
    signups: h.signups,
  }));
  const peakHour = peakData.reduce(
    (best, r) => ((r[peakMetric] ?? 0) > (best?.[peakMetric] ?? 0) ? r : best),
    peakData[0]
  );

  const quotaHistory = (q.history ?? []).map((d) => ({
    name: d.date.slice(5),
    total: d.total,
    polls: d.game_polls,
  }));

  const dbData = data?.db ?? {};
  const dbPct = Math.min(100, dbData.percent_used ?? 0);
  const telegram = data?.telegram ?? {};
  const capacity = data?.capacity ?? {};
  const sectionErrors = data?.errors ?? [];

  /* ─── render ────────────────────────────────────────────────────────────── */

  const SectionTitle = ({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) => (
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 rounded-xl bg-[#23856C]/10 border border-[#23856C]/30 text-[#63D9B4]">{icon}</div>
      <div>
        <h2 className="text-sm font-black text-white tracking-tight">{title}</h2>
        {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );

  const StatCard = ({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) => (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#111] border border-[#222] rounded-2xl p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl" style={{ color }}><SymbolIcon name={icon} /></span>
      </div>
      <motion.div
        key={value}
        initial={{ opacity: 0.4 }}
        animate={{ opacity: 1 }}
        className="text-xl font-black text-white font-numeric"
      >
        {value}
      </motion.div>
      <div className="text-[11px] text-gray-500 mt-0.5">{label}</div>
    </motion.div>
  );

  return (
    <AdminShell title="System / Bot Health">
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-6">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="p-4 md:p-6 space-y-8 pb-10 max-w-[1200px]">

          {/* ── Header: live indicator + controls ─────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3">
            <motion.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2.5 h-2.5 rounded-full bg-[#10B981]"
            />
            <div className="text-xs text-gray-400 font-medium">
              Live snapshot
              {lastUpdated && <span className="text-gray-600"> · updated {lastUpdated.toLocaleTimeString()}</span>}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setAutoRefresh((v) => !v)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                  autoRefresh
                    ? "bg-[#23856C]/15 border-[#23856C]/40 text-[#63D9B4]"
                    : "bg-[#111] border-[#222] text-gray-400"
                }`}
              >
                Auto {autoRefresh ? "ON" : "OFF"}
              </button>
              <button
                onClick={() => { setLoading(true); load(); }}
                className="p-2 rounded-xl bg-[#111] border border-[#222] text-gray-400 hover:text-white hover:border-[#333] transition-all"
                aria-label="Refresh now"
              >
                <RefreshIcon size={14} />
              </button>
            </div>
          </div>

          {/* Partial-failure banner — koi section error ho to baki data dikhe */}
          {sectionErrors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/25 rounded-2xl p-4"
            >
              <AlertTriangleIcon size={18} className="text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-gray-300">
                <span className="font-bold text-yellow-300">Kuch sections fail hue:</span>{" "}
                {sectionErrors.map((e) => `${e.section} — ${e.error}`).join(" · ")}
                <div className="text-gray-500 mt-1">
                  sql/11_system_health.sql run kiya? (Supabase → SQL Editor)
                </div>
              </div>
            </motion.div>
          )}

          {/* Quota red alert — sabse pehle dikho */}
          {pct >= 85 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-4"
            >
              <AlertTriangleIcon size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-red-300 font-bold">
                Cloudflare quota {pct.toFixed(1)}% use ho chuka hai — {fmt(q.remaining)} requests bache.
                Cross hote hi Error 1027 ke saath app us din ke liye band ho jayega.
              </div>
            </motion.div>
          )}

          {/* ═══════════ 1. LIVE LOAD ═══════════ */}
          <section>
            <SectionTitle
              icon={<ActivityIcon size={18} />}
              title="Live Load"
              sub="Realtime snapshot — active users last 5 min (users.last_seen), live rooms, queue, aaj ke numbers"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {liveCards.map((c) => (
                <StatCard key={c.label} {...c} />
              ))}
            </div>

            {/* Peak hours chart */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-[#111] border border-[#222] rounded-2xl p-4"
            >
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="text-xs font-bold text-white">Peak Hours</div>
                <div className="text-[11px] text-gray-500">last 7 days · hour-wise (UTC)</div>
                {peakHour && (peakHour[peakMetric] ?? 0) > 0 && (
                  <div className="text-[11px] text-[#63D9B4] font-semibold ml-1">
                    · busiest ~{peakHour.name}
                  </div>
                )}
                <div className="ml-auto flex gap-1">
                  {(["requests", "ad_plays", "matches", "signups"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setPeakMetric(m)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${
                        peakMetric === m
                          ? "bg-[#23856C]/20 text-[#63D9B4] border border-[#23856C]/40"
                          : "bg-[#1a1a1a] text-gray-500 border border-[#222] hover:text-gray-300"
                      }`}
                    >
                      {m === "ad_plays" ? "Ads" : m === "requests" ? "Requests" : m === "matches" ? "Matches" : "Signups"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-56 -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={peakData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                    <CartesianGrid stroke="#222" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#666", fontSize: 10 }}
                      interval={2}
                      axisLine={{ stroke: "#222" }}
                      tickLine={false}
                    />
                    <YAxis tick={{ fill: "#666", fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
                    <Tooltip
                      cursor={{ fill: "rgba(35,133,108,0.08)" }}
                      contentStyle={{
                        background: "#111",
                        border: "1px solid #222",
                        borderRadius: 12,
                        fontSize: 11,
                        color: "#fff",
                      }}
                    />
                    <Bar dataKey={peakMetric} fill="#23856C" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </section>

          {/* ═══════════ 2. CLOUDFLARE REQUEST QUOTA ═══════════ */}
          <section>
            <SectionTitle
              icon={<ZapIcon size={18} />}
              title="Cloudflare Request Quota"
              sub="FREE plan = 100,000 requests/day — cross hote hi Error 1027 se app band"
            />
            <div className="bg-[#111] border border-[#222] rounded-2xl p-4 md:p-5 space-y-4">
              {/* Progress bar */}
              <div>
                <div className="flex items-end justify-between mb-2">
                  <div className="text-2xl font-black text-white font-numeric">
                    {fmt(used)}
                    <span className="text-sm text-gray-500 font-bold"> / {fmt(CF_DAILY_LIMIT)}</span>
                  </div>
                  <div className="text-lg font-black font-numeric" style={{ color: qColor }}>
                    {pct.toFixed(1)}%
                  </div>
                </div>
                <div className="h-3.5 rounded-full bg-[#1a1a1a] border border-[#222] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${qColor}88, ${qColor})` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(pct, used > 0 ? 2 : 0)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                <div className="text-[11px] mt-2 font-medium" style={{ color: eta.danger ? "#F87171" : "#63D9B4" }}>
                  {eta.text}
                </div>
                {q.counting_since && (
                  <div className="text-[10px] text-gray-600 mt-1">
                    Counter {q.counting_since} se chal raha hai (migration deploy hone ke baad se hi count hota hai)
                  </div>
                )}
              </div>

              {/* Breakdown + rate */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-3">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Game Polling</div>
                  <div className="text-lg font-black text-[#63D9B4] font-numeric mt-1">{fmt(q.game_polls_today)}</div>
                  <div className="text-[10px] text-gray-600">1.2s room-state poll</div>
                </div>
                <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-3">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Match Actions</div>
                  <div className="text-lg font-black text-white font-numeric mt-1">{fmt(q.match_actions_today)}</div>
                  <div className="text-[10px] text-gray-600">roll / move / queue</div>
                </div>
                <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-3">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Other API</div>
                  <div className="text-lg font-black text-white font-numeric mt-1">{fmt(q.api_today)}</div>
                  <div className="text-[10px] text-gray-600">home / ads / profile…</div>
                </div>
                <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-3">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Req / minute</div>
                  <div className="text-lg font-black text-white font-numeric mt-1">{fmt(q.requests_per_minute)}</div>
                  <div className="text-[10px] text-gray-600">
                    15-min avg: {fmt(q.requests_per_minute_15m)}
                  </div>
                </div>
              </div>

              {/* 7-day history */}
              {quotaHistory.length > 1 && (
                <div className="pt-2">
                  <div className="text-xs font-bold text-white mb-2">Last 7 days</div>
                  <div className="h-36 -ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={quotaHistory} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                        <CartesianGrid stroke="#222" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: "#666", fontSize: 10 }} axisLine={{ stroke: "#222" }} tickLine={false} />
                        <YAxis tick={{ fill: "#666", fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
                        <Tooltip
                          cursor={{ fill: "rgba(35,133,108,0.08)" }}
                          contentStyle={{
                            background: "#111", border: "1px solid #222", borderRadius: 12, fontSize: 11, color: "#fff",
                          }}
                        />
                        <Bar dataKey="total" name="requests" fill="#23856C" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ═══════════ 3. DATABASE HEALTH ═══════════ */}
          <section>
            <SectionTitle
              icon={<WrenchIcon size={18} />}
              title="Database Health"
              sub="Supabase FREE plan — 500 MB limit, connection pool, top tables by size"
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Size */}
              <div className="bg-[#111] border border-[#222] rounded-2xl p-4">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide mb-2">DB Size</div>
                <div className="text-2xl font-black text-white font-numeric">{fmtMB(dbData.size_mb)}</div>
                <div className="text-[11px] text-gray-500">/ {dbData.free_limit_mb ?? 500} MB free limit</div>
                <div className="h-2.5 rounded-full bg-[#1a1a1a] border border-[#222] overflow-hidden mt-3">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: quotaColor(dbPct) }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(dbPct, 0.5)}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
                <div className="text-[11px] text-gray-500 mt-1.5 font-numeric">{dbPct.toFixed(1)}% used</div>
              </div>

              {/* Connections */}
              <div className="bg-[#111] border border-[#222] rounded-2xl p-4">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide mb-2">Connections</div>
                <div className="text-2xl font-black text-white font-numeric">
                  {fmt(dbData.connections?.total)}
                  <span className="text-sm text-gray-500 font-bold"> / {fmt(dbData.connections?.max)}</span>
                </div>
                <div className="flex gap-4 mt-3 text-[11px]">
                  <div>
                    <span className="text-[#63D9B4] font-bold font-numeric">{fmt(dbData.connections?.active)}</span>
                    <span className="text-gray-500"> active</span>
                  </div>
                  <div>
                    <span className="text-gray-300 font-bold font-numeric">{fmt(dbData.connections?.idle)}</span>
                    <span className="text-gray-500"> idle</span>
                  </div>
                </div>
                <div className="text-[10px] text-gray-600 mt-3">pg_stat_activity se live count</div>
              </div>

              {/* Top tables */}
              <div className="bg-[#111] border border-[#222] rounded-2xl p-4 lg:col-span-1 overflow-x-auto">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide mb-2">Top Tables</div>
                <div className="space-y-1.5 min-w-[220px]">
                  {(dbData.top_tables ?? []).slice(0, 6).map((t, i) => (
                    <div key={t.table_name} className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-300 font-mono truncate max-w-[130px]">{t.table_name}</span>
                      <span className="text-gray-500 font-numeric flex-shrink-0">
                        {fmtMB(t.total_mb)} · {fmt(t.row_estimate)} rows
                      </span>
                    </div>
                  ))}
                  {(dbData.top_tables ?? []).length === 0 && (
                    <div className="text-[11px] text-gray-600">—</div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ═══════════ 4. TELEGRAM BOT HEALTH ═══════════ */}
          <section>
            <SectionTitle
              icon={<LifeBuoyIcon size={18} />}
              title="Telegram Bot"
              sub="getWebhookInfo + getMe — webhook URL, pending updates, last delivery error"
            />
            <div className="bg-[#111] border border-[#222] rounded-2xl p-4 md:p-5">
              <div className="flex flex-wrap items-center gap-4">
                {/* Status indicator */}
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={
                      telegram.online
                        ? { scale: [1, 1.15, 1], opacity: [1, 0.7, 1] }
                        : { scale: 1, opacity: 1 }
                    }
                    transition={{ duration: 2, repeat: telegram.online ? Infinity : 0 }}
                    className={`w-3.5 h-3.5 rounded-full ${telegram.online ? "bg-[#10B981]" : "bg-red-500"}`}
                  />
                  <div>
                    <div className={`text-sm font-black ${telegram.online ? "text-[#10B981]" : "text-red-400"}`}>
                      {telegram.online ? "Bot Online" : "Bot Down"}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {telegram.bot_username ? `@${telegram.bot_username}` : "TELEGRAM_BOT_TOKEN"}
                    </div>
                  </div>
                </div>

                {telegram.online ? (
                  <CheckCircleIcon size={20} className="text-[#10B981]" />
                ) : (
                  <CloseCircleIcon size={20} className="text-red-400" />
                )}
                {telegram.error && (
                  <div className="text-[11px] text-red-300 font-medium">{telegram.error}</div>
                )}
                {telegram.webhook_error && (
                  <div className="text-[11px] text-yellow-400 font-medium">{telegram.webhook_error}</div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-3">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Webhook URL</div>
                  <div className="text-[11px] text-gray-300 font-mono mt-1 break-all">
                    {telegram.webhook_url || "— set nahi hai —"}
                  </div>
                </div>
                <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-3">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Pending Updates</div>
                  <div className={`text-lg font-black font-numeric mt-1 ${
                    (telegram.pending_update_count ?? 0) > 100 ? "text-yellow-400" : "text-white"
                  }`}>
                    {fmt(telegram.pending_update_count)}
                  </div>
                  <div className="text-[10px] text-gray-600">
                    {telegram.max_connections ? `max_connections: ${telegram.max_connections}` : ""}
                  </div>
                </div>
                <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-3">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Last Webhook Error</div>
                  {telegram.last_error_message ? (
                    <>
                      <div className="text-[11px] text-red-300 mt-1 break-words">{telegram.last_error_message}</div>
                      {telegram.last_error_date && (
                        <div className="text-[10px] text-gray-600 mt-1">{formatDateTime(telegram.last_error_date)}</div>
                      )}
                    </>
                  ) : (
                    <div className="text-[11px] text-[#63D9B4] mt-1">Koi error nahi ✅</div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ═══════════ 5. CAPACITY CONTROLS ═══════════ */}
          <section>
            <SectionTitle
              icon={<ShieldIcon size={18} />}
              title="Capacity Controls"
              sub="Limits settings table me save hoti hain — har change admin_logs me jaata hai"
            />

            {/* Over-capacity alert — warn mode ka red alert yahi hai */}
            {capacity.any_over && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-4"
              >
                <AlertTriangleIcon size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-red-300">
                  <span className="font-bold">Over capacity:</span>{" "}
                  {[
                    capacity.users_over && `users ${fmt(capacity.active_users)}/${fmt(capacity.max_concurrent_users)}`,
                    capacity.matches_over && `matches ${fmt(capacity.active_matches)}/${fmt(capacity.max_concurrent_matches)}`,
                    capacity.queue_over && `queue ${fmt(capacity.queue_waiting)}/${fmt(capacity.max_queue_capacity)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  {capacity.enforcement === "warn" && (
                    <span className="text-yellow-300"> — Warning only mode ON hai, users block NAHI ho rahe.</span>
                  )}
                </div>
              </motion.div>
            )}

            <form ref={formRef} onSubmit={saveCapacity} className="bg-[#111] border border-[#222] rounded-2xl p-4 md:p-5 space-y-5">
              {/* Limits */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {([
                  { key: "max_concurrent_users" as const, label: "Max Concurrent Users", hint: `abhi: ${fmt(capacity.active_users)} active · 0 = unlimited` },
                  { key: "max_concurrent_matches" as const, label: "Max Concurrent Matches", hint: `abhi: ${fmt(capacity.active_matches)} live · 0 = unlimited` },
                  { key: "max_queue_capacity" as const, label: "Queue Capacity", hint: `abhi: ${fmt(capacity.queue_waiting)} waiting · 0 = unlimited` },
                ]).map((f) => (
                  <div key={f.key}>
                    <label className="text-xs text-gray-400 font-medium">{f.label}</label>
                    <input
                      type="number"
                      min={0}
                      max={100000}
                      step={1}
                      value={form[f.key]}
                      onChange={(e) => setFormValue(f.key, Math.max(0, Number(e.target.value) || 0))}
                      className="w-full mt-1 px-3 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-white text-sm outline-none focus:border-[#23856C] font-numeric"
                    />
                    <div className="text-[10px] text-gray-600 mt-1">{f.hint}</div>
                  </div>
                ))}
              </div>

              {/* Enforcement toggle */}
              <div>
                <label className="text-xs text-gray-400 font-medium">Enforcement</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setFormValue("capacity_enforcement", "block")}
                    className={`px-4 py-3 rounded-xl text-left border transition-all ${
                      form.capacity_enforcement === "block"
                        ? "bg-red-500/10 border-red-500/40"
                        : "bg-[#1a1a1a] border-[#333] hover:border-[#444]"
                    }`}
                  >
                    <div className={`text-xs font-bold ${form.capacity_enforcement === "block" ? "text-red-300" : "text-gray-300"}`}>
                      🚫 Block new users
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      Limit cross → naye users ko server-full screen, queue join reject
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormValue("capacity_enforcement", "warn")}
                    className={`px-4 py-3 rounded-xl text-left border transition-all ${
                      form.capacity_enforcement === "warn"
                        ? "bg-yellow-500/10 border-yellow-500/40"
                        : "bg-[#1a1a1a] border-[#333] hover:border-[#444]"
                    }`}
                  >
                    <div className={`text-xs font-bold ${form.capacity_enforcement === "warn" ? "text-yellow-300" : "text-gray-300"}`}>
                      ⚠️ Warning only
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      Koi user block nahi hota — sirf is page pe red alert dikhega
                    </div>
                  </button>
                </div>
              </div>

              {/* Server-full message */}
              <div>
                <label className="text-xs text-gray-400 font-medium">
                  Server-Full Message (block mode me users ko yahi dikhega)
                </label>
                <textarea
                  rows={2}
                  maxLength={300}
                  value={form.server_full_message}
                  onChange={(e) => setFormValue("server_full_message", e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-white text-sm outline-none focus:border-[#23856C] resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-[#23856C] hover:bg-[#1d6b56] disabled:opacity-60 text-white text-xs font-black uppercase tracking-wide transition-all flex items-center gap-2"
                >
                  {saving && <LoaderIcon size={14} className="animate-spin" />}
                  {saving ? "Saving…" : "Save Capacity Settings"}
                </button>
                {formDirty && <span className="text-[11px] text-yellow-400">Unsaved changes</span>}
              </div>
            </form>
          </section>
        </div>
      )}
    </AdminShell>
  );
}
