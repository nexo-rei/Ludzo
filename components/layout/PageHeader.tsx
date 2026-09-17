"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import LudzoLogo from "./LudzoLogo";

interface PageHeaderProps {
  title: string;
  back?: boolean;
  backHref?: string;
  onBack?: () => void;
  right?: ReactNode;
  className?: string;
  transparent?: boolean;
  showLogo?: boolean;
}

export default function PageHeader({
  title,
  back = false,
  backHref,
  onBack,
  right,
  className,
  transparent = false,
  showLogo = false,
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) { onBack(); return; }
    if (backHref) router.push(backHref);
    else router.back();
  };

  return (
    <header
      className={cn(
        "page-header sticky top-0 z-40 flex items-center h-16 px-5",
        !transparent &&
          "border-b",
        className
      )}
      style={
        !transparent
          ? {
              background: "var(--card-bg)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              borderBottomColor: "var(--border)",
            }
          : undefined
      }
    >
      {back ? (
        <button
          onClick={handleBack}
          aria-label="Go back"
          className="flex items-center justify-center w-8 h-8 -ml-1 rounded-lg
                     text-[var(--text-secondary)] hover:text-[var(--text-primary)]
                     hover:bg-[rgba(35,133,108,0.1)] transition-all duration-150"
        >
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
      ) : showLogo ? (
        <LudzoLogo size={30} />
      ) : (
        <div className="w-8" />
      )}
      <h1 className="flex-1 text-center text-[15px] font-bold text-[var(--text-primary)] tracking-tight">
        {title}
      </h1>
      <div className="w-8 flex justify-end">
        {right ?? null}
      </div>
    </header>
  );
}
