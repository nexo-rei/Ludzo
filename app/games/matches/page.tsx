"use client";

import { motion } from "framer-motion";
import { MatchesIcon, TrendUpIcon } from "@/components/gaming/GamingIcons";
import EmptyState from "@/components/gaming/EmptyState";

const SECTIONS = [
  { id: "live", label: "Live Matches", type: "matches" as const, message: "No live matches at the moment. Check back soon!" },
  { id: "recent", label: "Recent Matches", type: "recent" as const, message: "No recent matches. Your recent activity will appear here once you start playing." },
  { id: "history", label: "Match History", type: "history" as const, message: "Your completed matches will appear here." },
];

export default function MatchesPage() {
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
            <MatchesIcon size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gaming-foreground">Matches</h1>
            <p className="text-xs text-gaming-muted">Track your gaming activity</p>
          </div>
        </motion.div>

        {/* Stats overview */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="grid grid-cols-3 gap-2.5"
        >
          {[
            { label: "Played", value: "0", icon: TrendUpIcon, colorClass: "text-gaming-primary" },
            { label: "Won", value: "0", icon: TrendUpIcon, colorClass: "text-gaming-success" },
            { label: "Win Rate", value: "0%", icon: TrendUpIcon, colorClass: "text-gaming-gold" },
          ].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + index * 0.06, duration: 0.3 }}
                className="rounded-xl border border-gaming-border/40 bg-gaming-surface/40 p-3 text-center"
              >
                <Icon size={14} className={`mx-auto mb-1.5 ${stat.colorClass}`} />
                <p className="text-base font-bold text-gaming-foreground">{stat.value}</p>
                <p className="text-[10px] text-gaming-muted mt-0.5">{stat.label}</p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Match Sections */}
        {SECTIONS.map((section, index) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.08, duration: 0.4 }}
            className="rounded-2xl border border-gaming-border/40 bg-gaming-surface/30 overflow-hidden"
          >
            <div className="px-4 pt-4 pb-2">
              <h2 className="text-sm font-semibold text-gaming-foreground">{section.label}</h2>
            </div>
            <EmptyState type={section.type} message={section.message} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
