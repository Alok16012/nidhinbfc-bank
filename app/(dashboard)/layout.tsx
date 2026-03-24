"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="no-print"><Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} /></div>
      <div className="no-print"><Header onMenuClick={() => setSidebarOpen(true)} /></div>
      <main className="lg:pl-64 pt-16 pb-20 lg:pb-0 print:pl-0 print:pt-0 print:pb-0">
        <div className="p-4 md:p-6 max-w-[1400px] mx-auto">{children}</div>
      </main>
      <div className="no-print"><MobileNav /></div>
    </div>
  );
}
