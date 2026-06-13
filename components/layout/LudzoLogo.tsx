export default function LudzoLogo({
  size = 40,
  className = "",
  variant = "default",
}: {
  size?: number;
  className?: string;
  variant?: "default" | "dark" | "light" | "mono";
}) {
  const gradId = `logo-g-${variant}`;
  const gradColors =
    variant === "light"
      ? { from: "#7C3AED", to: "#6D28D9" }
      : variant === "dark"
      ? { from: "#A855F7", to: "#7C3AED" }
      : { from: "#7C3AED", to: "#5B21B6" };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Diamond background */}
      <path
        d="M24 2L44 14V34L24 46L4 34V14L24 2Z"
        fill={`url(#${gradId})`}
      />
      {/* Subtle inner edge */}
      <path
        d="M24 4L43 15.5V32.5L24 44L5 32.5V15.5L24 4Z"
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="0.5"
      />
      {/* Geometric L */}
      <path
        d="M16 14V34H32V29H21V14H16Z"
        fill="white"
      />
      {/* Lightning cut accent */}
      <path
        d="M21 22L27.5 18.5L24.5 23.5L31 21"
        stroke="#F59E0B"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Top shine */}
      <ellipse
        cx="18"
        cy="14"
        rx="4"
        ry="2"
        fill="rgba(255,255,255,0.12)"
        transform="rotate(-20 18 14)"
      />
      <defs>
        <linearGradient id={gradId} x1="4" y1="2" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={gradColors.from} />
          <stop offset="100%" stopColor={gradColors.to} />
        </linearGradient>
      </defs>
    </svg>
  );
}
