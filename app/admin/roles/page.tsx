'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldCheck, User, Crown } from 'lucide-react';

export default function AdminRolesPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const admin = JSON.parse(localStorage.getItem('ludzo_admin') || '{}');
      const res = await fetch('/api/admin/roles', {
        headers: { 'x-telegram-id': String(admin.telegram_id) },
      });
      const json = await res.json();
      setUsers(json.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const changeRole = async (userId: string, role: string) => {
    try {
      const admin = JSON.parse(localStorage.getItem('ludzo_admin') || '{}');
      await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-telegram-id': String(admin.telegram_id) },
        body: JSON.stringify({ userId, role }),
      });
      loadUsers();
    } catch (e) {
      console.error(e);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-purple-400" />;
      case 'admin': return <ShieldCheck className="w-4 h-4 text-blue-400" />;
      case 'moderator': return <Shield className="w-4 h-4 text-green-400" />;
      default: return <User className="w-4 h-4 text-gray-400" />;
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Roles</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left p-4 text-gray-400 font-medium">User</th>
              <th className="text-left p-4 text-gray-400 font-medium">Telegram ID</th>
              <th className="text-left p-4 text-gray-400 font-medium">Current Role</th>
              <th className="text-left p-4 text-gray-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="p-4 text-white">{user.display_name}</td>
                <td className="p-4 text-gray-400">{user.telegram_id}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {getRoleIcon(user.role)}
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      user.role === 'owner' ? 'bg-purple-500/20 text-purple-400' :
                      user.role === 'admin' ? 'bg-blue-500/20 text-blue-400' :
                      user.role === 'moderator' ? 'bg-green-500/20 text-green-400' :
                      'bg-gray-700 text-gray-400'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  {user.telegram_id !== 7565458414 && (
                    <select
                      value={user.role}
                      onChange={e => changeRole(user.id, e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white"
                    >
                      <option value="user">User</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
