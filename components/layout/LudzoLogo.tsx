export default function LudzoLogo({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="40" height="40" rx="12" fill="#7C3AED" />
      <path
        d="M10 28V12h4v12h8v4H10z"
        fill="white"
      />
      <circle cx="28" cy="20" r="6" fill="#10B981" />
      <path
        d="M25.5 20l2 2 4-4"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
