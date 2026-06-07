'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [telegramId, setTelegramId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: `user=${encodeURIComponent(JSON.stringify({ id: parseInt(telegramId), first_name: 'Admin' }))}&auth_date=${Math.floor(Date.now()/1000)}` }),
      });
      const data = await res.json();
      if (data.success && ['admin', 'owner', 'moderator'].includes(data.user?.role)) {
        localStorage.setItem('ludzo_admin', JSON.stringify(data.user));
        router.push('/admin/dashboard');
      } else {
        setError('Access denied. Admin login only.');
      }
    } catch {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-sm w-full"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          <p className="text-sm text-gray-500 mt-1">Ludzo Administration</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Telegram ID</label>
            <input
              type="text"
              value={telegramId}
              onChange={e => setTelegramId(e.target.value)}
              placeholder="Enter your Telegram ID"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </div>

        <p className="text-xs text-gray-600 text-center mt-6">
          Admin access restricted to authorized personnel only.
        </p>
      </motion.div>
    </div>
  );
}
