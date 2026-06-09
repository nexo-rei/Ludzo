import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LANGUAGES } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import LudzoLogo from '@/components/common/LudzoLogo';
import { Check } from 'lucide-react';

interface LanguageSelectionProps {
  onSelect: (lang: Language) => void;
}

export default function LanguageSelection({ onSelect }: LanguageSelectionProps) {
  const [selected, setSelected] = useState<Language>('en');

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm flex flex-col items-center gap-8"
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-3">
          <LudzoLogo size={56} />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Select Language</h1>
            <p className="text-sm text-muted-foreground mt-1">Choose your preferred language</p>
          </div>
        </div>

        {/* Language Grid */}
        <div className="w-full grid grid-cols-2 gap-2">
          {LANGUAGES.map((lang) => (
            <motion.button
              key={lang.code}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelected(lang.code)}
              className={`
                flex items-center gap-3 p-3 rounded-xl border text-left transition-all
                ${selected === lang.code
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-card text-foreground hover:border-primary/50'
                }
              `}
            >
              <span className="text-xl">{lang.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{lang.nativeName}</div>
              </div>
              {selected === lang.code && (
                <Check className="w-4 h-4 text-primary shrink-0" />
              )}
            </motion.button>
          ))}
        </div>

        {/* Continue Button */}
        <Button
          className="w-full h-12 text-base font-semibold"
          onClick={() => onSelect(selected)}
        >
          Continue
        </Button>
      </motion.div>
    </div>
  );
}
