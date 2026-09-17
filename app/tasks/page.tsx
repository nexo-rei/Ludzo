"use client";

import { useEffect, useState, useCallback, type ReactElement } from "react";
import { motion } from "framer-motion";
import { ExternalLinkIcon, RefreshIcon, CheckIcon } from "@/components/ui/DuotoneIcons";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonList } from "@/components/ui/Skeleton";
import { showToast } from "@/components/ui/Toast";
import LudzoCoin from "@/components/ui/LudzoCoin";
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

const TYPE_ICONS: Record<string, ReactElement> = {
  channel_join: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81 19.79 19.79 0 01.11.2a2 2 0 012-2.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  ),
  group_join: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#63D9B4" strokeWidth="1.5" strokeLinecap="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  ad_task: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.5">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  custom: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#F59E0B" stroke="none">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
};
const DEFAULT_TASK_ICON = TYPE_ICONS.custom;

const TYPE_BG: Record<string, string> = {
  channel_join: "rgba(59,130,246,0.12)",
  group_join: "rgba(99,217,180,0.12)",
  ad_task: "rgba(59,130,246,0.12)",
  custom: "rgba(245,158,11,0.12)",
};

const JOIN_TYPES = ["channel_join", "group_join"];
const isJoinTask = (type: string) => JOIN_TYPES.includes(type);

