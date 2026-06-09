"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import LudzoLogo from "@/components/layout/LudzoLogo";

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

export default function LanguagePage() {
  const router = useRouter();
  const [selected, setSelected] = useState("en");

  const handleContinue = () => {
    localStorage.setItem("ludzo_lang", selected);
    const user = localStorage.getItem("ludzo_user");
    router.push(user ? "/home" : "/auth");
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      <div className="flex-1 flex flex-col items-center px-6 py-12 max-w-app mx-auto w-full">
        <motion.div
          className="flex flex-col items-center gap-3 mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <LudzoLogo size={52} />
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Choose Language</h1>
          <p className="text-sm text-[var(--text-muted)]">Select your preferred language</p>
        </motion.div>

        <motion.div
          className="w-full grid grid-cols-2 gap-2 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          {LANGUAGES.map((lang, i) => (
            <motion.button
              key={lang.code}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setSelected(lang.code)}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                selected === lang.code
                  ? "border-[#7C3AED] bg-[#7C3AED]/10"
                  : "border-[var(--border)] bg-[var(--card-bg)]"
              }`}
            >
              <span className="text-2xl">{lang.flag}</span>
              <span className={`text-sm font-semibold ${selected === lang.code ? "text-[#A855F7]" : "text-[var(--text-primary)]"}`}>
                {lang.name}
              </span>
              {selected === lang.code && (
                <span className="ml-auto text-[#7C3AED]">✓</span>
              )}
            </motion.button>
          ))}
        </motion.div>

        <button
          onClick={handleContinue}
          className="w-full py-4 rounded-xl bg-[#7C3AED] hover:bg-[#5B21B6] text-white font-bold text-base
                     transition-colors shadow-lg shadow-[#7C3AED]/30"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
