"use client";

import { useRouter } from "next/navigation";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BackArrowIcon } from "@/components/ui/DuotoneIcons";
import LudzoLogo from "./LudzoLogo";
import { useI18n } from "@/hooks/useI18n";

interface PageHeaderProps {
  title: string;
  back?: boolean;
  backHref?: string;
  onBack?: () => void;
  right?: ReactNode;
  className?: string;
  transparent?: boolean;
  showLogo?: boolean;
  backLabel?: string;
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
  backLabel,
}: PageHeaderProps) {
  const router = useRouter();
  const { t } = useI18n();

  const handleBack = () => {
    if (onBack) { onBack(); return; }
    if (backHref) router.push(backHref);
    else router.back();
  };

  const label = backLabel ?? t("back");

  return (
    <header
      className={cn(
        "page-header sticky top-0 z-40 flex items-center h-16 px-4 sm:px-5",
        !transparent && "border-b",
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
          type="button"
          onClick={handleBack}
          aria-label={label}
          className="back-control flex items-center justify-center w-11 h-11 -ml-1.5
                     rounded-xl text-[var(--text-secondary)]
                     hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)]
                     active:scale-95 transition-all duration-150"
        >
          <BackArrowIcon size={21} />
        </button>
      ) : showLogo ? (
        <div className="flex items-center h-11 -ml-1.5 pr-1.5">
          <LudzoLogo size={30} />
        </div>
      ) : (
        <div className="w-11" />
      )}
      <h1 className="flex-1 text-center text-[15px] font-bold text-[var(--text-primary)] tracking-tight truncate px-1">
        {title}
      </h1>
      <div className="w-11 flex items-center justify-end">{right ?? null}</div>
    </header>
  );
}
