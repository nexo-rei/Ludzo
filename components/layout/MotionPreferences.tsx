"use client";
import { MotionConfig } from "framer-motion";
import { ReactNode } from "react";
/** Honour the device accessibility preference for all motion components. */
export default function MotionPreferences({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
