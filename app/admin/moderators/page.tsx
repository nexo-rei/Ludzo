"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import AdminShell from "@/components/admin/AdminShell";
import Badge from "@/components/ui/Badge";
import { showToast } from "@/components/ui/Toast";
import { useAdminUser, isModeratorUser } from "@/hooks/useAdminUser";
import { formatDateTime } from "@/lib/utils";
import {
  CheckCircleIcon,
  CloseCircleIcon,
  LockIcon,
  PlusIcon,
  RefreshIcon,
  ShieldIcon,
  TrashIcon,
} from "@/components/ui/DuotoneIcons";

interface Moderator {
  id: string;
  username: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const CAN_DO = [
  "Support tickets — thread padhna, reply bhejna, status change",
  "Withdrawal requests dekhna (pending queue monitor karna)",
  "Users list — Today / All / Active / Suspended filters",
  "Limited dashboard (sirf counts, koi revenue data nahi)",
];

const CANNOT_DO = [
  "Withdrawal approve / reject / mark-paid (paisa)",
  "Wallet adjustments — coins ya USDT add/remove",
  "User suspend / unsuspend",
  "Deposits, Tasks, Announcements, Broadcast",
  "Settings, Logs, Moderator management",
];

export default function AdminModeratorsPage() {
  const router = useRouter();
  const { user, loading: meLoading } = useAdminUser();

  const [items, setItems] = useState<Moderator[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<Moderator | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const getToken = () => localStorage.getItem("ludzo_admin_token") ?? "";

  // Moderators ko ye page allowed hi nahi — dashboard pe wapas.
  useEffect(() => {
    if (!meLoading && (!user || isModeratorUser(user))) router.replace("/admin/dashboard");
  }, [meLoading, user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/moderators", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.status === 401) { router.replace("/admin"); return; }
      const data = await res.json();
      if (data.success) setItems(data.data.items ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    if (!meLoading && user && !isModeratorUser(user)) load();
  }, [load, meLoading, user]);

  const createModerator = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/admin/moderators", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Moderator @${username.trim()} created`, "success");
        setUsername("");
        setPassword("");
        await load();
      } else {
        showToast(data.error ?? "Could not create moderator", "error");
      }
    } catch { showToast("Connection error", "error"); }
    finally { setCreating(false); }
  };

