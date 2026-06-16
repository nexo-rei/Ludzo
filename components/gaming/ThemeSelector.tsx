"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SunIcon, MoonIcon, AutoThemeIcon } from "./GamingIcons";

type Theme = "light" | "dark" | "auto";

const THEMES: { id: Theme; label: string; icon: typeof SunIcon }[] = [
  { id: "light", label: "Light", icon: SunIcon },
  { id: "dark", label: "Dark", icon: MoonIcon },
  { id: "auto", label: "Auto", icon: AutoThemeIcon },
];

interface ThemeSelectorProps {
  defaultTheme?: Theme;
  onChange?: (theme: Theme) => void;
}

export default function ThemeSelector({ defaultTheme = "auto", onChange }: ThemeSelectorProps) {
  const [active, setActive] = useState<Theme>(defaultTheme);

  const handleSelect = (theme: Theme) => {
    setActive(theme);
    onChange?.(theme);
    // Apply theme to document
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else if (theme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      // Auto: respect system preference
      root.classList.remove("dark", "light");
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        root.classList.add("dark");
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      {THEMES.map((theme) => {
        const Icon = theme.icon;
        const isActive = active === theme.id;
        return (
          <button
            key={theme.id}
            onClick={() => handleSelect(theme.id)}
            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
              isActive
                ? "bg-gaming-primary text-white shadow-sm"
                : "bg-gaming-surface/60 text-gaming-muted hover:text-gaming-foreground border border-gaming-border/30"
            }`}
          >
            <Icon size={14} />
            <span>{theme.label}</span>
            {isActive && (
              <motion.div
                layoutId="theme-active-indicator"
                className="absolute inset-0 rounded-lg ring-1 ring-gaming-primary/30"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
