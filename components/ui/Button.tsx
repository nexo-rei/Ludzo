import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

  const variants = {
    primary: "bg-[#7C3AED] hover:bg-[#5B21B6] text-white",
    secondary: "bg-[var(--card-bg)] hover:bg-[var(--border)] text-[var(--text-primary)] border border-[var(--border)]",
    ghost: "bg-transparent hover:bg-[var(--border)] text-[var(--text-secondary)]",
    danger: "bg-[#EF4444] hover:bg-[#DC2626] text-white",
    success: "bg-[#10B981] hover:bg-[#059669] text-white",
  };

  const sizes = {
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-10 px-4 text-sm gap-2",
    lg: "h-12 px-6 text-base gap-2",
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
