import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { getAdminAnnouncements, createAdminAnnouncement, updateAdminAnnouncement, deleteAdminAnnouncement } from '@/services/api';
import type { Announcement } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';

export default function AdminAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState({ title: '', message: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getAdminAnnouncements();
    setItems(data as Announcement[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ title: '', message: '' }); setOpen(true); };
  const openEdit = (a: Announcement) => { setEditing(a); setForm({ title: a.title, message: a.message }); setOpen(true); };

  const handleSave = async () => {
    if (!form.title.trim() || !form.message.trim()) { toast.error('Title and message are required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateAdminAnnouncement(editing.id, { title: form.title, message: form.message });
        toast.success('Announcement updated!');
      } else {
        await createAdminAnnouncement(form.title, form.message);
        toast.success('Announcement created!');
      }
      setOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    await deleteAdminAnnouncement(id);
    toast.success('Deleted');
    load();
  };

  const handleToggle = async (a: Announcement) => {
    await updateAdminAnnouncement(a.id, { is_active: !a.is_active });
    load();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Announcements</h1>
          <p className="text-sm text-muted-foreground">{items.length} announcements</p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="w-4 h-4" />Create
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : items.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No announcements yet.</p>
          </div>
        ) : items.map(a => (
          <div key={a.id} className={`rounded-2xl bg-card border p-4 flex gap-3 ${a.is_active ? 'border-primary/20' : 'border-border opacity-60'}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-foreground truncate">{a.title}</p>
                {a.is_active
                  ? <span className="text-xs text-success bg-success/10 px-1.5 py-0.5 rounded-full shrink-0">Active</span>
                  : <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">Inactive</span>
                }
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{a.message}</p>
              <p className="text-xs text-muted-foreground mt-1">{format(new Date(a.created_at), 'MMM d, yyyy')}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleToggle(a)} title={a.is_active ? 'Deactivate' : 'Activate'}>
                {a.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEdit(a)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => handleDelete(a.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Announcement' : 'Create Announcement'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-normal">Title *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Announcement title" className="h-10" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-normal">Message *</Label>
              <Textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Announcement message..." rows={4} className="resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
