"use client";

import { useState, Suspense } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { AccessGuard } from "@/components/layout/AccessGuard";
import { BottomNav } from "@/components/mobile/BottomNav";

// Desktop: sidebar + header. Phones (and the Android app): a single 430px
// column on the app canvas with a floating bottom nav; each page's
// PageHeader becomes the sticky top bar and carries the section tabs.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="m-shell min-h-screen bg-slate-50">
      <div className="no-print"><Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} /></div>
      <div className="no-print hidden lg:block"><Header onMenuClick={() => setSidebarOpen(true)} /></div>
      <main className="lg:pl-64 lg:pt-16 pb-[calc(96px+env(safe-area-inset-bottom))] lg:pb-0 print:pl-0 print:pt-0 print:pb-0">
        <div className="mx-auto max-w-[430px] px-4 pb-4 md:max-w-[720px] md:px-6 lg:max-w-[1400px] lg:p-6">
          <div className="hidden lg:block"><Suspense fallback={null}><ModuleTabs /></Suspense></div>
          <AccessGuard>{children}</AccessGuard>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
