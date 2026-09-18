"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import LanguageFlag from "@/components/ui/LanguageFlag";
import { showToast } from "@/components/ui/Toast";
import { useApp } from "@/hooks/useApp";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "@/lib/i18n";

export default function SettingsPage() {
  const { userId, prefs, setPrefs, language, setLanguage, t } = useApp();
  const [theme, setTheme] = useState<"dark" | "light" | "system">(prefs?.theme ?? "dark");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (prefs) {
      setTheme(prefs.theme ?? "dark");
      if (prefs.language && SUPPORTED_LANGUAGES.some((item) => item.code === prefs.language)) {
        setLanguage(prefs.language as LanguageCode);
      }
    }
  }, [prefs, setLanguage]);

  const handleLanguageSelect = (code: LanguageCode) => {
    setLanguage(code);
    localStorage.setItem("ludzo_lang", code);
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ theme, language }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Unable to save preferences");

      setPrefs({
        id: prefs?.id ?? "",
        user_id: prefs?.user_id ?? userId ?? "",
        notifications_enabled: prefs?.notifications_enabled ?? true,
        updated_at: prefs?.updated_at ?? "",
        theme,
        language,
      });
      localStorage.setItem("ludzo_lang", language);
      showToast(t("settings_saved"), "success");
    } catch {
      showToast(t("failed_save"), "error");
    } finally {
      setSaving(false);
    }
  };

  const THEMES = [
    {
      value: "dark" as const, label: t("theme_dark"),
      icon: <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    },
    {
      value: "light" as const, label: t("theme_light"),
      icon: <><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>,
    },
    {
      value: "system" as const, label: t("theme_system"),
      icon: <><rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>,
    },
  ];

  return (
    <AppShell hideNav>
      <PageHeader title={t("settings_title")} back />
      <div className="px-4 py-4 space-y-5 pb-6">
        {/* Theme selector */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">{t("appearance")}</h3>
          <div className="flex gap-3">
            {THEMES.map((item) => {
              const active = theme === item.value;
              return (
                <motion.button
                  key={item.value}
                  onClick={() => setTheme(item.value)}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl transition-all duration-150"
                  style={{
                    background: active ? "rgba(35,133,108,0.12)" : "var(--card-bg)",
                    border: active ? "1.5px solid rgba(35,133,108,0.5)" : "1px solid var(--border)",
                    boxShadow: active ? "0 0 16px rgba(35,133,108,0.12)" : "none",
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" style={{ color: active ? "#63D9B4" : "#64748B" }}>
                    {item.icon}
                  </svg>
                  <span className="text-xs font-semibold" style={{ color: active ? "#63D9B4" : "#64748B" }}>{item.label}</span>
                  {active && (
                    <span className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #23856C, #63D9B4)" }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Language selector */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          <div className="language-section-heading">
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{t("language_setting")}</h3>
              <p className="language-section-subtitle">{t("language_sub")}</p>
            </div>
            <span className="language-count">{t("languages_available", { count: SUPPORTED_LANGUAGES.length })}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const active = language === lang.code;
              return (
                <motion.button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code)}
                  whileTap={{ scale: 0.98 }}
                  aria-pressed={active}
                  title={`${lang.nativeName} — ${lang.country}`}
                  className="language-choice"
                >
                  <LanguageFlag code={lang.code} />
                  <span className="language-choice-copy">
                    <span className="language-choice-name">{lang.nativeName}</span>
                    <span className="language-choice-meta">{lang.name} · {lang.countryCode}</span>
                  </span>
                  <span className="language-choice-check" aria-hidden="true">
                    {active && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Save button */}
        <Button variant="primary" size="lg" fullWidth loading={saving} onClick={handleSave}>
          {t("save_settings")}
        </Button>
      </div>
    </AppShell>
  );
}
