"use client";

/**
 * LUDZO — Telegram long-press hardening
 * ─────────────────────────────────────────────────────────────────────────────
 * A Telegram Mini App is supposed to feel like a native surface and to keep its
 * own domain hidden. Out of the box that is not true: holding a finger on Home /
 * Tasks / Games / Refer / Profile (or on any card, icon or avatar) makes the
 * WebView answer with its own callout — "Open in Browser", "Copy Link", the
 * rendered URL, image-saving sheets. Exactly the leak we are hiding the address
 * to avoid.
 *
 * CSS (`app/workspace.css`) already kills the visual half of that: callout, text
 * selection and drag previews. This component closes the remaining behavioural
 * holes, which can only be handled from script:
 *
 *   1. `contextmenu`      — Android Telegram fires it on long press; prevented
 *                           whenever the gesture came from touch/pen, so a real
 *                           right-click on a desktop still opens the browser menu
 *                           (handy for QA outside Telegram).
 *   2. `dragstart`        — no "link preview card" / drag-to-desktop ghost.
 *   3. `selectstart`      — no selection handles on labels and rows.
 *   4. long-press → click — a press-and-hold that ends on a link used to both
 *                           show the callout *and* navigate. After ~480 ms of a
 *                           still finger the follow-up click is swallowed.
 *   5. iOS `gesturestart` — the pinch/hold callout, neutralised.
 *
 * Escape hatches: anything inside `.selectable` / `[data-selectable="true"]`
 * behaves natively (legal copy), and `.allow-longpress` keeps its callout
 * (the deposit QR). Taps, scrolling and momentum are never touched.
 */

import { useEffect } from "react";

/** How long a finger has to stay put before we call it a long press — matched to
 * the delay Telegram itself uses, so a slow deliberate tap is never swallowed. */
const LONG_PRESS_MS = 520;
/** Movement that cancels the timer (a scroll, not a hold). */
const MOVE_TOLERANCE_PX = 12;

/** Nodes whose native text/link behaviour must keep working. */
function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) {
    // A disabled/readonly input is decoration (e.g. a copy-only field) — still allow it.
    return true;
  }
  return Boolean(target.closest(".selectable, [data-selectable='true'], .allow-longpress"));
}

export default function TelegramHardening() {
  useEffect(() => {
    const suppressEvent = (event: Event) => {
      if (isEditable(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
    };

    // Touch/pen input within this window counts as "the user held a finger down",
    // which is the only case Telegram's WebView answers with its own link menu.
    const TOUCH_WINDOW_MS = 700;
    let lastTouchAt = 0;
    const markTouch = () => { lastTouchAt = Date.now(); };

    const onContextMenu = (event: MouseEvent) => {
      if (Date.now() - lastTouchAt > TOUCH_WINDOW_MS) return; // desktop right-click
      suppressEvent(event);
    };
    const onDragStart = (event: DragEvent) => suppressEvent(event);
    const onSelectStart = (event: Event) => {
      if (window.getSelection()?.type === "Range") window.getSelection()?.removeAllRanges();
      suppressEvent(event);
    };
    const onGestureStart = (event: Event) => suppressEvent(event);

    // --- long-press detector ------------------------------------------------
    let timer: number | undefined;
    let held = false;
    let startX = 0;
    let startY = 0;

    const clearTimer = () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      markTouch();
      // Only single-finger holds on non-interactive text produce a callout.
      if (event.touches.length !== 1) { clearTimer(); return; }
      if (isEditable(event.target)) return;

      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;

      clearTimer();
      timer = window.setTimeout(() => {
        held = true;
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) selection.removeAllRanges();
      }, LONG_PRESS_MS);
    };

    const onTouchMove = (event: TouchEvent) => {
      if (timer === undefined && !held) return;
      const touch = event.touches[0];
      if (!touch) return;
      if (
        Math.abs(touch.clientX - startX) > MOVE_TOLERANCE_PX ||
        Math.abs(touch.clientY - startY) > MOVE_TOLERANCE_PX
      ) {
        clearTimer();
        held = false;
      }
    };

    const onTouchEnd = () => {
      clearTimer();
      // Release one frame later so the click that follows the lift is swallowed.
      if (held) window.setTimeout(() => { held = false; }, 0);
      else held = false;
    };

    /* A hold that ends on a link would still navigate once the finger lifts. The
       callout is already gone; this makes the gesture genuinely inert. Buttons are
       left alone — a 600 ms press on a button is still a tap, not a long press. */
    const onClick = (event: MouseEvent) => {
      if (!held) return;
      held = false;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest("a[href]")) return;
      event.preventDefault();
      event.stopPropagation();
    };

    const options = { capture: true } as const;
    document.addEventListener("contextmenu", onContextMenu, options);
    document.addEventListener("pointerdown", markTouch, { capture: true, passive: true });
    document.addEventListener("dragstart", onDragStart, options);
    document.addEventListener("selectstart", onSelectStart, options);
    document.addEventListener("gesturestart", onGestureStart, options);
    document.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
    document.addEventListener("touchmove", onTouchMove, { capture: true, passive: true });
    document.addEventListener("touchend", onTouchEnd, { capture: true, passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { capture: true, passive: true });
    document.addEventListener("click", onClick, options);

    return () => {
      clearTimer();
      document.removeEventListener("contextmenu", onContextMenu, options);
      document.removeEventListener("pointerdown", markTouch, { capture: true } as EventListenerOptions);
      document.removeEventListener("dragstart", onDragStart, options);
      document.removeEventListener("selectstart", onSelectStart, options);
      document.removeEventListener("gesturestart", onGestureStart, options);
      document.removeEventListener("touchstart", onTouchStart, { capture: true } as EventListenerOptions);
      document.removeEventListener("touchmove", onTouchMove, { capture: true } as EventListenerOptions);
      document.removeEventListener("touchend", onTouchEnd, { capture: true } as EventListenerOptions);
      document.removeEventListener("touchcancel", onTouchEnd, { capture: true } as EventListenerOptions);
      document.removeEventListener("click", onClick, options);
    };
  }, []);

  return null;
}
