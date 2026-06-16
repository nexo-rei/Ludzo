"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  LudoIcon,
  WaterSortIcon,
  ChessIcon,
  MoreGamesIcon,
  LockIcon,
  PlayIcon,
  FlameIcon,
} from "@/components/gaming/GamingIcons";

const FEATURED_GAME = {
  id: "ludo",
  title: "Ludo",
  description: "The classic board game reimagined for competitive play. Roll the dice, move your tokens, and be the first to reach home.",
  players: "2-4 Players",
  duration: "10-15 min",
  icon: LudoIcon,
  available: true,
};

const COMING_SOON = [
  {
    id: "water-sort",
    title: "Water Sort",
    description: "Sort colored water into bottles. A relaxing yet challenging puzzle experience.",
    icon: WaterSortIcon,
  },
  {
    id: "chess",
    title: "Chess",
    description: "Strategic battles on the classic 64-square battlefield. Outthink your opponent.",
    icon: ChessIcon,
  },
  {
    id: "more",
    title: "More Games",
    description: "Carrom, Snake & Ladder, Quiz and more exciting games are on the way.",
    icon: MoreGamesIcon,
  },
];

export default function PlayPage() {
  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto max-w-[480px] px-4 pt-5 pb-6 space-y-6">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gaming-primary/10 text-gaming-primary">
            <PlayIcon size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gaming-foreground">Play</h1>
            <p className="text-xs text-gaming-muted">Choose your game</p>
          </div>
        </motion.div>

        {/* Featured Game — Ludo */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl border border-gaming-primary/25 bg-gaming-surface/50"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-gaming-primary/5 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
          <div className="relative p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gaming-primary/10 text-gaming-primary">
                <LudoIcon size={48} />
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gaming-success/10 text-gaming-success">
                <FlameIcon size={12} />
                Popular
              </span>
            </div>

            <h2 className="text-xl font-bold text-gaming-foreground">{FEATURED_GAME.title}</h2>
            <p className="text-xs text-gaming-muted mt-1.5 leading-relaxed max-w-[280px]">
              {FEATURED_GAME.description}
            </p>

            <div className="flex items-center gap-3 mt-3">
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-gaming-surface/60 border border-gaming-border/30 text-gaming-muted">
                {FEATURED_GAME.players}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-gaming-surface/60 border border-gaming-border/30 text-gaming-muted">
                {FEATURED_GAME.duration}
              </span>
            </div>

            <Link
              href="#"
              className="mt-4 flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gaming-primary text-white text-sm font-semibold hover:bg-gaming-primary/90 active:scale-[0.98] transition-all"
            >
              <PlayIcon size={18} />
              Play Now
            </Link>
          </div>
        </motion.div>

        {/* Coming Soon */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gaming-muted">
              Coming Soon
            </h3>
            <span className="text-[10px] text-gaming-muted">Locked</span>
          </div>

          <div className="space-y-2.5">
            {COMING_SOON.map((game, index) => {
              const Icon = game.icon;
              return (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.08, duration: 0.35 }}
                  className="relative overflow-hidden rounded-xl border border-gaming-border/40 bg-gaming-surface/30 p-4"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gaming-muted/10 text-gaming-muted/60">
                      <Icon size={32} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-gaming-foreground">{game.title}</h4>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gaming-muted/10 text-gaming-muted font-medium">
                          Soon
                        </span>
                      </div>
                      <p className="text-xs text-gaming-muted mt-0.5 leading-snug line-clamp-2">
                        {game.description}
                      </p>
                    </div>
                    <div className="text-gaming-muted/40">
                      <LockIcon size={18} />
                    </div>
                  </div>

                  {/* Lock overlay with blur */}
                  <div className="absolute inset-0 bg-gaming-background/20 backdrop-blur-[0.5px] rounded-xl pointer-events-none" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
