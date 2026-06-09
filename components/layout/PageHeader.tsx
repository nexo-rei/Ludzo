"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, MoreVertical } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  back?: boolean;
  backHref?: string;
  right?: ReactNode;
  className?: string;
  transparent?: boolean;
}

export default function PageHeader({
  title,
  back = false,
  backHref,
  right,
  className,
  transparent = false,
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) router.push(backHref);
    else router.back();
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex items-center h-14 px-4",
        !transparent && "bg-[var(--bg)]/95 backdrop-blur-md border-b border-[var(--border)]",
        className
      )}
    >
      {back ? (
        <button
          onClick={handleBack}
          className="flex items-center justify-center w-8 h-8 -ml-1 rounded-lg
                     text-[var(--text-secondary)] hover:text-[var(--text-primary)]
                     hover:bg-[var(--border)] transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
      ) : (
        <div className="w-8" />
      )}
      <h1 className="flex-1 text-center text-base font-bold text-[var(--text-primary)] tracking-tight">
        {title}
      </h1>
      <div className="w-8 flex justify-end">
        {right ?? null}
      </div>
    </header>
  );
}
