'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { TelegramIcon } from '@/components/icons';

export default function EntryPage() {
  const router = useRouter();
  const [isTelegram, setIsTelegram] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Check if inside Telegram
    const tg = (window as any).Telegram?.WebApp;
    const hasInitData = tg?.initData || new URLSearchParams(window.location.search).has('tgWebAppData');
    setIsTelegram(!!tg || !!hasInitData || navigator.userAgent.includes('Telegram'));
    setChecked(true);

    if (tg || hasInitData) {
      // Redirect to home after a brief delay
      setTimeout(() => router.push('/home'), 500);
    }
  }, [router]);

  if (!checked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!isTelegram) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full"
        >
          <div className="w-20 h-20 bg-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <TelegramIcon className="w-10 h-10 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Please open Ludzo inside Telegram</h1>
          <p className="text-gray-400 mb-8">This app is designed to work exclusively as a Telegram Mini App.</p>
          <a
            href="https://t.me/LudzoBot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            <TelegramIcon className="w-5 h-5" />
            Open Telegram
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"
        />
        <p className="text-gray-400">Loading Ludzo...</p>
      </motion.div>
    </div>
  );
}
