'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { HomeIcon, TasksIcon, GamesIcon, LeaderboardIcon, ProfileIcon } from './icons';
import { useI18n } from '@/hooks/useI18n';

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  const navItems = [
    { href: '/home', icon: HomeIcon, label: t('nav.home') },
    { href: '/tasks', icon: TasksIcon, label: t('nav.tasks') },
    { href: '/games', icon: GamesIcon, label: t('nav.games'), center: true },
    { href: '/leaderboard', icon: LeaderboardIcon, label: t('nav.leaderboard') },
    { href: '/profile', icon: ProfileIcon, label: t('nav.profile') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-lg border-t border-gray-800">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center ${
                item.center ? '-mt-6' : ''
              } ${isActive ? 'text-purple-400' : 'text-gray-500'}`}
            >
              {item.center && (
                <motion.div
                  className="w-14 h-14 bg-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-600/30"
                  whileTap={{ scale: 0.9 }}
                >
                  <item.icon className="w-7 h-7 text-white" />
                </motion.div>
              )}
              {!item.center && (
                <>
                  <item.icon className={`w-6 h-6 ${isActive ? 'text-purple-400' : ''}`} />
                  <span className="text-[10px] mt-0.5">{item.label}</span>
                </>
              )}
              {!item.center && isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-purple-400 rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
