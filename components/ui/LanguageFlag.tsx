import type { LanguageCode } from "@/lib/i18n";

interface LanguageFlagProps {
  code: LanguageCode;
  className?: string;
}

/**
 * Small inline SVG flags keep the language picker crisp in Telegram's WebView.
 * Emoji flags vary by device/font, so they are deliberately not used here.
 */
export default function LanguageFlag({ code, className = "" }: LanguageFlagProps) {
  return (
    <span className={`language-flag ${className}`} aria-hidden="true">
      <svg
        className="language-flag-artwork"
        viewBox="0 0 48 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <clipPath id={`flag-clip-${code}`}>
            <rect width="48" height="32" rx="6" />
          </clipPath>
        </defs>
        <g clipPath={`url(#flag-clip-${code})`}>
          {code === "en" && <UnitedStatesFlag />}
          {code === "ru" && <RussiaFlag />}
          {code === "uk" && <UkraineFlag />}
          {code === "es" && <SpainFlag />}
          {code === "pt" && <PortugalFlag />}
          {code === "fr" && <FranceFlag />}
          {code === "de" && <GermanyFlag />}
          {code === "it" && <ItalyFlag />}
          {code === "tr" && <TurkeyFlag />}
          {code === "hi" && <IndiaFlag />}
        </g>
        <rect x="0.5" y="0.5" width="47" height="31" rx="5.5" stroke="white" strokeOpacity="0.22" />
      </svg>
    </span>
  );
}

function UnitedStatesFlag() {
  return (
    <>
      <rect width="48" height="32" fill="#B22234" />
      <path
        d="M0 2.46H48M0 7.38H48M0 12.31H48M0 17.23H48M0 22.15H48M0 27.08H48"
        stroke="#fff"
        strokeWidth="2.46"
      />
      <rect width="21.5" height="17.2" fill="#3C3B6E" />
      <g fill="#fff">
        <circle cx="3.2" cy="3" r="0.75" /><circle cx="7.4" cy="3" r="0.75" /><circle cx="11.6" cy="3" r="0.75" /><circle cx="15.8" cy="3" r="0.75" /><circle cx="19.2" cy="3" r="0.75" />
        <circle cx="5.3" cy="6.1" r="0.75" /><circle cx="9.5" cy="6.1" r="0.75" /><circle cx="13.7" cy="6.1" r="0.75" /><circle cx="17.9" cy="6.1" r="0.75" />
        <circle cx="3.2" cy="9.2" r="0.75" /><circle cx="7.4" cy="9.2" r="0.75" /><circle cx="11.6" cy="9.2" r="0.75" /><circle cx="15.8" cy="9.2" r="0.75" /><circle cx="19.2" cy="9.2" r="0.75" />
        <circle cx="5.3" cy="12.3" r="0.75" /><circle cx="9.5" cy="12.3" r="0.75" /><circle cx="13.7" cy="12.3" r="0.75" /><circle cx="17.9" cy="12.3" r="0.75" />
        <circle cx="3.2" cy="15.4" r="0.75" /><circle cx="7.4" cy="15.4" r="0.75" /><circle cx="11.6" cy="15.4" r="0.75" /><circle cx="15.8" cy="15.4" r="0.75" /><circle cx="19.2" cy="15.4" r="0.75" />
      </g>
    </>
  );
}

function RussiaFlag() {
  return (
    <>
      <rect width="48" height="10.67" fill="#fff" />
      <rect y="10.67" width="48" height="10.66" fill="#2458A6" />
      <rect y="21.33" width="48" height="10.67" fill="#D52B1E" />
    </>
  );
}

function UkraineFlag() {
  return (
    <>
      <rect width="48" height="16" fill="#1D5FCE" />
      <rect y="16" width="48" height="16" fill="#F5C518" />
    </>
  );
}

function SpainFlag() {
  return (
    <>
      <rect width="48" height="32" fill="#AA151B" />
      <rect y="6" width="48" height="20" fill="#F1BF00" />
      <path d="M11 12h3v8h-3zM14 13h3v1h-3zM14 16h3v1h-3z" fill="#AA151B" opacity="0.9" />
    </>
  );
}

function PortugalFlag() {
  return (
    <>
      <rect width="19" height="32" fill="#046A38" />
      <rect x="19" width="29" height="32" fill="#DA291C" />
      <circle cx="19" cy="16" r="6.6" fill="#F6C945" />
      <circle cx="19" cy="16" r="4.8" fill="#EDEDED" />
      <path d="M16 11.9h6v8.2h-6z" fill="#DA291C" opacity="0.9" />
    </>
  );
}

function FranceFlag() {
  return (
    <>
      <rect width="16" height="32" fill="#1E4AA8" />
      <rect x="16" width="16" height="32" fill="#fff" />
      <rect x="32" width="16" height="32" fill="#ED2939" />
    </>
  );
}

function GermanyFlag() {
  return (
    <>
      <rect width="48" height="10.67" fill="#181818" />
      <rect y="10.67" width="48" height="10.66" fill="#DD0000" />
      <rect y="21.33" width="48" height="10.67" fill="#FFCE00" />
    </>
  );
}

function ItalyFlag() {
  return (
    <>
      <rect width="16" height="32" fill="#009246" />
      <rect x="16" width="16" height="32" fill="#fff" />
      <rect x="32" width="16" height="32" fill="#CE2B37" />
    </>
  );
}

function TurkeyFlag() {
  return (
    <>
      <rect width="48" height="32" fill="#E30A17" />
      <circle cx="20" cy="16" r="8" fill="#fff" />
      <circle cx="23" cy="16" r="6.4" fill="#E30A17" />
      <path d="m29.5 9.8 1.9 4.3 4.7.4-3.6 3 1.1 4.5-4.1-2.4-4.1 2.4 1.1-4.5-3.6-3 4.7-.4 1.9-4.3Z" fill="#fff" />
    </>
  );
}

function IndiaFlag() {
  return (
    <>
      <rect width="48" height="10.67" fill="#FF9933" />
      <rect y="10.67" width="48" height="10.66" fill="#fff" />
      <rect y="21.33" width="48" height="10.67" fill="#138808" />
      <circle cx="24" cy="16" r="4" stroke="#000080" strokeWidth="1" />
      <circle cx="24" cy="16" r="1" fill="#000080" />
      <path d="M24 12v8M20.54 14l6.92 4M20.54 18l6.92-4M21 16h6M22 12.54l4 6.92M26 12.54l-4 6.92" stroke="#000080" strokeWidth="0.55" />
    </>
  );
}
