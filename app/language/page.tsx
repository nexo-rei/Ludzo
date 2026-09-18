"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRightIcon, CheckIcon, LockIcon } from "@/components/ui/DuotoneIcons";
import OnboardingLayout from "@/components/layout/OnboardingLayout";
import LudzoLogo from "@/components/layout/LudzoLogo";
import LanguageFlag from "@/components/ui/LanguageFlag";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "@/lib/i18n";

export default function LanguagePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<LanguageCode>("en");

  useEffect(() => {
    const saved = localStorage.getItem("ludzo_lang");
    if (SUPPORTED_LANGUAGES.some((language) => language.code === saved)) {
      setSelected(saved as LanguageCode);
    }
  }, []);

  const handleContinue = () => {
    // This is intentionally written before auth. The auth request uses the
    // same value so a new Telegram account gets the language it just picked,
    // rather than Telegram's device language.
    localStorage.setItem("ludzo_lang", selected);
    const user = localStorage.getItem("ludzo_user");
    router.push(user ? "/home" : "/auth");
  };

  return (
    <OnboardingLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <LudzoLogo size={42} />
        <p className="onboarding-kicker">LET’S GET YOU STARTED</p>
        <h1 className="onboarding-title">A space that speaks<br />your language.</h1>
        <p className="onboarding-description">Choose your preferred language. You can change it later in settings.</p>
        <div className="language-picker-grid" role="group" aria-label="Preferred language">
          {SUPPORTED_LANGUAGES.map((lang, i) => {
            const active = selected === lang.code;
            return (
              <motion.button
                key={lang.code}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.035 }}
                onClick={() => setSelected(lang.code)}
                aria-pressed={active}
                title={`${lang.nativeName} — ${lang.country}`}
                className="language-option"
              >
                <LanguageFlag code={lang.code} />
                <span className="language-option-copy">
                  <span className="language-option-name">{lang.nativeName}</span>
                  <span className="language-option-meta">{lang.name} · {lang.countryCode}</span>
                </span>
                {active && <CheckIcon size={15} className="language-option-check" />}
              </motion.button>
            );
          })}
        </div>
        <button onClick={handleContinue} className="onboarding-continue">Continue<ArrowRightIcon size={17} /></button>
        <p className="onboarding-footer"><LockIcon size={13} />Secure sign-in with Telegram</p>
      </motion.div>
    </OnboardingLayout>
  );
}
