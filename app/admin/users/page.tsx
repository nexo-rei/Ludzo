'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Ban, Coins, DollarSign, Shield } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    loadUsers();
  }, [search, offset]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const admin = JSON.parse(localStorage.getItem('ludzo_admin') || '{}');
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}&offset=${offset}&limit=50`, {
        headers: { 'x-telegram-id': String(admin.telegram_id) },
      });
      const json = await res.json();
      setUsers(json.users || []);
      setCount(json.count || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (userId: string, action: string, amount?: number, currency?: string) => {
    try {
      const admin = JSON.parse(localStorage.getItem('ludzo_admin') || '{}');
      if (action === 'ban' || action === 'unban') {
        await fetch(`/api/admin/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-telegram-id': String(admin.telegram_id) },
          body: JSON.stringify({ status: action === 'ban' ? 'banned' : 'active' }),
        });
      } else {
        await fetch('/api/admin/wallet/adjust', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-telegram-id': String(admin.telegram_id) },
          body: JSON.stringify({ userId, currency, amount, action: action.includes('add') ? 'add' : 'remove' }),
        });
      }
      loadUsers();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Users</h1>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left p-4 text-gray-400 font-medium">User</th>
                <th className="text-left p-4 text-gray-400 font-medium">Telegram ID</th>
                <th className="text-left p-4 text-gray-400 font-medium">Role</th>
                <th className="text-left p-4 text-gray-400 font-medium">Coins</th>
                <th className="text-left p-4 text-gray-400 font-medium">INR</th>
                <th className="text-left p-4 text-gray-400 font-medium">USDT</th>
                <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                <th className="text-left p-4 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center">
                        <span className="text-xs font-bold">{user.display_name?.[0] || '?'}</span>
                      </div>
                      <span className="text-white">{user.display_name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-400">{user.telegram_id}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      user.role === 'owner' ? 'bg-purple-500/20 text-purple-400' :
                      user.role === 'admin' ? 'bg-blue-500/20 text-blue-400' :
                      user.role === 'moderator' ? 'bg-green-500/20 text-green-400' :
                      'bg-gray-700 text-gray-400'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-yellow-400">{user.wallets?.[0]?.coins || 0}</td>
                  <td className="p-4 text-green-400">₹{user.wallets?.[0]?.inr_balance || 0}</td>
                  <td className="p-4 text-blue-400">{user.wallets?.[0]?.usdt_balance || 0}</td>
                  <td className="p-4">
                    <span className={`text-xs ${user.status === 'active' ? 'text-green-400' : 'text-red-400'}`}>{user.status}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <button onClick={() => handleAction(user.id, user.status === 'active' ? 'ban' : 'unban')} className="p-1.5 bg-gray-800 rounded hover:bg-gray-700" title="Ban/Unban">
                        <Ban className="w-3 h-3" />
                      </button>
                      <button onClick={() => handleAction(user.id, 'add_coins', 10, 'coins')} className="p-1.5 bg-gray-800 rounded hover:bg-gray-700" title="+10 Coins">
                        <Coins className="w-3 h-3 text-yellow-400" />
                      </button>
                      <button onClick={() => handleAction(user.id, 'add_inr', 100, 'inr')} className="p-1.5 bg-gray-800 rounded hover:bg-gray-700" title="+100 INR">
                        <DollarSign className="w-3 h-3 text-green-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Showing {users.length} of {count} users</span>
        <div className="flex gap-2">
          <button onClick={() => setOffset(Math.max(0, offset - 50))} disabled={offset === 0} className="px-3 py-1 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-50">Prev</button>
          <button onClick={() => setOffset(offset + 50)} disabled={offset + 50 >= count} className="px-3 py-1 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
}
