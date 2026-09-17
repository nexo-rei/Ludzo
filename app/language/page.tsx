"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Check, LockKeyhole } from "lucide-react";
import OnboardingLayout from "@/components/layout/OnboardingLayout";
import LudzoLogo from "@/components/layout/LudzoLogo";

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "ru", name: "Русский" },
  { code: "uk", name: "Українська" },
  { code: "es", name: "Español" },
  { code: "pt", name: "Português" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "it", name: "Italiano" },
  { code: "tr", name: "Türkçe" },
  { code: "hi", name: "हिन्दी" },
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
    <OnboardingLayout><motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <LudzoLogo size={42} />
      <p className="onboarding-kicker">LET’S GET YOU STARTED</p>
      <h1 className="onboarding-title">A space that speaks<br />your language.</h1>
      <p className="onboarding-description">Choose your preferred language. You can change it later in settings.</p>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Preferred language">
        {LANGUAGES.map((lang, i) => <motion.button key={lang.code} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .025 }} onClick={() => setSelected(lang.code)} aria-pressed={selected === lang.code} className="language-option">
          <span className="language-code">{lang.code}</span><span>{lang.name}</span>{selected === lang.code && <Check size={15} className="ml-auto text-[var(--accent)] shrink-0" />}
        </motion.button>)}
      </div>
      <button onClick={handleContinue} className="onboarding-continue">Continue<ArrowRight size={17} /></button>
      <p className="onboarding-footer"><LockKeyhole size={13} />Secure sign-in with Telegram</p>
    </motion.div></OnboardingLayout>
  );
}
