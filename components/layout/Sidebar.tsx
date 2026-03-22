"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  PiggyBank,
  BookOpen,
  ArrowDownUp,
  CalendarDays,
  BookMarked,
  BarChart3,
  UserCog,
  Receipt,
  Settings,
  Building2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Members",
    href: "/members",
    icon: Users,
  },
  {
    label: "Loans",
    href: "/loans",
    icon: CreditCard,
  },
  {
    label: "Deposits",
    href: "/deposits",
    icon: PiggyBank,
  },
  {
    label: "Passbook",
    href: "/passbook",
    icon: BookOpen,
  },
  {
    label: "Withdrawals",
    href: "/withdrawals",
    icon: ArrowDownUp,
  },
  {
    label: "Collection",
    href: "/collection",
    icon: CalendarDays,
  },
  {
    label: "Accounting",
    href: "/accounting",
    icon: BookMarked,
    children: [
      { label: "Day Book", href: "/accounting" },
      { label: "Ledger", href: "/accounting/ledger" },
      { label: "Trial Balance", href: "/accounting/trial-balance" },
      { label: "Vouchers", href: "/accounting/vouchers" },
    ],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
  },
  {
    label: "Staff",
    href: "/staff",
    icon: UserCog,
  },
  {
    label: "Expenses",
    href: "/expenses",
    icon: Receipt,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const content = (
    <div className="flex h-full flex-col bg-slate-900 text-white">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">Sahayog</p>
            <p className="text-[10px] text-slate-400 leading-tight">Credit Cooperative</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          if (item.children) {
            const anyChildActive = item.children.some((c) => isActive(c.href));
            return (
              <div key={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium",
                    anyChildActive ? "text-white bg-slate-800" : "text-slate-400"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </div>
                <div className="ml-7 mt-0.5 space-y-0.5">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onClose}
                      className={cn(
                        "block px-3 py-1.5 rounded-lg text-sm",
                        isActive(child.href)
                          ? "text-blue-400 font-medium"
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800 p-4">
        <p className="text-[11px] text-slate-500 text-center">
          Cooperative CRM v1.0
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 lg:z-30">
        {content}
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />
          <aside className="relative flex flex-col w-64 h-full">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
