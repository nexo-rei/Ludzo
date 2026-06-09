import React from 'react';
import { X, Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Announcement } from '@/types/types';

interface AnnouncementBannerProps {
  announcement: Announcement;
  onDismiss: (id: string) => void;
}

export default function AnnouncementBanner({ announcement, onDismiss }: AnnouncementBannerProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="rounded-xl bg-primary/10 border border-primary/20 p-3 flex gap-3 items-start"
      >
        <Megaphone className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{announcement.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 text-pretty">{announcement.message}</p>
        </div>
        <button
          onClick={() => onDismiss(announcement.id)}
          className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
