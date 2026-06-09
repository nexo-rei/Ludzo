import React from 'react';

export default function LudzoLogo({ size = 64, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="ludzo-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <filter id="ludzo-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Outer hexagon */}
      <path
        d="M32 4 L56 18 L56 46 L32 60 L8 46 L8 18 Z"
        fill="url(#ludzo-grad)"
        filter="url(#ludzo-glow)"
        opacity="0.9"
      />
      {/* Inner L shape */}
      <path
        d="M20 20 L20 44 L44 44 L44 38 L26 38 L26 20 Z"
        fill="white"
        opacity="0.95"
      />
      {/* Accent dot */}
      <circle cx="46" cy="20" r="4" fill="#f59e0b" />
    </svg>
  );
}
