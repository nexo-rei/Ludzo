'use client';

import { motion } from 'framer-motion';
import { useI18n } from '@/hooks/useI18n';
import { Gamepad2, Dice5, AlertCircle } from 'lucide-react';

export default function GamesPage() {
  const { t } = useI18n();

  const games = [
    {
      id: 'ludo',
      name: t('games.ludo'),
      icon: Dice5,
      description: 'Classic board game. Coming soon!',
      color: 'from-red-600/30 to-orange-600/30',
      borderColor: 'border-red-500/30',
    },
    {
      id: 'snake',
      name: t('games.snakeLadder'),
      icon: Gamepad2,
      description: 'Snakes & Ladders. Coming soon!',
      color: 'from-green-600/30 to-teal-600/30',
      borderColor: 'border-green-500/30',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t('games.title')}</h1>

      <div className="grid gap-4">
        {games.map((game) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            className={`relative bg-gradient-to-br ${game.color} border ${game.borderColor} rounded-2xl p-6 overflow-hidden`}
          >
            <div className="absolute top-3 right-3">
              <span className="bg-black/50 text-gray-300 text-xs font-medium px-3 py-1 rounded-full">
                {t('games.comingSoon')}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-black/30 rounded-xl flex items-center justify-center">
                <game.icon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{game.name}</h3>
                <p className="text-sm text-gray-400">{game.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-purple-900/20 border border-purple-500/30 rounded-2xl p-4"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-purple-300 mb-1">{t('games.infoTitle')}</h4>
            <p className="text-xs text-gray-400 leading-relaxed">{t('games.infoText')}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
