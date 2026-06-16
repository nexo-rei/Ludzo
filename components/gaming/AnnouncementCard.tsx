"use client";

import { motion } from "framer-motion";
import { MegaphoneIcon, ArrowRightIcon } from "./GamingIcons";

interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: "high" | "medium" | "low";
  date: string;
}

const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "a1",
    title: "Ludo Launch",
    body: "Ludo is launching soon. Get ready for the biggest gaming experience on Ludzo.",
    priority: "high",
    date: "Jun 16",
  },
  {
    id: "a2",
    title: "Daily Rewards",
    body: "Login every day to claim free coins. Streak bonuses up to 10x.",
    priority: "medium",
    date: "Jun 14",
  },
  {
    id: "a3",
    title: "Tournament Mode",
    body: "Bracket-style tournaments are coming. Practice now and prepare to compete.",
    priority: "medium",
    date: "Jun 10",
  },
  {
    id: "a4",
    title: "Referral Bonus",
    body: "Invite friends and earn bonus coins when they join the Gaming Hub.",
    priority: "low",
    date: "Jun 8",
  },
];

function PriorityBadge({ priority }: { priority: Announcement["priority"] }) {
  const colors = {
    high: "bg-gaming-error/10 text-gaming-error",
    medium: "bg-gaming-gold/10 text-gaming-gold",
    low: "bg-gaming-muted/10 text-gaming-muted",
  };
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium uppercase ${colors[priority]}`}>
      {priority}
    </span>
  );
}

export default function AnnouncementsSection() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <MegaphoneIcon size={16} className="text-gaming-primary" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gaming-muted">
          Announcements
        </h3>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {MOCK_ANNOUNCEMENTS.map((announcement, index) => (
          <motion.div
            key={announcement.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + index * 0.06, duration: 0.35 }}
            className="flex-shrink-0 w-[220px] rounded-xl border border-gaming-border/40 bg-gaming-surface/40 p-3.5 flex flex-col"
          >
            <div className="flex items-center justify-between mb-2">
              <PriorityBadge priority={announcement.priority} />
              <span className="text-[10px] text-gaming-muted">{announcement.date}</span>
            </div>
            <h4 className="text-sm font-semibold text-gaming-foreground mb-1">{announcement.title}</h4>
            <p className="text-xs text-gaming-muted leading-relaxed mb-2">{announcement.body}</p>
            <div className="mt-auto flex items-center gap-1 text-gaming-primary text-xs font-medium">
              <span>Read more</span>
              <ArrowRightIcon size={12} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
