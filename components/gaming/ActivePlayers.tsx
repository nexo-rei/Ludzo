"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ActivePlayersIcon } from "./GamingIcons";

interface ActivePlayersProps {
  baseCount?: number;
}

export default function ActivePlayers({ baseCount = 1247 }: ActivePlayersProps) {
  const [count, setCount] = useState(baseCount);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const change = Math.floor(Math.random() * 7) - 3;
      setCount((prev) => Math.max(800, prev + change));
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className="flex items-center gap-3 rounded-xl border border-gaming-border/40 bg-gaming-surface/40 px-4 py-3"
    >
      <div className="relative">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gaming-primary/10 text-gaming-primary">
          <ActivePlayersIcon size={18} />
        </div>
        <motion.span
          animate={pulse ? { scale: [1, 1.4, 1], opacity: [1, 0.4, 1] } : {}}
          transition={{ duration: 0.6 }}
          className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-gaming-success border-2 border-gaming-background"
        />
      </div>
      <div className="flex-1">
        <p className="text-[10px] text-gaming-muted uppercase tracking-wider font-medium">Active Players</p>
        <p className="text-base font-bold text-gaming-foreground tabular-nums">
          {count.toLocaleString()}
        </p>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-[10px] text-gaming-success font-medium">Live</span>
        <span className="h-1.5 w-1.5 rounded-full bg-gaming-success animate-pulse" />
      </div>
    </motion.div>
  );
}
