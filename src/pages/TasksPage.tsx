import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { ExternalLink, CheckCircle, Clock, Loader2, Coins, Play, Users, Radio } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getTasks, startTask, verifyTask, claimTask } from '@/services/api';
import type { TaskWithUserStatus, TaskType } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTelegram } from '@/hooks/useTelegram';

const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'channel', label: 'Channels' },
  { key: 'group', label: 'Groups' },
  { key: 'ad', label: 'Ads' },
  { key: 'custom', label: 'Custom' },
];

const TYPE_ICONS: Record<TaskType, React.ReactNode> = {
  channel: <Radio className="w-4 h-4" />,
  group: <Users className="w-4 h-4" />,
  ad: <Play className="w-4 h-4" />,
  custom: <ExternalLink className="w-4 h-4" />,
};

const TYPE_COLORS: Record<TaskType, string> = {
  channel: 'bg-blue-500/15 text-blue-500',
  group: 'bg-purple-500/15 text-purple-500',
  ad: 'bg-orange-500/15 text-orange-500',
  custom: 'bg-emerald-500/15 text-emerald-500',
};

function TaskCard({ task, onAction, actionLoading }: { task: TaskWithUserStatus; onAction: (task: TaskWithUserStatus, action: 'start' | 'verify' | 'claim') => void; actionLoading: string | null }) {
  const { openLink } = useTelegram();
  const loading = actionLoading === task.id;

  const handleStart = () => {
    if (task.target_link) openLink(task.target_link);
    onAction(task, 'start');
  };

  const statusBadge = () => {
    switch (task.userStatus) {
      case 'completed':
        return <span className="text-xs font-medium text-success flex items-center gap-1"><CheckCircle className="w-3 h-3" />Done</span>;
      case 'pending':
        return <span className="text-xs font-medium text-warning flex items-center gap-1"><Clock className="w-3 h-3" />Pending</span>;
      case 'verified':
        return <span className="text-xs font-medium text-primary">Verified</span>;
      default:
        return null;
    }
  };

  const actionButton = () => {
    switch (task.userStatus) {
      case 'not_started':
        return <Button size="sm" className="h-8 text-xs" onClick={handleStart} disabled={loading}>{loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Start'}</Button>;
      case 'pending':
        return <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onAction(task, 'verify')} disabled={loading}>{loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Verify'}</Button>;
      case 'verified':
        return <Button size="sm" className="h-8 text-xs bg-success hover:bg-success/90" onClick={() => onAction(task, 'claim')} disabled={loading}>{loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Claim'}</Button>;
      case 'completed':
        return <span className="h-8 text-xs flex items-center gap-1 text-success"><CheckCircle className="w-3 h-3" />Done</span>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-card border border-border p-3 flex items-center gap-3"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${TYPE_COLORS[task.type]}`}>
        {TYPE_ICONS[task.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{task.title}</span>
          {statusBadge()}
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{task.description}</p>
        )}
        <div className="flex items-center gap-1 mt-1">
          <Coins className="w-3 h-3 text-amber-500" />
          <span className="text-xs font-semibold text-amber-500">+{task.reward_coins} Coins</span>
        </div>
      </div>
      <div className="shrink-0">
        {actionButton()}
      </div>
    </motion.div>
  );
}

export default function TasksPage() {
  const { user, refreshWallet } = useAuth();
  const [filter, setFilter] = useState('all');
  const [tasks, setTasks] = useState<TaskWithUserStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getTasks(user.id, filter === 'all' ? undefined : filter);
      setTasks(data);
    } finally {
      setLoading(false);
    }
  }, [user, filter]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleAction = async (task: TaskWithUserStatus, action: 'start' | 'verify' | 'claim') => {
    if (!user) return;
    setActionLoading(task.id);
    try {
      if (action === 'start') {
        await startTask(user.id, task.id);
        toast.info('Task started! Complete the action and verify.');
      } else if (action === 'verify') {
        await verifyTask(user.id, task.id);
        toast.success('Task verified!');
      } else if (action === 'claim') {
        const result = await claimTask(user.id, task.id);
        if (result.success) {
          toast.success(result.message, { icon: '🪙' });
          await refreshWallet();
        } else {
          toast.error(result.message);
        }
      }
      await loadTasks();
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3 max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-foreground">Tasks</h1>
        </div>
        {/* Filter tabs */}
        <div className="flex gap-1 px-4 pb-3 overflow-x-auto whitespace-nowrap max-w-lg mx-auto">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0 ${filter === f.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto flex flex-col gap-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-base font-medium text-foreground">No Tasks Available</p>
            <p className="text-sm text-muted-foreground text-center">Check back later for new tasks.</p>
          </div>
        ) : (
          tasks.map(task => (
            <TaskCard key={task.id} task={task} onAction={handleAction} actionLoading={actionLoading} />
          ))
        )}
      </div>
    </div>
  );
}
