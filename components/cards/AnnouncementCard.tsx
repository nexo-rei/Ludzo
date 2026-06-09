"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Bell } from "lucide-react";
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
    announcement.priority === "high"
      ? "error"
      : announcement.priority === "medium"
      ? "warning"
      : "default";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4"
    >
      <button
        className="w-full flex items-start gap-3 text-left"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="mt-0.5 p-1.5 rounded-lg bg-[#7C3AED]/10">
          <Bell size={14} className="text-[#7C3AED]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {announcement.title}
            </span>
            <Badge variant={priorityVariant} size="sm">
              {announcement.priority}
            </Badge>
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
