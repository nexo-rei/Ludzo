import React from 'react';
import { motion } from 'motion/react';
import { useGames } from '@/contexts/GamesContext';
import { SettingsIcon, VolumeOnIcon, VolumeOffIcon, SupportIcon } from '@/components/games/GameIcons';
import { Switch } from '@/components/ui/switch';

export const SettingsSection: React.FC = () => {
  const { settings, setTheme, setSoundEnabled } = useGames();

  const themes: { value: 'light' | 'dark' | 'auto'; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'auto', label: 'Auto' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.32 }}
      className="px-4 pb-8"
    >
      <h3 className="text-sm font-semibold text-foreground mb-3">Settings</h3>
      <div className="rounded-2xl bg-card border border-border overflow-hidden divide-y divide-border">
        {/* Theme */}
        <div className="px-4 py-3.5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <SettingsIcon size={16} className="text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">Theme</span>
            </div>
          </div>
          <div className="flex gap-2">
            {themes.map((t) => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                  settings.theme === t.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sound */}
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              {settings.soundEnabled ? (
                <VolumeOnIcon size={16} className="text-primary" />
              ) : (
                <VolumeOffIcon size={16} className="text-primary" />
              )}
            </div>
            <span className="text-sm font-medium text-foreground">Sound Effects</span>
          </div>
          <Switch
            checked={settings.soundEnabled}
            onCheckedChange={setSoundEnabled}
            aria-label="Toggle sound effects"
          />
        </div>

        {/* Support */}
        <button className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors text-left">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <SupportIcon size={16} className="text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">Support</span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-muted-foreground">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
};
