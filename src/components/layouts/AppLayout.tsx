import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function AppLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-background w-full">
      <main className="flex-1 min-w-0 overflow-x-hidden pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
