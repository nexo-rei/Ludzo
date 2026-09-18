"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRightIcon, CheckIcon, LockIcon } from "@/components/ui/DuotoneIcons";
import OnboardingLayout from "@/components/layout/OnboardingLayout";
import LudzoLogo from "@/components/layout/LudzoLogo";
import LanguageFlag from "@/components/ui/LanguageFlag";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "@/lib/i18n";
import { useI18n } from "@/hooks/useI18n";

export default function LanguagePage() {
  const router = useRouter();
  const { language, setLanguage, t } = useI18n();
  const [selected, setSelected] = useState<LanguageCode>(language);

  useEffect(() => {
    const saved = localStorage.getItem("ludzo_lang");
    if (SUPPORTED_LANGUAGES.some((item) => item.code === saved)) {
      const code = saved as LanguageCode;
      setSelected(code);
      setLanguage(code);
    }
  }, [setLanguage]);

  const handleSelect = (code: LanguageCode) => {
    setSelected(code);
    setLanguage(code);
    localStorage.setItem("ludzo_lang", code);
  };

  const handleContinue = () => {
    localStorage.setItem("ludzo_lang", selected);
    setLanguage(selected);
    const user = localStorage.getItem("ludzo_user");
    router.push(user ? "/home" : "/auth");
  };

  return (
    <OnboardingLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <LudzoLogo size={42} />
        <p className="onboarding-kicker">{t("onboarding_kicker")}</p>
        <h1 className="onboarding-title">{t("onboarding_title")}</h1>
        <p className="onboarding-description">{t("onboarding_subtitle")}</p>
        <div className="language-picker-grid" role="group" aria-label="Preferred language">
          {SUPPORTED_LANGUAGES.map((lang, i) => {
            const active = selected === lang.code;
            return (
              <motion.button
                key={lang.code}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.035 }}
                onClick={() => handleSelect(lang.code)}
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
        <button onClick={handleContinue} className="onboarding-continue">
          {t("onboarding_continue")}<ArrowRightIcon size={17} />
        </button>
        <p className="onboarding-footer">
          <LockIcon size={13} />{t("onboarding_secure")}
        </p>
      </motion.div>
    </OnboardingLayout>
  );
}
