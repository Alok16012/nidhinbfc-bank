"use client";

import { Suspense } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { TAB_ROOTS } from "@/components/mobile/BottomNav";
import { BackIcon } from "@/components/mobile/icons";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const showBack = !TAB_ROOTS.includes(pathname);

  const back = () => {
    if (window.history.length > 1) router.back();
    else router.push(pathname.split("/").slice(0, -1).join("/") || "/dashboard");
  };

  return (
    <>
      {/* Phones: sticky app bar — back arrow, title, one action — with the section tabs under it. */}
      <div className="no-print lg:hidden sticky top-0 z-20 -mx-4 px-4 md:-mx-6 md:px-6 pb-3" style={{
        background: "var(--app-bg)", paddingTop: "calc(18px + env(safe-area-inset-top))",
      }}>
        <div className="flex items-center" style={{ gap: 14, minHeight: 32 }}>
          {showBack && (
            <button onClick={back} aria-label="Back" className="press" style={{ background: "none", border: "none", padding: 0, display: "flex", cursor: "pointer" }}>
              <BackIcon c="var(--ink)" />
            </button>
          )}
          <h1 className="truncate" style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "var(--ink)", flex: 1 }}>{title}</h1>
          {children && <div className="m-header-actions flex items-center gap-2">{children}</div>}
        </div>
        <Suspense fallback={null}><ModuleTabs variant="mobile" /></Suspense>
      </div>

      <div className={cn("hidden lg:flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between", className)}>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {description && (
            <p className="text-sm text-slate-500 mt-0.5">{description}</p>
          )}
        </div>
        {children && <div className="flex items-center gap-2 mt-2 sm:mt-0">{children}</div>}
      </div>
    </>
  );
}
