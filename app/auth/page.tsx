"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircleIcon, ShieldAlertIcon } from "@/components/ui/DuotoneIcons";
import OnboardingLayout from "@/components/layout/OnboardingLayout";
import LudzoLogo from "@/components/layout/LudzoLogo";
import { useTelegram } from "@/hooks/useTelegram";
import { useApp } from "@/hooks/useApp";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { isSupportedLanguage, normalizeLanguage } from "@/lib/i18n";
import { useI18n } from "@/hooks/useI18n";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tgUser, initData, startParam, isReady } = useTelegram();
  const { setUser, setPrefs } = useApp();
  const { setLanguage, t } = useI18n();
  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isReady) return;

    if (!tgUser) {
      setStatus("error");
      setError(t("connect_no_tg"));
      return;
    }

    const selectedLanguage = localStorage.getItem("ludzo_lang");
    if (!isSupportedLanguage(selectedLanguage)) {
      router.replace("/language");
      return;
    }

    authenticate(selectedLanguage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, tgUser, startParam]);

  const authenticate = async (selectedLanguage?: string) => {
    try {
      const referralCode = startParam ?? searchParams.get("start") ?? undefined;
      const chosenLanguage = isSupportedLanguage(selectedLanguage)
        ? selectedLanguage
        : normalizeLanguage(tgUser?.language_code);

      setLanguage(chosenLanguage);

      const res = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          initData,
          referralCode,
          selectedLanguage: chosenLanguage,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setStatus("error");
        setError(data.error ?? "Authentication failed");
        return;
      }

      setUser(data.data.user);

      const savedLanguage = normalizeLanguage(data.data.prefs?.language ?? chosenLanguage);
      localStorage.setItem("ludzo_lang", savedLanguage);
      setLanguage(savedLanguage);
      if (data.data.prefs) {
        setPrefs(data.data.prefs);
      }

      setStatus("success");

      setTimeout(() => {
        router.replace("/home");
      }, 600);
    } catch {
      setStatus("error");
      setError("Connection error. Please try again.");
    }
  };

  return (
    <OnboardingLayout>
      <motion.div
        className="w-full max-w-sm flex flex-col items-center gap-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <LudzoLogo size={64} />

        {status === "loading" && (
          <>
            <div className="text-center">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                {t("authenticating")}
              </h2>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                {t("verifying_tg")}
              </p>
            </div>

            <div className="w-full space-y-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </>
        )}

        {status === "success" && (
          <div className="text-center">
            <CheckCircleIcon size={44} className="mx-auto text-[var(--accent)]" />
            <h2 className="text-xl font-bold text-[var(--text-primary)] mt-3">
              {t("welcome_ludzo")}
            </h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {t("redirecting")}
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <ShieldAlertIcon size={44} className="mx-auto text-[var(--accent)]" />
            <h2 className="text-xl font-bold text-[var(--text-primary)] mt-3">
              {t("connect_title")}
            </h2>

            <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
              {error}
            </p>

            <button
              onClick={() => {
                setStatus("loading");
                authenticate();
              }}
              className="mt-4 px-6 py-3 rounded-xl bg-[#23856C] text-white font-semibold hover:bg-[#196A55] transition-colors"
            >
              {t("retry")}
            </button>
          </div>
        )}
      </motion.div>
    </OnboardingLayout>
  );
}

export default function AuthPage() {
  const { t } = useI18n();
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          {t("loading")}
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  );
}
