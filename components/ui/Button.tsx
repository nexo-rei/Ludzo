import { ButtonHTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success" | "gold" | "outline";
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
    "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed select-none relative overflow-hidden";

  const variants: Record<string, string> = {
    primary:
      "text-white shadow-sm",
    secondary:
      "bg-[var(--card-bg)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[#23856C]/40 hover:bg-[var(--bg-elevated)]",
    ghost:
      "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--border)]/60 hover:text-[var(--text-primary)]",
    danger:
      "bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30 hover:bg-[#EF4444]/20",
    success:
      "text-white",
    gold:
      "text-[#0F172A] font-bold",
    outline:
      "bg-transparent border border-[#23856C]/50 text-[#63D9B4] hover:bg-[#23856C]/10",
  };

  const gradients: Record<string, string> = {
    primary: "#23856C",
    success: "#147D64",
    gold: "linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)",
  };

  const sizes: Record<string, string> = {
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-10 px-4 text-sm gap-2",
    lg: "h-12 px-6 text-base gap-2",
  };

  const hasGradient = ["primary", "success", "gold"].includes(variant);

  return (
    <motion.button
      whileTap={!disabled && !loading ? { scale: 0.97 } : {}}
      whileHover={!disabled && !loading ? { scale: 1.01 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
      style={hasGradient ? { background: gradients[variant] } : undefined}
      disabled={disabled || loading}
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      {/* Shine overlay for primary buttons */}
      {hasGradient && !disabled && !loading && (
        <span
          className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)",
          }}
        />
      )}
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
          <span>Loading...</span>
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
}
