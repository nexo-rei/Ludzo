'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, MessageSquare } from 'lucide-react';

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWithdrawals();
  }, [filter]);

  const loadWithdrawals = async () => {
    setLoading(true);
    try {
      const admin = JSON.parse(localStorage.getItem('ludzo_admin') || '{}');
      const url = filter === 'all' ? '/api/admin/withdrawals' : `/api/admin/withdrawals?status=${filter}`;
      const res = await fetch(url, {
        headers: { 'x-telegram-id': String(admin.telegram_id) },
      });
      const json = await res.json();
      setWithdrawals(json.withdrawals || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, status: string) => {
    try {
      const admin = JSON.parse(localStorage.getItem('ludzo_admin') || '{}');
      await fetch(`/api/admin/withdrawals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-telegram-id': String(admin.telegram_id) },
        body: JSON.stringify({ status }),
      });
      loadWithdrawals();
    } catch (e) {
      console.error(e);
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
      <h1 className="text-2xl font-bold text-white">Withdrawals</h1>

      <div className="flex gap-2">
        {['all', 'pending', 'approved', 'rejected'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left p-4 text-gray-400 font-medium">User</th>
              <th className="text-left p-4 text-gray-400 font-medium">Amount</th>
              <th className="text-left p-4 text-gray-400 font-medium">Currency</th>
              <th className="text-left p-4 text-gray-400 font-medium">Method</th>
              <th className="text-left p-4 text-gray-400 font-medium">Status</th>
              <th className="text-left p-4 text-gray-400 font-medium">Date</th>
              <th className="text-left p-4 text-gray-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.map(wd => (
              <tr key={wd.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="p-4 text-white">{wd.users?.display_name || 'Unknown'}</td>
                <td className="p-4 text-white">{wd.amount}</td>
                <td className="p-4 text-gray-400 uppercase">{wd.currency}</td>
                <td className="p-4 text-gray-400 uppercase">{wd.method}</td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    wd.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                    wd.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {wd.status}
                  </span>
                </td>
                <td className="p-4 text-gray-500">{new Date(wd.created_at).toLocaleDateString()}</td>
                <td className="p-4">
                  {wd.status === 'pending' && (
                    <div className="flex gap-1">
                      <button onClick={() => handleAction(wd.id, 'approved')} className="p-1.5 bg-green-900/30 rounded hover:bg-green-900/50"><CheckCircle className="w-3 h-3 text-green-400" /></button>
                      <button onClick={() => handleAction(wd.id, 'rejected')} className="p-1.5 bg-red-900/30 rounded hover:bg-red-900/50"><XCircle className="w-3 h-3 text-red-400" /></button>
                    </div>
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
