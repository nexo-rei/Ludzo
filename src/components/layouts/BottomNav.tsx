import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, ClipboardList, Gamepad2, Users, User } from 'lucide-react';
import { motion } from 'motion/react';
import { useTelegram } from '@/hooks/useTelegram';
import { useTranslation } from '@/hooks/useTranslation';

const navItems = [
  { path: '/', icon: Home, labelKey: 'nav.home' },
  { path: '/tasks', icon: ClipboardList, labelKey: 'nav.tasks' },
  { path: '/games', icon: Gamepad2, labelKey: 'nav.games' },
  { path: '/refer', icon: Users, labelKey: 'nav.refer' },
  { path: '/profile', icon: User, labelKey: 'nav.profile' },
];

export default function BottomNav() {
  const { hapticLight } = useTelegram();
  const { t } = useTranslation();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
        {navItems.map(({ path, icon: Icon, labelKey }) => {
          const active = isActive(path);
          return (
            <NavLink
              key={path}
              to={path}
              onClick={hapticLight}
              className="flex flex-col items-center justify-center gap-1 flex-1 h-full py-1 relative"
            >
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute top-1 w-8 h-1 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <Icon
                className={`w-5 h-5 transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className={`text-xs transition-colors ${active ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                {t(labelKey)}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
