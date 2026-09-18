"use client";

/**
 * LUDZO — Sheet
 * ─────────────────────────────────────────────────────────────────────────────
 * The one dialog primitive for confirmations / pickers / rules inside the mini app.
 *
 * WHY IT EXISTS
 * The gaming lobby used to render its "Match confirmation" as a plain
 * `fixed inset-0 flex items-end` block with a free-height card. On a phone the
 * card is taller than the visible viewport, so the sheet spilled off both ends
 * and the Confirm / Cancel row ended up under the navigation bar — exactly the
 * bug that made staking feel broken.
 *
 * WHAT THIS FIXES
 *   • the panel is capped to the *visible* viewport (`86svh`, with a `vh`
 *     fallback), so Telegram's collapsing chrome can never push it off-screen;
 *   • the header and the action row are pinned, only the body scrolls — buttons
 *     are always reachable, whatever the content length;
 *   • safe-area padding lives on the footer, not on the backdrop, so the dim
 *     layer still covers the notch while the primary action clears it;
 *   • bottom sheet on phones, centered card from `sm:` up;
 *   • drag the handle down (or hit Escape / the backdrop) to dismiss, body
 *     scroll is locked while open, and `role="dialog"` + `aria-modal` are set.
 */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { CloseIcon } from "@/components/ui/DuotoneIcons";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Pinned action row — always visible, never scrolled out of reach. */
  footer?: ReactNode;
  /** Tap the dimmed backdrop / press Escape / drag the handle to close. */
  dismissable?: boolean;
  /** "sheet" (default) slides from the bottom edge; "center" only fades in place. */
  variant?: "sheet" | "center";
  className?: string;
  bodyClassName?: string;
  /** Extra label when `title` is not a plain string. */
  ariaLabel?: string;
}

const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 620;

export default function Sheet(props: SheetProps) {
  // Portaled into <body>: page-level styling of the hub (`.gaming-gradient-bg`
  // remaps every span/p/h), ancestor `transform`s from motion wrappers and any
  // overflow container would otherwise clip or re-tint a fixed dialog.
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setContainer(document.body);
    return () => setContainer(null);
  }, []);

  if (!container) return null;

  return createPortal(
    <AnimatePresence>
      {props.open && (
        <SheetPanel
          key="sheet"
          onClose={props.onClose}
          title={props.title}
          subtitle={props.subtitle}
          dismissable={props.dismissable}
          variant={props.variant}
          className={props.className}
          bodyClassName={props.bodyClassName}
          ariaLabel={props.ariaLabel}
        >
          {props.children}
          {props.footer && <SheetFooter>{props.footer}</SheetFooter>}
        </SheetPanel>
      )}
    </AnimatePresence>,
    container
  );
}

function SheetFooter({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex-none border-t px-5 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))]"
      style={{ borderColor: "var(--border)", background: "var(--card-bg)" }}
    >
      {children}
    </div>
  );
}

interface SheetPanelProps extends Omit<SheetProps, "open" | "footer"> {
  children: ReactNode;
}

function SheetPanel({
  onClose,
  title,
  subtitle,
  children,
  dismissable = true,
  variant = "sheet",
  className,
  bodyClassName,
  ariaLabel,
}: SheetPanelProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragControls = useDragControls();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Move focus into the dialog so screen readers announce it (and so the panel
  // is reachable without hunting for the close button).
  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, []);

  // Escape closes, and the page underneath stops scrolling behind the sheet.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissable) {
        event.preventDefault();
        closeRef.current();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [dismissable]);

  const handleDragEnd = useCallback(
    (_event: unknown, info: PanInfo) => {
      if (!dismissable || variant !== "sheet") return;
      if (info.offset.y > DISMISS_DISTANCE || info.velocity.y > DISMISS_VELOCITY) {
        closeRef.current();
      }
    },
    [dismissable, variant]
  );

  const startDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!dismissable || variant !== "sheet") return;
      dragControls.start(event);
    },
    [dismissable, variant, dragControls]
  );

  const isSheet = variant === "sheet";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={() => dismissable && onClose()}
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6"
      style={{
        background: "rgba(8, 14, 12, 0.62)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        // pan-y (not none) so the sheet body keeps momentum scrolling: touch-action
        // intersects down the ancestor chain, so `none` here would freeze the list.
        touchAction: "pan-y",
      }}
    >
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={typeof title === "string" || typeof title === "number" ? titleId : undefined}
        initial={isSheet ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 8 }}
        animate={isSheet ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
        exit={isSheet ? { y: "100%" } : { opacity: 0, scale: 0.97, y: 6 }}
        transition={
          isSheet
            ? { type: "spring", damping: 32, stiffness: 380, mass: 0.9 }
            : { duration: 0.2, ease: "easeOut" }
        }
        drag={isSheet && dismissable ? "y" : false}
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          // Height cap lives in globals.css (.ludzo-sheet-panel) so WebView engines
          // without the dynamic *vh units still get a safe `vh` fallback.
          "ludzo-sheet-panel relative flex w-full flex-col overflow-hidden border-[var(--border)] bg-[var(--card-bg)]",
          "shadow-[0_-24px_60px_-24px_rgba(0,0,0,0.55)]",
          isSheet
            ? "rounded-t-3xl border-t sm:max-w-[440px] sm:rounded-3xl sm:border"
            : "rounded-3xl border sm:max-w-[440px]",
          className
        )}
      >
        {(title || subtitle) && (
          <div className="flex-none px-5 pb-3 pt-2.5">
            {/* Drag handle — the only region that starts a dismiss gesture, so the
                body keeps normal momentum scrolling on iOS. */}
            {isSheet && dismissable && (
              <div className="flex justify-center pb-2.5" style={{ touchAction: "none" }}>
                <span
                  onPointerDown={startDrag}
                  className="h-1 w-10 rounded-full bg-[var(--border)]"
                  aria-hidden
                />
              </div>
            )}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {title && (
                  <h2
                    id={titleId}
                    className="truncate text-[15px] font-semibold tracking-tight text-[var(--text-primary)]"
                  >
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{subtitle}</p>
                )}
              </div>
              {dismissable && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="-mr-1.5 -mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-transparent text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] active:scale-95"
                >
                  <CloseIcon size={17} />
                </button>
              )}
            </div>
          </div>
        )}

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3",
            bodyClassName
          )}
          style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}
        >
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}
