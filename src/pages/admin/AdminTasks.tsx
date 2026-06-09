import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { getAdminTasks, createAdminTask, updateAdminTask, deleteAdminTask } from '@/services/api';
import type { Task } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface TaskFormData { title: string; description: string; type: string; reward_coins: number; target_link: string; is_active: boolean; }
const EMPTY_FORM: TaskFormData = { title: '', description: '', type: 'channel', reward_coins: 10, target_link: '', is_active: true };

export default function AdminTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getAdminTasks();
    setTasks(data as Task[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setOpen(true); };
  const openEdit = (task: Task) => {
    setEditing(task);
    setForm({ title: task.title, description: task.description ?? '', type: task.type, reward_coins: task.reward_coins, target_link: task.target_link ?? '', is_active: task.is_active });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateAdminTask(editing.id, { ...form, description: form.description || null, target_link: form.target_link || null, type: form.type as Task['type'] });
        toast.success('Task updated!');
      } else {
        await createAdminTask({ ...form, description: form.description || null, target_link: form.target_link || null, type: form.type as Task['type'] });
        toast.success('Task created!');
      }
      setOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    await deleteAdminTask(id);
    toast.success('Task deleted');
    load();
  };

  const handleToggle = async (task: Task) => {
    await updateAdminTask(task.id, { is_active: !task.is_active });
    load();
  };

  const TYPE_COLORS: Record<string, string> = { channel: 'text-blue-500 bg-blue-500/10', group: 'text-purple-500 bg-purple-500/10', ad: 'text-orange-500 bg-orange-500/10', custom: 'text-emerald-500 bg-emerald-500/10' };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground">{tasks.length} tasks total</p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="w-4 h-4" />Create Task
        </Button>
      </div>

      <div className="rounded-2xl bg-card border border-border overflow-x-auto">
        <table className="w-full min-w-max">
          <thead>
            <tr className="border-b border-border">
              {['Title', 'Type', 'Reward', 'Link', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-xs font-semibold text-muted-foreground uppercase px-4 py-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-2"><Skeleton className="h-10 rounded-lg" /></td></tr>
              ))
            ) : tasks.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No tasks yet. Create one above.</td></tr>
            ) : tasks.map(task => (
              <tr key={task.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-sm font-medium text-foreground">{task.title}</p>
                  {task.description && <p className="text-xs text-muted-foreground truncate max-w-[160px]">{task.description}</p>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[task.type]}`}>{task.type}</span>
                </td>
                <td className="px-4 py-3 text-sm font-bold text-amber-500 whitespace-nowrap">+{task.reward_coins} Coins</td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap max-w-[120px] truncate">{task.target_link ?? '—'}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button onClick={() => handleToggle(task)} className="flex items-center gap-1">
                    {task.is_active ? <ToggleRight className="w-5 h-5 text-success" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                    <span className={`text-xs font-medium ${task.is_active ? 'text-success' : 'text-muted-foreground'}`}>{task.is_active ? 'Active' : 'Inactive'}</span>
                  </button>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(task)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive" onClick={() => handleDelete(task.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Task' : 'Create Task'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-normal">Title *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Task title" className="h-10" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-normal">Description</Label>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" className="h-10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-normal">Type</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="channel">Channel</SelectItem>
                    <SelectItem value="group">Group</SelectItem>
                    <SelectItem value="ad">Ad</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-normal">Reward (Coins)</Label>
                <Input type="number" value={form.reward_coins} onChange={e => setForm(p => ({ ...p, reward_coins: parseInt(e.target.value) || 0 }))} className="h-10" min="1" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-normal">Target Link</Label>
              <Input value={form.target_link} onChange={e => setForm(p => ({ ...p, target_link: e.target.value }))} placeholder="https://t.me/channel" className="h-10" />
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
