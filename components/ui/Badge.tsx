import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "purple" | "gold" | "silver" | "bronze";
  size?: "sm" | "md";
  className?: string;
}

const variants = {
  default:  "bg-[var(--border)] text-[var(--text-secondary)]",
  success:  "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30",
  warning:  "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30",
  error:    "bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30",
  purple:   "bg-[#7C3AED]/15 text-[#A855F7] border border-[#7C3AED]/30",
  gold:     "bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40",
  silver:   "bg-[#9CA3AF]/20 text-[#9CA3AF] border border-[#9CA3AF]/40",
  bronze:   "bg-[#B45309]/20 text-[#D97706] border border-[#B45309]/40",
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
        "inline-flex items-center font-semibold rounded-full",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
