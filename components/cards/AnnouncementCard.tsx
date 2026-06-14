"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import Badge from "@/components/ui/Badge";
import type { Announcement } from "@/types";
import { timeAgo } from "@/lib/utils";

interface AnnouncementCardProps {
  announcement: Announcement;
  index?: number;
}

export default function AnnouncementCard({ announcement, index = 0 }: AnnouncementCardProps) {
  const [expanded, setExpanded] = useState(false);

  const priorityVariant =
    announcement.priority === "high" ? "error"
    : announcement.priority === "medium" ? "warning"
    : "default";

  const borderColor =
    announcement.priority === "high" ? "rgba(239,68,68,0.2)"
    : announcement.priority === "medium" ? "rgba(245,158,11,0.2)"
    : "var(--bg-elevated)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--card-bg)", border: `1px solid ${borderColor}` }}
    >
      <button
        className="w-full flex items-start gap-3 text-left p-4"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.2)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="1.5">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {announcement.title}
            </span>
            <Badge variant={priorityVariant} size="sm">{announcement.priority}</Badge>
          </div>
          <p className={`text-xs text-[var(--text-secondary)] leading-relaxed ${!expanded ? "line-clamp-2" : ""}`}>
            {announcement.description}
          </p>
          <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
            {timeAgo(announcement.created_at)}
          </span>
        </div>
        <div className="flex-shrink-0 text-[var(--text-muted)] mt-0.5">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>
    </motion.div>
  );
}
