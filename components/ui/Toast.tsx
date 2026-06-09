"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

let addToastExternal: ((msg: string, type: ToastType) => void) | null = null;

export function showToast(message: string, type: ToastType = "info") {
  addToastExternal?.(message, type);
}

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: "bg-[#10B981]/15 border-[#10B981]/40 text-[#10B981]",
  error: "bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]",
  warning: "bg-[#F59E0B]/15 border-[#F59E0B]/40 text-[#F59E0B]",
  info: "bg-[#7C3AED]/15 border-[#7C3AED]/40 text-[#A855F7]",
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const add = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  useEffect(() => {
    addToastExternal = add;
    return () => { addToastExternal = null; };
  }, [add]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm pointer-events-auto ${COLORS[toast.type]}`}
              style={{ background: "var(--card-bg)" }}
            >
              <Icon size={16} className="flex-shrink-0" />
              <span className="text-sm font-medium text-[var(--text-primary)] flex-1">
                {toast.message}
              </span>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="flex-shrink-0 opacity-60 hover:opacity-100"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
