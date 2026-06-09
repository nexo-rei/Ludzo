import { InputHTMLAttributes, forwardRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

// Use Omit to remove the native `prefix` attribute (which is string | undefined)
// so we can override it with ReactNode
interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?: string;
  error?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, prefix, suffix, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <div className="absolute left-3 text-[var(--text-secondary)] pointer-events-none">
              {prefix}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full h-11 rounded-xl border bg-[var(--card-bg)] text-[var(--text-primary)]",
              "px-4 text-sm placeholder:text-[var(--text-muted)] outline-none",
              "transition-colors duration-150",
              "focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]/30",
              "border-[var(--border)]",
              error && "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/30",
              prefix && "pl-9",
              suffix && "pr-9",
              className
            )}
            {...props}
          />
          {suffix && (
            <div className="absolute right-3 text-[var(--text-secondary)]">{suffix}</div>
          )}
        </div>
        {error && <p className="text-xs text-[#EF4444]">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
export default Input;
