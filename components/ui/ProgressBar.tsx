import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  showLabel?: boolean;
  color?: string;
}

export default function ProgressBar({
  value,
  max = 100,
  className,
  barClassName,
  showLabel = false,
  color = "#7C3AED",
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("w-full", className)}>
      <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", barClassName)}
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-[var(--text-muted)]">{value}</span>
          <span className="text-xs text-[var(--text-muted)]">{max}</span>
        </div>
      )}
    </div>
  );
}
