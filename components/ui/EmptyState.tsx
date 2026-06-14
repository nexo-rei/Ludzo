import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Button from "./Button";
//rebuild

interface EmptyStateProps {
  icon?: ReactNode;
  emoji?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
  variant?: "default" | "compact";
}

// Minimal SVG illustrations for empty states
function EmptyIllustration({ type }: { type: "default" | "chart" | "task" | "trophy" | "warning" }) {
  if (type === "chart") return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="8" y="40" width="10" height="16" rx="2" fill="rgba(124,58,237,0.15)" stroke="rgba(124,58,237,0.3)" strokeWidth="1.5" />
      <rect x="22" y="28" width="10" height="28" rx="2" fill="rgba(124,58,237,0.1)" stroke="rgba(124,58,237,0.2)" strokeWidth="1.5" />
      <rect x="36" y="34" width="10" height="22" rx="2" fill="rgba(124,58,237,0.08)" stroke="rgba(124,58,237,0.15)" strokeWidth="1.5" />
      <rect x="50" y="20" width="10" height="36" rx="2" fill="rgba(124,58,237,0.06)" stroke="rgba(124,58,237,0.1)" strokeWidth="1.5" />
      <path d="M6 58h52" stroke="rgba(100,116,139,0.4)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
  if (type === "task") return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="12" y="14" width="40" height="8" rx="4" fill="rgba(124,58,237,0.12)" stroke="rgba(124,58,237,0.25)" strokeWidth="1.5" />
      <rect x="12" y="28" width="30" height="8" rx="4" fill="rgba(124,58,237,0.08)" stroke="rgba(124,58,237,0.15)" strokeWidth="1.5" />
      <rect x="12" y="42" width="35" height="8" rx="4" fill="rgba(124,58,237,0.05)" stroke="rgba(124,58,237,0.1)" strokeWidth="1.5" />
      <circle cx="50" cy="46" r="8" fill="rgba(16,185,129,0.15)" stroke="rgba(16,185,129,0.4)" strokeWidth="1.5" />
      <path d="M47 46l2 2 4-4" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (type === "trophy") return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <path d="M20 12h24v18a12 12 0 01-24 0V12z" fill="rgba(245,158,11,0.1)" stroke="rgba(245,158,11,0.3)" strokeWidth="1.5" />
      <path d="M12 16h8v10a4 4 0 01-8 0V16z" fill="rgba(245,158,11,0.06)" stroke="rgba(245,158,11,0.2)" strokeWidth="1.5" />
      <path d="M44 16h8v10a4 4 0 01-8 0V16z" fill="rgba(245,158,11,0.06)" stroke="rgba(245,158,11,0.2)" strokeWidth="1.5" />
      <path d="M32 42v8M24 50h16" stroke="rgba(245,158,11,0.4)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
  if (type === "warning") return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <path d="M32 10L56 50H8L32 10Z" fill="rgba(239,68,68,0.08)" stroke="rgba(239,68,68,0.3)" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M32 28v10" stroke="rgba(239,68,68,0.6)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="44" r="2" fill="rgba(239,68,68,0.6)" />
    </svg>
  );
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="28" r="14" fill="rgba(124,58,237,0.1)" stroke="rgba(124,58,237,0.25)" strokeWidth="1.5" />
      <path d="M32 20v8l5 3" stroke="rgba(124,58,237,0.5)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 48c0-8.837 7.163-12 16-12s16 3.163 16 12" stroke="rgba(124,58,237,0.2)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Map emoji to illustration type
function getIllustrationType(emoji?: string): "default" | "chart" | "task" | "trophy" | "warning" {
  if (!emoji) return "default";
  if (["📊", "📈", "💹"].includes(emoji)) return "chart";
  if (["✅", "🎯", "📋"].includes(emoji)) return "task";
  if (["🏆", "🥇", "👑"].includes(emoji)) return "trophy";
  if (["⚠️", "❌", "🚫"].includes(emoji)) return "warning";
  return "default";
}

export default function EmptyState({
  icon,
  emoji,
  title,
  description,
  action,
  className,
  variant = "default",
}: EmptyStateProps) {
  const illType = getIllustrationType(emoji);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 gap-3",
        variant === "compact" ? "py-8" : "py-12",
        className
      )}
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="mb-1"
      >
        {icon ? (
          <div className="text-4xl">{icon}</div>
        ) : (
          <EmptyIllustration type={illType} />
        )}
      </motion.div>
      <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
      {description && (
        <p className="text-xs text-[var(--text-secondary)] max-w-[220px] leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <Button variant="primary" size="sm" className="mt-2" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}
