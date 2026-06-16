import React from 'react';
import { motion } from 'motion/react';
import { useGames } from '@/contexts/GamesContext';
import { MegaphoneIcon } from '@/components/games/GameIcons';

export const Announcements: React.FC = () => {
  const { announcements } = useGames();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.4 }}
      className="px-4 pb-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <MegaphoneIcon size={18} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Announcements</h3>
      </div>

      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        {announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <MegaphoneIcon size={22} className="text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No announcements</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Check back later for updates</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {announcements.map((ann) => (
              <div key={ann.id} className="p-3">
                <div className="flex items-start gap-2">
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      ann.priority === 'high'
                        ? 'bg-destructive'
                        : ann.priority === 'normal'
                          ? 'bg-primary'
                          : 'bg-muted-foreground'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{ann.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ann.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
