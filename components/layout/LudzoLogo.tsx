/** Ludzo's geometric L / dice mark. No shared SVG IDs, safe to repeat. */
export default function LudzoLogo({ size = 40, className = "", variant = "default" }: { size?: number; className?: string; variant?: "default" | "dark" | "light" | "mono" }) {
  return <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-label="Ludzo" role="img">
    <rect x="1" y="1" width="46" height="46" rx="13" fill={variant === "mono" ? "currentColor" : "#63D9B4"} />
    <path d="M14 12h7v21h14v6H14V12Z" fill="#102C26" />
    <rect x="28" y="12" width="7" height="7" rx="2" fill="#102C26" />
    <rect x="28" y="23" width="7" height="6" rx="2" fill="#102C26" opacity=".45" />
  </svg>;
}
