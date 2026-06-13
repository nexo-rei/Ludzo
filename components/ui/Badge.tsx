import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "purple" | "gold" | "silver" | "bronze" | "blue" | "outline";
  size?: "sm" | "md";
  className?: string;
}

const variants: Record<string, string> = {
  default:  "bg-[rgba(255,255,255,0.06)] text-[var(--text-secondary)] border border-[rgba(255,255,255,0.08)]",
  success:  "bg-[rgba(16,185,129,0.12)] text-[#10B981] border border-[rgba(16,185,129,0.25)]",
  warning:  "bg-[rgba(245,158,11,0.12)] text-[#F59E0B] border border-[rgba(245,158,11,0.25)]",
  error:    "bg-[rgba(239,68,68,0.12)] text-[#F87171] border border-[rgba(239,68,68,0.25)]",
  purple:   "bg-[rgba(124,58,237,0.15)] text-[#A855F7] border border-[rgba(124,58,237,0.3)]",
  gold:     "bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border border-[rgba(245,158,11,0.35)]",
  silver:   "bg-[rgba(148,163,184,0.15)] text-[#94A3B8] border border-[rgba(148,163,184,0.3)]",
  bronze:   "bg-[rgba(180,83,9,0.15)] text-[#D97706] border border-[rgba(180,83,9,0.3)]",
  blue:     "bg-[rgba(59,130,246,0.12)] text-[#60A5FA] border border-[rgba(59,130,246,0.25)]",
  outline:  "bg-transparent text-[#A855F7] border border-[rgba(124,58,237,0.5)]",
};

export default function Badge({
  children,
  variant = "default",
  size = "sm",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold rounded-full tracking-wide",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-sm",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