export default function TasksPage() {
  const { userId, refreshWallet } = useApp();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  /** Task ke andar dikhne wala inline hint (jaise "pehle channel join karo") */
  const [hints, setHints] = useState<Record<string, string>>({});

  const setHint = (taskId: string, message: string | null) =>
    setHints((h) => {
      const next = { ...h };
      if (message) next[taskId] = message;
      else delete next[taskId];
      return next;
    });

  const loadTasks = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", { headers: { "x-user-id": userId } });
      const data = await res.json();
      if (data.success) setTasks(Array.isArray(data.data) ? data.data : []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const openLink = (task: TaskItem, url?: string | null) => {
    const link = url ?? task.target_link;
    if (!link) return;
    setHint(task.id, "Channel join karke wapas aao, phir “Verify & Claim” dabao.");
    try {
      const tg = (window as Window & { Telegram?: { WebApp?: { openTelegramLink?: (u: string) => void } } }).Telegram?.WebApp;
      if (tg?.openTelegramLink && /^https?:\/\/t\.me\//i.test(link)) tg.openTelegramLink(link);
      else window.open(link, "_blank");
    } catch {
      window.open(link, "_blank");
    }
  };

  const handleStart = async (task: TaskItem) => {
    if (!userId) return;
    setStarting(task.id);
    try {
      const res = await fetch("/api/tasks/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ task_id: task.id }),
      });
      const data = await res.json();
      if (!data.success) { showToast(data.error ?? "Failed to start task", "error"); return; }
      setHint(task.id, isJoinTask(task.type) ? "Channel join karke wapas aao, phir Verify & Claim dabao." : null);
      openLink(task, data.data?.target_link ?? task.target_link);
      await loadTasks();
    } catch { showToast("Connection error. Please try again.", "error"); }
    finally { setStarting(null); }
  };

  const handleVerify = async (task: TaskItem) => {
    if (!userId) return;
    setVerifying(task.id);
    setHint(task.id, null);
    try {
      const res = await fetch("/api/tasks/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ task_id: task.id }),
      });
      const data = await res.json();

      if (data.success) {
        showToast(`+${data.data?.reward ?? task.reward_coins} Coins earned!`, "success");
        setHint(task.id, null);
        await Promise.all([loadTasks(), refreshWallet()]);
        return;
      }

      // Error code ke hisaab se clear message
      switch (data.code) {
        case "not_joined":
          setHint(task.id, "Please first join the channel/group — uske baad hi coins milenge.");
          showToast("Please first join the channel, then tap Verify & Claim.", "error");
          break;
        case "bot_not_admin":
          setHint(task.id, "Verification abhi available nahi hai. Support ko batao.");
          showToast(data.error ?? "Verification temporarily unavailable", "error");
          break;
        case "chat_not_configured":
          setHint(task.id, "Is task ka channel admin ne set nahi kiya.");
          showToast(data.error ?? "Task setup incomplete", "error");
          break;
        case "already_completed":
          setHint(task.id, null);
          showToast("Task already completed", "error");
          await loadTasks();
          break;
        default:
          setHint(task.id, data.error ?? "Verification failed. Please try again.");
          showToast(data.error ?? "Verification failed", "error");
      }
    } catch {
      showToast("Connection error. Please try again.", "error");
    } finally { setVerifying(null); }
  };

  const available = tasks.filter((t) => !t.user_task || t.user_task.status === "in_progress");
  const completed = tasks.filter((t) => t.user_task?.status === "completed");

  return (
    <AppShell>
      <PageHeader
        title="Tasks"
        right={
          <button onClick={loadTasks} className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <RefreshIcon size={15} />
          </button>
        }
      />
      <div className="px-4 py-4 space-y-5 pb-6">
        {loading ? (
          <SkeletonList count={3} />
        ) : (
          <>
            {/* Available */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Available</h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(35,133,108,0.15)", color: "#63D9B4" }}>
                  {available.length}
                </span>
              </div>
              {available.length === 0 ? (
                <EmptyState title="All tasks completed!" description="Check back later for new tasks." variant="compact" />
              ) : (
                <div className="space-y-3">
                  {available.map((task, i) => {
                    const inProgress = task.user_task?.status === "in_progress";
                    const join = isJoinTask(task.type);
                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="rounded-2xl p-4"
                        style={{
                          background: "var(--card-bg)",
                          border: inProgress ? "1px solid rgba(245,158,11,0.25)" : "1px solid rgba(35,133,108,0.12)",
                          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: TYPE_BG[task.type] ?? "rgba(35,133,108,0.12)", border: "1px solid rgba(35,133,108,0.15)" }}>
                            {TYPE_ICONS[task.type] ?? DEFAULT_TASK_ICON}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-sm font-bold text-[var(--text-primary)]">{task.title}</span>
                              <Badge variant="purple" size="sm">
                                <span className="inline-flex items-center gap-1">
                                  <LudzoCoin size={12} /> +{task.reward_coins}
                                </span>
                              </Badge>
                            </div>
                            {task.description && (
                              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{task.description}</p>
                            )}
                            {join && (
                              <p className="text-[10px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                                Coins sirf tab milte hain jab aap sach me join karte ho — bot membership check karta hai.
                              </p>
                            )}
                          </div>
                        </div>

                        {hints[task.id] && (
                          <p className="mt-3 text-[11px] leading-relaxed text-amber-400">{hints[task.id]}</p>
                        )}

                        <div className="flex gap-2 mt-3">
                          {!inProgress ? (
                            <Button variant="primary" size="sm" className="flex-1 gap-1.5" loading={starting === task.id} onClick={() => handleStart(task)}>
                              <ExternalLinkIcon size={12} /> {join ? "Open Channel" : "Start Task"}
                            </Button>
                          ) : (
                            <>
                              {task.target_link && (
                                <Button variant="secondary" size="sm" className="flex-1 gap-1.5" onClick={() => openLink(task)}>
                                  <ExternalLinkIcon size={12} /> Open
                                </Button>
                              )}
                              <Button
                                size="sm" className="flex-1 font-bold"
                                style={{ background: "linear-gradient(135deg, #10B981, #059669)", color: "white" } as React.CSSProperties}
                                loading={verifying === task.id} onClick={() => handleVerify(task)}
                              >
                                <CheckIcon size={12} /> Verify &amp; Claim
                              </Button>
                            </>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Completed */}
            {completed.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Completed</h2>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(16,185,129,0.12)", color: "#10B981" }}>
                    {completed.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {completed.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl opacity-60"
                      style={{ background: "var(--card-bg)", border: "1px solid rgba(16,185,129,0.1)" }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: "rgba(16,185,129,0.12)" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <span className="flex-1 text-xs font-medium text-[var(--text-secondary)]">{task.title}</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--text-muted)]">
                        <LudzoCoin size={12} /> +{task.reward_coins}
                      </span>
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
