'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    loadLogs();
  }, [offset]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const admin = JSON.parse(localStorage.getItem('ludzo_admin') || '{}');
      const res = await fetch(`/api/admin/logs?offset=${offset}&limit=50`, {
        headers: { 'x-telegram-id': String(admin.telegram_id) },
      });
      const json = await res.json();
      setLogs(json.logs || []);
      setCount(json.count || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Audit Logs</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left p-4 text-gray-400 font-medium">Action</th>
              <th className="text-left p-4 text-gray-400 font-medium">Admin</th>
              <th className="text-left p-4 text-gray-400 font-medium">Target</th>
              <th className="text-left p-4 text-gray-400 font-medium">Details</th>
              <th className="text-left p-4 text-gray-400 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="p-4 text-white">{log.action}</td>
                <td className="p-4 text-gray-400">{log.admin?.display_name || 'System'}</td>
                <td className="p-4 text-gray-400">{log.target_type} #{log.target_id?.slice(0, 8)}</td>
                <td className="p-4 text-gray-500 text-xs max-w-xs truncate">{JSON.stringify(log.details)}</td>
                <td className="p-4 text-gray-600">{new Date(log.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Showing {logs.length} of {count} logs</span>
        <div className="flex gap-2">
          <button onClick={() => setOffset(Math.max(0, offset - 50))} disabled={offset === 0} className="px-3 py-1 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-50">Prev</button>
          <button onClick={() => setOffset(offset + 50)} disabled={offset + 50 >= count} className="px-3 py-1 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
}
