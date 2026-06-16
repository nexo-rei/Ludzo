"use client";

import { motion } from "framer-motion";
import { EmptyStateIcon, EmptyHistoryIcon } from "./GamingIcons";

interface EmptyStateProps {
  type?: "matches" | "history" | "recent";
  title?: string;
  message?: string;
}

export default function EmptyState({
  type = "matches",
  title,
  message,
}: EmptyStateProps) {
  const defaults = {
    matches: {
      title: "No Live Matches",
      message: "No live matches at the moment. Check back soon!",
    },
    recent: {
      title: "No Recent Matches",
      message: "Your recent matches will appear here once you start playing.",
    },
    history: {
      title: "No Match History",
      message: "Your completed matches will appear here.",
    },
  };

  const displayTitle = title ?? defaults[type].title;
  const displayMessage = message ?? defaults[type].message;
  const Icon = type === "history" ? EmptyHistoryIcon : EmptyStateIcon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-10 px-6 text-center"
    >
      <div className="text-gaming-muted/40">
        <Icon size={72} />
      </div>
      <h4 className="mt-4 text-sm font-semibold text-gaming-foreground">{displayTitle}</h4>
      <p className="mt-1.5 text-xs text-gaming-muted max-w-[220px] leading-relaxed">{displayMessage}</p>
    </motion.div>
  );
}
