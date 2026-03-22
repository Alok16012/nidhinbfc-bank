"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CreditCard, PiggyBank, BookMarked } from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNav = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Members", href: "/members", icon: Users },
  { label: "Loans", href: "/loans", icon: CreditCard },
  { label: "Deposits", href: "/deposits", icon: PiggyBank },
  { label: "Accounts", href: "/accounting", icon: BookMarked },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-slate-200">
      <div className="flex">
        {mobileNav.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium",
                active ? "text-blue-600" : "text-slate-400"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
