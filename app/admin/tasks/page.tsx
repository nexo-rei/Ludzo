"use client";
import SymbolIcon from "@/components/ui/SymbolIcon";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon, PlusIcon, TrashIcon } from "@/components/ui/DuotoneIcons";
import AdminShell from "@/components/admin/AdminShell";
import Badge from "@/components/ui/Badge";
import { showToast } from "@/components/ui/Toast";

interface AdminTask {
  id: string;
  title: string;
  description?: string;
  type: string;
  reward_coins: number;
  target_link?: string;
  target_id?: string;
  sort_order?: number;
  is_active: boolean;
  created_at: string;
}

const INITIAL_FORM = {
  title: "",
  description: "",
  type: "channel_join",
  reward_coins: 10,
  target_link: "",
  target_id: "",
  sort_order: 0,
  is_active: true,
};

const JOIN_TYPES = ["channel_join", "group_join"];

export default function AdminTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminTask | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [botCheck, setBotCheck] = useState<string | null>(null);

  const getToken = () => localStorage.getItem("ludzo_admin_token") ?? "";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tasks?limit=100", { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.status === 401) { router.replace("/admin"); return; }
      const data = await res.json();
      if (data.success) setTasks(data.data.items);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(INITIAL_FORM); setBotCheck(null); setShowForm(true); };
  const openEdit = (task: AdminTask) => {
    setEditing(task);
    setForm({
      title: task.title,
      description: task.description ?? "",
      type: task.type,
      reward_coins: task.reward_coins,
      target_link: task.target_link ?? "",
      target_id: task.target_id ?? "",
      sort_order: task.sort_order ?? 0,
      is_active: task.is_active,
    });
    setBotCheck(null);
    setShowForm(true);
  };

  /** Bot us channel/group me admin hai ya nahi — yahi check join-verification chalata hai. */
  const handleBotCheck = async () => {
    const chat = form.target_id.trim() || form.target_link.trim();
    if (!chat) { showToast("Pehle target link ya chat ID daalo", "error"); return; }
    setChecking(true);
    setBotCheck(null);
    try {
      const res = await fetch(`/api/admin/tasks/check-bot?chat=${encodeURIComponent(chat)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        const info = data.data;
        setBotCheck(`✅ Bot admin hai: ${info.chat_title ?? info.chat} (${info.chat_type ?? "chat"})`);
        showToast("Verification ready — bot is admin in this chat", "success");
      } else {
        setBotCheck(`⚠️ ${data.error ?? "Bot access check failed"}`);
        showToast(data.error ?? "Bot is not admin in this chat", "error");
      }
    } catch {
      showToast("Connection error. Please try again.", "error");
    } finally {
      setChecking(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { showToast("Title is required", "error"); return; }
    setSaving(true);
    try {
      const method = editing ? "PATCH" : "POST";
      const body = editing ? { ...form, id: editing.id } : form;
      const res = await fetch("/api/admin/tasks", {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        showToast(editing ? "Task updated!" : "Task created!", "success");
        if (data.warning) showToast(data.warning, "error");
        setShowForm(false);
        setBotCheck(null);
        await load();
      } else {
        showToast(data.error ?? "Failed to save task", "error");
      }
    } catch { showToast("Connection error", "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this task? This action cannot be undone.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/tasks?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (data.success) { showToast("Task deleted", "success"); await load(); }
    } catch { showToast("Failed to delete", "error"); }
    finally { setDeleting(null); }
  };

  return (
    <AdminShell title="Tasks">
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex justify-end">
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#23856C] text-white text-sm font-bold hover:bg-[#196A55] transition-colors"
          >
            <PlusIcon size={15} /> New Task
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading…</div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-4 bg-[#111] border border-[#222] rounded-xl">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">{task.title}</span>
                    <Badge variant={task.is_active ? "success" : "default"} size="sm">{task.is_active ? "Active" : "Inactive"}</Badge>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#222] text-gray-400">{task.type.replace(/_/g, " ")}</span>
                  </div>
                  {task.description && <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>}
                  {(task.target_id || task.target_link) && (
                    <p className="text-[10px] text-gray-600 mt-1 font-mono truncate">
                      verify: {task.target_id || task.target_link}
                    </p>
                  )}
                </div>
                <div className="text-sm font-bold text-yellow-400 font-numeric">+{task.reward_coins} <SymbolIcon name="coins" size={14} /></div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(task)} className="p-2 rounded-lg bg-[#222] text-gray-400 hover:text-[#63D9B4] hover:bg-[#333] transition-colors">
                    <PencilIcon size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    disabled={deleting === task.id}
                    className="p-2 rounded-lg bg-[#222] text-gray-400 hover:text-red-400 hover:bg-[#333] transition-colors disabled:opacity-40"
                  >
                    <TrashIcon size={13} />
                  </button>
                </div>
              </div>
            ))}
            {tasks.length === 0 && <div className="text-center text-gray-500 py-8">No tasks yet. Create one!</div>}
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6 overflow-y-auto">
          <div className="w-full max-w-sm bg-[#111] border border-[#333] rounded-2xl p-5 space-y-4 my-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white">{editing ? "Edit Task" : "New Task"}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            {[
              { label: "Title", key: "title", type: "text", placeholder: "Task title" },
              { label: "Description", key: "description", type: "text", placeholder: "Optional description" },
              { label: "Target Link", key: "target_link", type: "url", placeholder: "https://t.me/channel" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="text-xs text-gray-400 font-medium">{label}</label>
                <input
                  type={type} value={(form as Record<string, unknown>)[key] as string}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full mt-1 px-3 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-white text-sm outline-none focus:border-[#23856C]"
                />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-400 font-medium">Type</label>
              <select
                value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full mt-1 px-3 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-white text-sm outline-none focus:border-[#23856C]"
              >
                {["channel_join", "group_join", "ad_task", "custom"].map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            {JOIN_TYPES.includes(form.type) && (
              <div className="rounded-xl border border-[#2a2a2a] bg-[#161616] p-3 space-y-3">
                <div>
                  <label className="text-xs text-gray-400 font-medium">
                    Channel / Group Chat ID <span className="text-gray-600">(verification ke liye)</span>
                  </label>
                  <input
                    type="text"
                    value={form.target_id}
                    onChange={(e) => { setForm((f) => ({ ...f, target_id: e.target.value })); setBotCheck(null); }}
                    placeholder="@my_channel  ya  -1001234567890"
                    className="w-full mt-1 px-3 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-white text-sm outline-none focus:border-[#23856C]"
                  />
                  <p className="text-[10px] text-gray-600 mt-1.5 leading-relaxed">
                    Bot ko us channel/group me <span className="text-gray-400 font-semibold">admin</span> banana zaroori hai —
                    tabhi join hone ka sach me pata chalta hai. Public channel ho to @username kaafi hai
                    (link khali chhodo, ya yahi @username likh do). Private invite link (+hash) verify nahi ho sakta.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleBotCheck}
                  disabled={checking}
                  className="w-full py-2.5 rounded-xl bg-[#1f1f1f] border border-[#333] text-xs font-semibold text-gray-200 hover:border-[#555] transition-colors disabled:opacity-50"
                >
                  {checking ? "Checking…" : "Check bot access"}
                </button>
                {botCheck && (
                  <p className={`text-[11px] leading-relaxed ${botCheck.startsWith("✅") ? "text-emerald-400" : "text-amber-400"}`}>
                    {botCheck}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="text-xs text-gray-400 font-medium">Reward Coins</label>
              <input
                type="number" min={1} value={form.reward_coins}
                onChange={(e) => setForm((f) => ({ ...f, reward_coins: Number(e.target.value) }))}
                className="w-full mt-1 px-3 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-white text-sm outline-none focus:border-[#23856C]"
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox" checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="w-4 h-4 accent-[#23856C]"
              />
              <span className="text-sm text-gray-300">Active (visible to users)</span>
            </label>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-[#23856C] text-white font-bold text-sm disabled:opacity-60 hover:bg-[#196A55] transition-colors"
            >
              {saving ? "Saving…" : editing ? "Update Task" : "Create Task"}
            </button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
