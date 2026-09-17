import { Activity, ArrowDownToLine, ArrowUpFromLine, Award, Check, CircleCheck, Coins, Dice5, Flag, Flame, Megaphone, RotateCw, ShieldCheck, Star, Target, TriangleAlert, Users, Wrench, Zap } from "lucide-react";
/** Semantic SVG replacements for legacy decorative symbols. */
const icons = { activity: Activity, deposit: ArrowDownToLine, withdraw: ArrowUpFromLine, award: Award, check: Check, success: CircleCheck, coins: Coins, dice: Dice5, flag: Flag, streak: Flame, announcement: Megaphone, repeat: RotateCw, shield: ShieldCheck, star: Star, target: Target, warning: TriangleAlert, users: Users, tools: Wrench, fast: Zap };
export default function SymbolIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = icons[name as keyof typeof icons] ?? Activity;
  return <Icon size={size} strokeWidth={1.6} className="inline-block align-middle shrink-0" aria-hidden="true" />;
}
