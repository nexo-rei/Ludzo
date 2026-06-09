import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, ClipboardList, ArrowDownCircle,
  ArrowUpCircle, Settings, Megaphone, Menu, X, LogOut
} from 'lucide-react';
import LudzoLogo from '@/components/common/LudzoLogo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const NAV = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/admin/users', icon: Users, label: 'Users' },
  { path: '/admin/tasks', icon: ClipboardList, label: 'Tasks' },
  { path: '/admin/deposits', icon: ArrowDownCircle, label: 'Deposits' },
  { path: '/admin/withdrawals', icon: ArrowUpCircle, label: 'Withdrawals' },
  { path: '/admin/announcements', icon: Megaphone, label: 'Announcements' },
  { path: '/admin/settings', icon: Settings, label: 'Settings' },
];

function NavItems({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-1">
      {NAV.map(({ path, icon: Icon, label, exact }) => (
        <NavLink
          key={path}
          to={path}
          end={exact}
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
            ${isActive ? 'bg-primary text-primary-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`
          }
        >
          <Icon className="w-4 h-4 shrink-0" />
          {label}
        </NavLink>
      ))}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors mt-2"
      >
        <LogOut className="w-4 h-4 shrink-0" />
        Back to App
      </button>
    </div>
  );
}

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-sidebar border-r border-sidebar-border p-4 gap-6">
        <div className="flex items-center gap-2 px-1">
          <LudzoLogo size={28} />
          <span className="font-bold text-base gradient-text">Admin</span>
        </div>
        <NavItems />
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border flex items-center gap-3 px-4 py-3 lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-56 bg-sidebar p-4 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LudzoLogo size={24} />
                  <span className="font-bold gradient-text">Admin</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="text-sidebar-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <NavItems onClose={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="font-bold text-foreground">LUDZO Admin</span>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
