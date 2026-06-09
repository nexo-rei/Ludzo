import { ReactNode, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  glass?: boolean;
  glow?: boolean;
  padding?: "sm" | "md" | "lg" | "none";
}

export default function Card({
  children,
  glass = false,
  glow = false,
  padding = "md",
  className,
  ...props
}: CardProps) {
  const paddings = { none: "", sm: "p-3", md: "p-4", lg: "p-5" };

  return (
    <div
      className={cn(
        "rounded-2xl border",
        glass
          ? "backdrop-blur-sm bg-[var(--card-bg)]/80 border-[var(--border)]"
          : "bg-[var(--card-bg)] border-[var(--border)]",
        glow && "shadow-[0_0_20px_rgba(124,58,237,0.15)]",
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
