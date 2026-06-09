"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import { showToast } from "@/components/ui/Toast";
import { useApp } from "@/hooks/useApp";

const THEMES = [
  { value: "dark" as const, label: "Dark", icon: "🌑" },
  { value: "light" as const, label: "Light", icon: "☀️" },
  { value: "system" as const, label: "System", icon: "💻" },
];

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "uk", name: "Українська", flag: "🇺🇦" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
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
        setPrefs({
          id: prefs?.id ?? "",
          user_id: prefs?.user_id ?? userId ?? "",
          notifications_enabled: prefs?.notifications_enabled ?? true,
          updated_at: prefs?.updated_at ?? "",
          theme,
          language,
        });
        localStorage.setItem("ludzo_lang", language);
        showToast("Settings saved!", "success");
      }
    } catch { showToast("Failed to save settings", "error"); }
    finally { setSaving(false); }
  };

  return (
    <AppShell hideNav>
      <PageHeader title="Settings" back />
      <div className="px-4 py-4 space-y-6 pb-6">
        {/* Theme */}
        <div>
          <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Theme</h3>
          <div className="flex gap-2">
            {THEMES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
                  theme === t.value ? "border-[#7C3AED] bg-[#7C3AED]/10" : "border-[var(--border)] bg-[var(--card-bg)]"
                }`}
              >
                <span className="text-xl">{t.icon}</span>
                <span className={`text-xs font-semibold ${theme === t.value ? "text-[#A855F7]" : "text-[var(--text-secondary)]"}`}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div>
          <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Language</h3>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all ${
                  language === lang.code ? "border-[#7C3AED] bg-[#7C3AED]/10" : "border-[var(--border)] bg-[var(--card-bg)]"
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                <span className={`text-xs font-semibold ${language === lang.code ? "text-[#A855F7]" : "text-[var(--text-primary)]"}`}>{lang.name}</span>
                {language === lang.code && <span className="ml-auto text-[#7C3AED] text-xs">✓</span>}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-xl bg-[#7C3AED] text-white font-bold text-base hover:bg-[#5B21B6] transition-colors disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </AppShell>
  );
}
