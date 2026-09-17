import { useId } from "react";

/**
 * LUDZO COIN — the one and only in-game coin mark.
 * ─────────────────────────────────────────────────────────────────────────────
 * Hand-drawn, brand-locked coin used everywhere the user sees coins:
 * home balance card, task rewards, streak rewards, ludo lobby, ads, admin.
 *
 *   • 48 × 48 grid, sized with the `size` prop (any px value)
 *   • warm gold rim  +  deep brand-teal face  +  embossed “L”
 *   • three dice pips nod to the Ludo arena
 *   • gradient ids are unique per instance (useId) so dozens of coins can
 *     render on one screen without clashing defs
 *   • `mono` renders a flat currentColor version for ultra-tiny sizes
 *     (e.g. inline “+10” chips in admin tables)
 */
export interface LudzoCoinProps {
  /** Rendered width/height in px. Defaults to 24. */
  size?: number;
  className?: string;
  /** Soft halo behind the coin — use for hero / balance displays. */
  glow?: boolean;
  /** Flat single-tone version that inherits `currentColor`. */
  mono?: boolean;
}

export default function LudzoCoin({
  size = 24,
  className = "",
  glow = false,
  mono = false,
}: LudzoCoinProps) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, "");

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role="img"
      aria-label="Ludzo coins"
    >
      {!mono && (
        <defs>
          {/* Gold rim — light top-left to deep bottom-right */}
          <linearGradient id={`lz-rim-${uid}`} x1="7" y1="5" x2="41" y2="43" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFE9A8" />
            <stop offset="0.42" stopColor="#F7C244" />
            <stop offset="0.78" stopColor="#E09B0F" />
            <stop offset="1" stopColor="#B26A05" />
          </linearGradient>
          {/* Brand-teal face */}
          <linearGradient id={`lz-face-${uid}`} x1="13" y1="12" x2="36" y2="37" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3FB894" />
            <stop offset="0.55" stopColor="#23856C" />
            <stop offset="1" stopColor="#14513F" />
          </linearGradient>
          {/* Embossed letter */}
          <linearGradient id={`lz-letter-${uid}`} x1="18" y1="13" x2="30" y2="35" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#CFEFE2" />
          </linearGradient>
          <radialGradient id={`lz-glow-${uid}`} cx="24" cy="24" r="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F7C244" stopOpacity="0.42" />
            <stop offset="1" stopColor="#F7C244" stopOpacity="0" />
          </radialGradient>
        </defs>
      )}

      {glow && !mono && <circle cx="24" cy="24" r="24" fill={`url(#lz-glow-${uid})`} />}

      {/* Rim */}
      <circle cx="24" cy="24" r="22.5" fill={mono ? "currentColor" : `url(#lz-rim-${uid})`} />
      <circle
        cx="24"
        cy="24"
        r="22.5"
        fill="none"
        stroke={mono ? "currentColor" : "#FFF6D8"}
        strokeOpacity={mono ? 0.55 : 0.75}
        strokeWidth="1.4"
      />

      {/* Face */}
      <circle
        cx="24"
        cy="24"
        r="17.4"
        fill={mono ? "currentColor" : `url(#lz-face-${uid})`}
        fillOpacity={mono ? 0.35 : 1}
      />
      <circle
        cx="24"
        cy="24"
        r="17.4"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity={mono ? 0.35 : 0.22}
        strokeWidth="1"
      />

      {/* Embossed L */}
      <path
        d="M18.6 14.4h5.1v13.1h9.1v4.6H18.6V14.4Z"
        fill={mono ? "currentColor" : `url(#lz-letter-${uid})`}
      />

      {/* Dice pips (Ludo nod) */}
      <circle cx="31.1" cy="17.4" r="1.5" fill={mono ? "currentColor" : "#FFF3CF"} opacity={mono ? 0.7 : 0.95} />
      <circle cx="34.2" cy="21.1" r="1.5" fill={mono ? "currentColor" : "#FFF3CF"} opacity={mono ? 0.45 : 0.6} />

      {/* Specular shine */}
      {!mono && (
        <ellipse
          cx="17.4"
          cy="15.6"
          rx="4.6"
          ry="2.5"
          fill="#FFFFFF"
          opacity="0.32"
          transform="rotate(-32 17.4 15.6)"
        />
      )}
    </svg>
  );
}
