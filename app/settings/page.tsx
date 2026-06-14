"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { useApp } from "@/hooks/useApp";

const THEMES = [
  {
    value: "dark" as const, label: "Dark",
    icon: <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  },
  {
    value: "light" as const, label: "Light",
    icon: <><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>,
  },
  {
    value: "system" as const, label: "System",
    icon: <><rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>,
  },
];

const LANGUAGES = [
  { code: "en", name: "English",    flag: "EN" },
  { code: "ru", name: "Русский",    flag: "RU" },
  { code: "uk", name: "Українська", flag: "UK" },
  { code: "es", name: "Español",    flag: "ES" },
  { code: "pt", name: "Português",  flag: "PT" },
  { code: "fr", name: "Français",   flag: "FR" },
  { code: "de", name: "Deutsch",    flag: "DE" },
  { code: "it", name: "Italiano",   flag: "IT" },
  { code: "tr", name: "Türkçe",     flag: "TR" },
  { code: "hi", name: "हिन्दी",     flag: "HI" },
];

export default function SettingsPage() {
  const { userId, prefs, setPrefs } = useApp();
  const [theme, setTheme] = useState<"dark" | "light" | "system">(prefs?.theme ?? "dark");
  const [language, setLanguage] = useState(prefs?.language ?? "en");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (prefs) { setTheme(prefs.theme ?? "dark"); setLanguage(prefs.language ?? "en"); }
  }, [prefs]);

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
      if (data.success) {
        setPrefs({ id: prefs?.id ?? "", user_id: prefs?.user_id ?? userId ?? "", notifications_enabled: prefs?.notifications_enabled ?? true, updated_at: prefs?.updated_at ?? "", theme, language });
        localStorage.setItem("ludzo_lang", language);
        showToast("Settings saved!", "success");
      }
    } catch { showToast("Failed to save settings", "error"); }
    finally { setSaving(false); }
  };

  return (
    <AppShell hideNav>
      <PageHeader title="Settings" back />
      <div className="px-4 py-4 space-y-5 pb-6">
        {/* Theme selector */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Appearance</h3>
          <div className="flex gap-3">
            {THEMES.map((t) => {
              const active = theme === t.value;
              return (
                <motion.button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl transition-all duration-150"
                  style={{
                    background: active ? "rgba(124,58,237,0.12)" : "var(--card-bg)",
                    border: active ? "1.5px solid rgba(124,58,237,0.5)" : "1px solid var(--border)",
                    boxShadow: active ? "0 0 16px rgba(124,58,237,0.12)" : "none",
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" style={{ color: active ? "#A855F7" : "#64748B" }}>
                    {t.icon}
                  </svg>
                  <span className="text-xs font-semibold" style={{ color: active ? "#A855F7" : "#64748B" }}>{t.label}</span>
                  {active && (
                    <span className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7C3AED, #A855F7)" }}>
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
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Language</h3>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map((lang) => {
              const active = language === lang.code;
              return (
                <motion.button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all duration-150"
                  style={{
                    background: active ? "rgba(124,58,237,0.1)" : "var(--card-bg)",
                    border: active ? "1.5px solid rgba(124,58,237,0.4)" : "1px solid var(--border)",
                  }}
                >
                  <span className="w-8 h-6 rounded text-[10px] font-black flex items-center justify-center shrink-0"
                    style={{ background: active ? "rgba(124,58,237,0.2)" : "var(--bg-elevated)", color: active ? "#A855F7" : "#64748B" }}>
                    {lang.flag}
                  </span>
                  <span className="flex-1 text-xs font-semibold text-left truncate"
                    style={{ color: active ? "#A855F7" : "var(--text-secondary)" }}>
                    {lang.name}
                  </span>
                  {active && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Save button */}
        <Button variant="primary" size="lg" fullWidth loading={saving} onClick={handleSave}>
          Save Settings
        </Button>
      </div>
    </AppShell>
  );
}
