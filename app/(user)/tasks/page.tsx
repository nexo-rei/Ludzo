'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelegram } from '@/hooks/useTelegram';
import { useI18n } from '@/hooks/useI18n';
import { CheckCircle, Clock, AlertCircle, Play } from 'lucide-react';

type TaskFilter = 'all' | 'channel' | 'group' | 'ad';

export default function TasksPage() {
  const { user, api, openTelegramLink } = useTelegram();
  const { t } = useI18n();
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [tasks, setTasks] = useState<any[]>([]);
  const [adStatus, setAdStatus] = useState({ adsWatchedToday: 0, dailyLimit: 15 });
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadTasks();
  }, [user]);

  const loadTasks = async () => {
    try {
      const [tasksRes, adRes] = await Promise.all([
        api('/api/tasks'),
        api('/api/ads/status'),
      ]);
      setTasks(tasksRes.tasks || []);
      setAdStatus(adRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter(t => filter === 'all' || t.type === filter);

  const handleGo = (task: any) => {
    if (task.target_link) {
      openTelegramLink(task.target_link);
    }
  };

  const handleVerify = async (taskId: string) => {
    setVerifying(taskId);
    try {
      const res = await api('/api/tasks/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });
      if (res.verified) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, user_status: 'verified' } : t));
      } else {
        alert(res.error || 'Verification failed. Make sure you joined the channel/group.');
      }
    } catch (e: any) {
      alert(e.message || 'Verification failed');
    } finally {
      setVerifying(null);
    }
  };

  const handleClaim = async (taskId: string) => {
    try {
      const res = await api('/api/tasks/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });
      if (res.success) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, user_status: 'completed' } : t));
      }
    } catch (e: any) {
      alert(e.message || 'Claim failed');
    }
  };

  const handleAdWatch = async () => {
    if (adStatus.adsWatchedToday >= adStatus.dailyLimit) return;
    try {
      const res = await api('/api/ads/reward', { method: 'POST' });
      if (res.success) {
        setAdStatus(prev => ({ ...prev, adsWatchedToday: prev.adsWatchedToday + 1 }));
        loadTasks();
      }
    } catch (e: any) {
      alert(e.message || 'Failed to watch ad');
    }
  };

  const filters: { key: TaskFilter; label: string }[] = [
    { key: 'all', label: t('tasks.all') },
    { key: 'channel', label: t('tasks.channels') },
    { key: 'group', label: t('tasks.groups') },
    { key: 'ad', label: t('tasks.ads') },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'verified': return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'pending': return <AlertCircle className="w-5 h-5 text-orange-400" />;
      default: return <Play className="w-5 h-5 text-purple-400" />;
    }
  };

  const getActionButton = (task: any) => {
    const status = task.user_status || 'not_started';
    switch (status) {
      case 'completed':
        return (
          <span className="text-xs text-green-400 font-medium flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> {t('tasks.completed')}
          </span>
        );
      case 'verified':
        return (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handleClaim(task.id)}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold py-2 px-4 rounded-lg"
          >
            {t('tasks.claim')}
          </motion.button>
        );
      case 'pending':
        return (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handleVerify(task.id)}
            disabled={verifying === task.id}
            className="bg-yellow-600/80 hover:bg-yellow-600 text-white text-xs font-semibold py-2 px-4 rounded-lg disabled:opacity-50"
          >
            {verifying === task.id ? '...' : t('tasks.verify')}
          </motion.button>
        );
      default:
        if (task.type === 'ad') {
          const remaining = adStatus.dailyLimit - adStatus.adsWatchedToday;
          return (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleAdWatch}
              disabled={remaining <= 0}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold py-2 px-4 rounded-lg disabled:opacity-50"
            >
              {remaining <= 0 ? t('tasks.dailyLimit') : t('tasks.watchAd')}
            </motion.button>
          );
        }
        return (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              handleGo(task);
              setTasks(prev => prev.map(t => t.id === task.id ? { ...t, user_status: 'pending' } : t));
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold py-2 px-4 rounded-lg"
          >
            {t('tasks.go')}
          </motion.button>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">{t('tasks.title')}</h1>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === f.key ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Ad Status */}
      <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-3 flex items-center justify-between">
        <span className="text-xs text-gray-400">{t('tasks.dailyLimit')}</span>
        <span className="text-xs text-purple-400 font-medium">
          {adStatus.dailyLimit - adStatus.adsWatchedToday} {t('tasks.adsRemaining')}
        </span>
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredTasks.map(task => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="shrink-0">{getStatusIcon(task.user_status || 'not_started')}</div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{task.title}</p>
                  <p className="text-xs text-gray-500 truncate">{task.description}</p>
                  <p className="text-xs text-yellow-400 mt-1">+{task.reward_coins} {t('tasks.reward')}</p>
                </div>
              </div>
              <div className="shrink-0 ml-3">{getActionButton(task)}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
