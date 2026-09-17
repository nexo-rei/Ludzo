import {
  ActivityIcon,
  AlertTriangleIcon,
  AwardIcon,
  CheckIcon,
  CheckCircleIcon,
  CoinsDuotoneIcon,
  DepositDuotoneIcon,
  DiceIcon,
  FlagIcon,
  LifeBuoyIcon,
  MegaphoneIcon,
  RefreshIcon,
  ShieldIcon,
  StarIcon,
  StreakFlameIcon,
  TargetIcon,
  TimerIcon,
  UsersIcon,
  WithdrawDuotoneIcon,
  WrenchIcon,
  ZapIcon,
} from "@/components/ui/DuotoneIcons";

/**
 * Semantic SVG replacements for legacy decorative symbols.
 * All icons are now hand-drawn Ludzo duotone marks (components/ui/DuotoneIcons.tsx)
 * — no third-party icon library is rendered in the internal workspace anymore.
 */
const icons = {
  activity: ActivityIcon,
  deposit: DepositDuotoneIcon,
  withdraw: WithdrawDuotoneIcon,
  award: AwardIcon,
  check: CheckIcon,
  success: CheckCircleIcon,
  coins: CoinsDuotoneIcon,
  help: LifeBuoyIcon,
  clock: TimerIcon,
  bolt: ZapIcon,
  dice: DiceIcon,
  flag: FlagIcon,
  streak: StreakFlameIcon,
  announcement: MegaphoneIcon,
  repeat: RefreshIcon,
  shield: ShieldIcon,
  star: StarIcon,
  target: TargetIcon,
  warning: AlertTriangleIcon,
  users: UsersIcon,
  tools: WrenchIcon,
  fast: ZapIcon,
};

export default function SymbolIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = icons[name as keyof typeof icons] ?? ActivityIcon;
  return <Icon size={size} className="inline-block align-middle shrink-0" aria-hidden="true" />;
}