  const doAction = async (
    mod: Moderator,
    action: "activate" | "deactivate" | "delete" | "reset_password",
    newPassword?: string
  ) => {
    setBusyId(mod.id);
    try {
      const res = await fetch("/api/admin/moderators", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ moderator_id: mod.id, action, password: newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          action === "delete" ? `@${mod.username} deleted`
          : action === "reset_password" ? `Password reset for @${mod.username}`
          : `@${mod.username} ${action === "activate" ? "activated" : "deactivated"}`,
          "success"
        );
        setResetTarget(null);
        setResetPassword("");
        await load();
      } else {
        showToast(data.error ?? "Action failed", "error");
      }
    } catch { showToast("Connection error", "error"); }
    finally { setBusyId(null); }
  };

  // Jab tak role confirm na ho (ya moderator ho), kuch mat dikhao.
  if (meLoading || !user || isModeratorUser(user)) {
    return (
      <AdminShell title="Moderators">
        <div className="p-6 text-sm text-gray-500">Loading…</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Moderators">
      <div className="p-4 md:p-6 space-y-4 max-w-5xl">
        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111] border border-[#222] rounded-2xl p-5"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 flex items-center justify-center">
              <ShieldIcon size={18} className="text-sky-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">Moderator Team</h2>
              <p className="text-[11px] text-gray-500">
                Limited-access staff accounts — same /admin login, alag chhota panel.
              </p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3 mt-4">
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-3">
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide mb-2">Moderator kar sakta hai</div>
              <ul className="space-y-1.5">
                {CAN_DO.map((t) => (
                  <li key={t} className="flex gap-2 text-xs text-gray-400">
                    <CheckCircleIcon size={13} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-3">
              <div className="text-[10px] font-bold text-red-400 uppercase tracking-wide mb-2">Moderator kabhi nahi kar sakta</div>
              <ul className="space-y-1.5">
                {CANNOT_DO.map((t) => (
                  <li key={t} className="flex gap-2 text-xs text-gray-400">
                    <CloseCircleIcon size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Create form */}
        <motion.form
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onSubmit={createModerator}
          className="bg-[#111] border border-[#222] rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-center gap-2">
            <PlusIcon size={15} className="text-[#63D9B4]" />
            <h3 className="text-white font-bold text-sm">New Moderator</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-500 font-medium">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="mod_rahul"
                minLength={3}
                maxLength={32}
                required
                className="w-full mt-1 px-3 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-white text-sm outline-none focus:border-[#23856C] transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 font-medium">Password (min 8 chars)</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={8}
                  maxLength={128}
                  required
                  className="w-full px-3 py-2.5 pr-10 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-white text-sm outline-none focus:border-[#23856C] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  <LockIcon size={14} />
                </button>
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={creating || !username.trim() || password.length < 8}
            className="px-5 py-2.5 rounded-xl bg-[#23856C] hover:bg-[#196A55] text-white text-sm font-bold transition-colors disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create Moderator"}
          </button>
        </motion.form>

        {/* List */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
            <h3 className="text-white font-bold text-sm">Team ({items.length})</h3>
            <button onClick={load} className="text-gray-500 hover:text-white transition-colors" title="Refresh">
              <RefreshIcon size={15} />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-10 text-sm text-gray-500">Loading…</div>
          ) : items.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-500">
              Abhi koi moderator nahi hai. Upar se pehla moderator banao.
            </div>
          ) : (
            <ul className="divide-y divide-[#1a1a1a]">
              <AnimatePresence initial={false}>
                {items.map((m, i) => (
                  <motion.li
                    key={m.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ delay: i * 0.03 }}
                    className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center flex-shrink-0">
                        <ShieldIcon size={14} className="text-sky-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-white text-sm font-semibold truncate">@{m.username}</div>
                        <div className="text-[11px] text-gray-500">Joined {formatDateTime(m.created_at)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={m.is_active ? "success" : "error"} size="sm">
                        {m.is_active ? "active" : "disabled"}
                      </Badge>
                      <button
                        onClick={() => doAction(m, m.is_active ? "deactivate" : "activate")}
                        disabled={busyId === m.id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                          m.is_active
                            ? "bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25"
                            : "bg-green-500/15 text-green-400 hover:bg-green-500/25"
                        }`}
                      >
                        {m.is_active ? "Disable" : "Enable"}
                      </button>
                      <button
                        onClick={() => { setResetTarget(m); setResetPassword(""); }}
                        disabled={busyId === m.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1a1a1a] text-gray-300 hover:bg-[#242424] transition-colors disabled:opacity-50"
                      >
                        Reset Password
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete @${m.username}? Ye wapas nahi aa sakta.`)) doAction(m, "delete");
                        }}
                        disabled={busyId === m.id}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                        title="Delete moderator"
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </motion.div>
      </div>

      {/* Reset password modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-[#111] border border-[#333] rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white">Reset @{resetTarget.username}&apos;s password</h3>
              <button onClick={() => setResetTarget(null)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <input
              type="text"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="New password (min 8 chars)"
              minLength={8}
              className="w-full px-3 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-white text-sm outline-none focus:border-[#23856C]"
            />
            <button
              onClick={() => doAction(resetTarget, "reset_password", resetPassword)}
              disabled={resetPassword.length < 8 || busyId === resetTarget.id}
              className="w-full py-2.5 rounded-xl bg-[#23856C] hover:bg-[#196A55] text-white text-sm font-bold transition-colors disabled:opacity-50"
            >
              {busyId === resetTarget.id ? "Saving…" : "Save New Password"}
            </button>
          </motion.div>
        </div>
      )}
    </AdminShell>
  );
}
