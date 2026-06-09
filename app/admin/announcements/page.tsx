"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import Badge from "@/components/ui/Badge";
import { showToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  description: string;
  priority: string;
  is_active: boolean;
  created_at: string;
}

const INITIAL_FORM = { title: "", description: "", priority: "medium", is_active: true };
const PRIORITY_COLOR: Record<string, "error" | "warning" | "default"> = {
  high: "error", medium: "warning", low: "default",
};

export default function AdminAnnouncementsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const getToken = () => localStorage.getItem("ludzo_admin_token") ?? "";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/announcements?limit=50", { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.status === 401) { router.replace("/admin"); return; }
      const data = await res.json();
      if (data.success) setItems(data.data.items);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(INITIAL_FORM); setShowForm(true); };
  const openEdit = (item: Announcement) => {
    setEditing(item);
    setForm({ title: item.title, description: item.description, priority: item.priority, is_active: item.is_active });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim()) { showToast("Title and description are required", "error"); return; }
    setSaving(true);
    try {
      const method = editing ? "PATCH" : "POST";
      const body = editing ? { ...form, id: editing.id } : form;
      const res = await fetch("/api/admin/announcements", {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        showToast(editing ? "Updated!" : "Published!", "success");
        setShowForm(false);
        await load();
      } else {
        showToast(data.error ?? "Failed", "error");
      }
    } catch { showToast("Connection error", "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    try {
      const res = await fetch(`/api/admin/announcements?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (data.success) { showToast("Deleted", "success"); await load(); }
    } catch { showToast("Failed to delete", "error"); }
  };

  return (
    <AdminShell title="Announcements">
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex justify-end">
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7C3AED] text-white text-sm font-bold hover:bg-[#5B21B6] transition-colors"
          >
            <Plus size={15} /> New Announcement
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading…</div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="bg-[#111] border border-[#222] rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-bold text-white">{item.title}</span>
                      <Badge variant={PRIORITY_COLOR[item.priority] ?? "default"} size="sm">{item.priority}</Badge>
                      {!item.is_active && <Badge variant="default" size="sm">Hidden</Badge>}
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{item.description}</p>
                    <p className="text-[10px] text-gray-600 mt-1">{formatDateTime(item.created_at)}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(item)} className="p-2 rounded-lg bg-[#222] text-gray-400 hover:text-[#A855F7] hover:bg-[#333] transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg bg-[#222] text-gray-400 hover:text-red-400 hover:bg-[#333] transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {items.length === 0 && <div className="text-center text-gray-500 py-8">No announcements yet.</div>}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6 overflow-y-auto">
          <div className="w-full max-w-sm bg-[#111] border border-[#333] rounded-2xl p-5 space-y-4 my-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white">{editing ? "Edit Announcement" : "New Announcement"}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium">Title</label>
              <input
                type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Announcement title"
                className="w-full mt-1 px-3 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-white text-sm outline-none focus:border-[#7C3AED]"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium">Description</label>
              <textarea
                value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Announcement description…" rows={4}
                className="w-full mt-1 px-3 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-white text-sm outline-none focus:border-[#7C3AED] resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium">Priority</label>
              <select
                value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                className="w-full mt-1 px-3 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-white text-sm outline-none focus:border-[#7C3AED]"
              >
                <option value="high">High (Pinned)</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox" checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="w-4 h-4 accent-[#7C3AED]"
              />
              <span className="text-sm text-gray-300">Visible to users</span>
            </label>
            <button
              onClick={handleSave} disabled={saving}
              className="w-full py-3 rounded-xl bg-[#7C3AED] text-white font-bold text-sm disabled:opacity-60 hover:bg-[#5B21B6]"
            >
              {saving ? "Saving…" : editing ? "Update" : "Publish"}
            </button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
