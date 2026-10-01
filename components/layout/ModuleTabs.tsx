"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useRole } from "@/lib/hooks/useRole";
import { visibleNavFor } from "./Sidebar";

// Does a nav href match the current URL? Returns the matched path length
// (longer = more specific) or -1 when it doesn't match.
function matchScore(href: string, pathname: string, type: string | null) {
  const [path, query] = href.split("?");
  const hrefType = query ? new URLSearchParams(query).get("type") : null;
  if (hrefType) return pathname === path && type === hrefType ? path.length + 1 : -1;
  if (type && pathname === path) return -1; // "/deposits" should not win over "/deposits?type=fd"
  return pathname === path || pathname.startsWith(path + "/") ? path.length : -1;
}

/** Horizontal tab bar listing the sub-pages of the active sidebar section. */
export function ModuleTabs() {
  const pathname = usePathname();
  const type = useSearchParams().get("type");
  const { isAdmin, isStaff } = useRole();
  const activeRef = useRef<HTMLAnchorElement>(null);

  let best = { score: -1, section: null as any, href: "" };
  for (const item of visibleNavFor(isAdmin, isStaff)) {
    for (const child of item.children ?? []) {
      const score = matchScore(child.href, pathname, type);
      if (score > best.score) best = { score, section: item, href: child.href };
    }
  }

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [best.href]);

  if (!best.section) return null;
  const section = best.section;

  return (
    <div className="no-print sticky top-16 z-10 -mx-4 md:-mx-6 -mt-4 md:-mt-6 mb-4 md:mb-6 border-b border-slate-200 bg-white/95 backdrop-blur">
      <nav className="flex items-center gap-1 overflow-x-auto px-4 md:px-6 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="mr-3 shrink-0 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
          {section.label}
        </span>
        {section.children.map((child: any) => {
          const Icon = child.icon ?? section.icon;
          const active = child.href === best.href;
          return (
            <Link
              key={child.href}
              ref={active ? activeRef : undefined}
              href={child.href}
              scroll={false}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {child.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
