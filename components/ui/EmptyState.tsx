import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import Button from "./Button";

interface EmptyStateProps {
  icon?: ReactNode;
  emoji?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export default function EmptyState({
  icon,
  emoji,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6 gap-3",
        className
      )}
    >
      {(emoji || icon) && (
        <div className="text-4xl mb-1">
          {emoji ?? icon}
        </div>
      )}
      <h3 className="text-base font-bold text-[var(--text-primary)]">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--text-secondary)] max-w-xs leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <Button variant="primary" size="sm" className="mt-2" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
