import React from 'react';
import { Trophy } from 'lucide-react';
import type { LeaderboardEntry } from '@/types/types';

const RANK_COLORS = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];
const RANK_BG = ['bg-yellow-500/10', 'bg-gray-400/10', 'bg-amber-600/10'];

interface LeaderboardPreviewProps {
  entries: LeaderboardEntry[];
  onViewAll: () => void;
}

export default function LeaderboardPreview({ entries, onViewAll }: LeaderboardPreviewProps) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Top Earners</h3>
        </div>
        <button onClick={onViewAll} className="text-xs text-primary font-medium">
          View All
        </button>
      </div>

      {!entries.length ? (
        <p className="text-sm text-muted-foreground text-center py-2">No data yet</p>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.slice(0, 3).map((entry, idx) => (
            <div key={entry.user_id} className={`flex items-center gap-3 p-2 rounded-xl ${RANK_BG[idx] ?? 'bg-muted/40'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${RANK_COLORS[idx] ?? 'text-muted-foreground'}`}>
                #{entry.rank}
              </div>
              {entry.photo_url ? (
                <img src={entry.photo_url} alt={entry.first_name} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                  {entry.first_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {entry.username ? `@${entry.username}` : entry.first_name}
                </div>
              </div>
              <div className="text-sm font-bold text-success tabular-nums">
                ${Number(entry.usdt_earned).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
