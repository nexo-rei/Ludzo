import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRankLabel(rank: number): string {
  if (rank === 1) return 'Legend';
  if (rank === 2) return 'Diamond';
  if (rank === 3) return 'Gold';
  return '';
}

export function formatCoins(amount: number): string {
  return amount.toLocaleString();
}

export function truncate(str: string, length: number): string {
  if (!str || str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function getRankColor(rank: string): string {
  switch (rank) {
    case 'owner': return 'text-purple-400';
    case 'admin': return 'text-blue-400';
    case 'moderator': return 'text-green-400';
    default: return 'text-gray-400';
  }
}
