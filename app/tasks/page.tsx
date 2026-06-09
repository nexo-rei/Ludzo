"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ExternalLink, RefreshCw } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonList } from "@/components/ui/Skeleton";
import { showToast } from "@/components/ui/Toast";
import { useApp } from "@/hooks/useApp";

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  type: string;
  reward_coins: number;
  target_link?: string;
  is_active: boolean;
  user_task: { status: string; completed_at: string } | null;
}

const TYPE_ICON: Record<string, string> = {
  channel_join: "📢", group_join: "👥", ad_task: "📺", custom: "⭐",
};

export default function TasksPage() {
  const { userId } = useApp();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", { headers: { "x-user-id": userId } });
      const data = await res.json();
      if (data.success) setTasks(data.data ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleStart = async (task: TaskItem) => {
    if (!userId) return;
    try {
      await fetch("/api/tasks/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ task_id: task.id }),
      });
      if (task.target_link) window.open(task.target_link, "_blank");
      await loadTasks();
    } catch { showToast("Failed to start task", "error"); }
  };

  const handleVerify = async (task: TaskItem) => {
    if (!userId) return;
    setVerifying(task.id);
    try {
      const res = await fetch("/api/tasks/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ task_id: task.id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`+${data.data.reward} Coins earned! ✅`, "success");
        await loadTasks();
      } else {
        showToast(data.error ?? "Verification failed", "error");
      }
    } catch { showToast("Connection error", "error"); }
    finally { setVerifying(null); }
  };

  const available = tasks.filter((t) => !t.user_task || t.user_task.status === "in_progress");
  const completed = tasks.filter((t) => t.user_task?.status === "completed");

  return (
    <AppShell>
      <PageHeader title="Tasks" right={
        <button onClick={loadTasks} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <RefreshCw size={16} />
        </button>
      } />

      <div className="px-4 py-4 space-y-6 pb-6">
        {loading ? (
          <SkeletonList count={3} />
        ) : (
          <>
            {/* Available */}
            <div>
              <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                Available ({available.length})
              </h2>
              {available.length === 0 ? (
                <EmptyState emoji="🎯" title="All tasks completed!" description="Check back later for new tasks." />
              ) : (
                <div className="space-y-3">
                  {available.map((task, i) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{TYPE_ICON[task.type] ?? "⭐"}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-[var(--text-primary)]">{task.title}</span>
                            <Badge variant="purple" size="sm">+{task.reward_coins} 🪙</Badge>
                          </div>
                          {task.description && (
                            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{task.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        {(!task.user_task || task.user_task.status !== "in_progress") ? (
                          <Button variant="primary" size="sm" className="flex-1 gap-1.5" onClick={() => handleStart(task)}>
                            <ExternalLink size={12} /> Start
                          </Button>
                        ) : (
                          <>
                            {task.target_link && (
                              <Button variant="secondary" size="sm" className="flex-1 gap-1.5" onClick={() => window.open(task.target_link!, "_blank")}>
                                <ExternalLink size={12} /> Open
                              </Button>
                            )}
                            <Button
                              variant="success"
                              size="sm"
                              className="flex-1"
                              loading={verifying === task.id}
                              onClick={() => handleVerify(task)}
                            >
                              Verify ✓
                            </Button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Completed */}
            {completed.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                  Completed ({completed.length})
                </h2>
                <div className="space-y-2">
                  {completed.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl opacity-60">
                      <span className="text-xl">{TYPE_ICON[task.type] ?? "⭐"}</span>
                      <span className="flex-1 text-sm font-medium text-[var(--text-secondary)]">{task.title}</span>
                      <Badge variant="success" size="sm">Done</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
