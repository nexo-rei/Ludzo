"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListChecks, Gamepad2, Users, UserRound, History, Settings, CircleHelp, ArrowUpRight } from "lucide-react";
import LudzoLogo from "./LudzoLogo";
const items = [
  { href: "/home", label: "Overview", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks & rewards", icon: ListChecks },
  { href: "/games/home", label: "Game arena", icon: Gamepad2 },
  { href: "/refer", label: "Referrals", icon: Users },
  { href: "/history", label: "Transactions", icon: History },
  { href: "/profile", label: "My account", icon: UserRound },
];
export default function WorkspaceNav() {
  const pathname = usePathname();
  return <aside className="workspace-sidebar">
    <Link href="/home" className="workspace-brand"><LudzoLogo size={35} /><span>ludzo<span className="brand-period">.</span></span></Link>
    <div className="sidebar-caption">WORKSPACE</div>
    <nav aria-label="Workspace">{items.map(({ href, label, icon: Icon }) => {
      const active = href.startsWith("/games") ? pathname.startsWith("/games") : pathname === href;
      return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`sidebar-link ${active ? "is-active" : ""}`}><Icon size={19} strokeWidth={1.6} />{label}{active && <span className="sidebar-dot" />}</Link>;
    })}</nav>
    <div className="sidebar-bottom"><div className="sidebar-note"><Gamepad2 size={22} /><h3>A little strategy.<br />A new challenge.</h3><Link href="/games/home">Explore the arena <ArrowUpRight size={15} /></Link></div>
    <Link className="sidebar-link" href="/settings"><Settings size={18} />Settings</Link><Link className="sidebar-link" href="/support"><CircleHelp size={18} />Help & support</Link><p className="sidebar-footnote">Your next move starts here.</p></div>
  </aside>;
}
