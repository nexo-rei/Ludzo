"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import LudzoLogo from "@/components/layout/LudzoLogo";
import { useTelegram } from "@/hooks/useTelegram";
import { useApp } from "@/hooks/useApp";
import { SkeletonCard } from "@/components/ui/Skeleton";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tgUser, initData, startParam, isReady } = useTelegram();
  const { setUser, setPrefs } = useApp();
  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isReady) return;
    if (!tgUser) {
      setStatus("error");
      setError("Could not detect Telegram. Please open this app inside Telegram.");
      return;
    }
    authenticate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, tgUser]);

  const authenticate = async () => {
    try {
      const referralCode = startParam ?? searchParams.get("start") ?? undefined;
      const res = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, referralCode }),
      });
      const data = await res.json();

      if (!data.success) {
        setStatus("error");
        setError(data.error ?? "Authentication failed");
        return;
      }

      setUser(data.data.user);
      if (data.data.prefs) setPrefs(data.data.prefs);
      setStatus("success");

      setTimeout(() => router.replace("/home"), 600);
    } catch {
      setStatus("error");
      setError("Connection error. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-6">
      <motion.div
        className="w-full max-w-sm flex flex-col items-center gap-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <LudzoLogo size={64} />

        {status === "loading" && (
          <>
            <div className="text-center">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Authenticating…</h2>
              <p className="text-sm text-[var(--text-muted)] mt-1">Verifying your Telegram identity</p>
            </div>
            <div className="w-full space-y-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </>
        )}

        {status === "success" && (
          <div className="text-center">
            <span className="text-5xl">✅</span>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mt-3">Welcome to LUDZO!</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">Redirecting…</p>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <span className="text-5xl">⚠️</span>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mt-3">Authentication Failed</h2>
            <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">{error}</p>
            <button
              onClick={() => { setStatus("loading"); authenticate(); }}
              className="mt-4 px-6 py-3 rounded-xl bg-[#7C3AED] text-white font-semibold hover:bg-[#5B21B6] transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
