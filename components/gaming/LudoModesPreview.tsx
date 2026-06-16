"use client";

import { motion } from "framer-motion";
import {
  OneVsOneIcon,
  OneVsThreeIcon,
  TournamentIcon,
  PracticeIcon,
  LockIcon,
} from "./GamingIcons";

const MODES = [
  {
    id: "1v1",
    title: "1 vs 1",
    description: "Face off in a head-to-head Ludo battle",
    icon: OneVsOneIcon,
    bgClass: "bg-gaming-primary/10",
    textClass: "text-gaming-primary",
    available: false,
  },
  {
    id: "1v3",
    title: "1 vs 3",
    description: "Take on three opponents at once",
    icon: OneVsThreeIcon,
    bgClass: "bg-gaming-accent/10",
    textClass: "text-gaming-accent",
    available: false,
  },
  {
    id: "tournament",
    title: "Tournament",
    description: "Compete in bracket-style tournaments",
    icon: TournamentIcon,
    bgClass: "bg-gaming-gold/10",
    textClass: "text-gaming-gold",
    available: false,
  },
  {
    id: "practice",
    title: "Practice",
    description: "Train against AI before real matches",
    icon: PracticeIcon,
    bgClass: "bg-gaming-success/10",
    textClass: "text-gaming-success",
    available: false,
  },
];

export default function LudoModesPreview() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gaming-muted">
          Ludo Modes
        </h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gaming-gold/10 text-gaming-gold font-medium">
          Coming Soon
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {MODES.map((mode, index) => {
          const Icon = mode.icon;
          return (
            <motion.div
              key={mode.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.08, duration: 0.35 }}
              className="relative overflow-hidden rounded-xl border border-gaming-border/40 bg-gaming-surface/40 p-3"
            >
              <div className="flex flex-col items-center text-center gap-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${mode.bgClass} ${mode.textClass}`}
                >
                  <Icon size={24} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gaming-foreground">{mode.title}</p>
                  <p className="text-[10px] text-gaming-muted mt-0.5 leading-snug">{mode.description}</p>
                </div>
              </div>

              {/* Lock overlay */}
              {!mode.available && (
                <div className="absolute inset-0 flex items-center justify-center bg-gaming-background/50 backdrop-blur-[1px] rounded-xl">
                  <div className="flex items-center gap-1 text-gaming-muted">
                    <LockIcon size={14} />
                    <span className="text-[10px] font-medium">Soon</span>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
