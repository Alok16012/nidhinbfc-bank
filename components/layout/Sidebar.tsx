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
  Home,
  Hand,
  X,
  Bell,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/lib/hooks/useRole";

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
    label: "Deposits",
    href: "/deposits",
    icon: PiggyBank,
    children: [
      { label: "All Deposits",        href: "/deposits",            icon: PiggyBank    },
      { label: "Passbook",            href: "/passbook",            icon: BookOpen     },
      { label: "Deposit Collection",  href: "/deposit-collection",  icon: Wallet       },
      { label: "Maturity Alerts",     href: "/maturity",            icon: Bell         },
      { label: "Withdrawals",         href: "/withdrawals",         icon: ArrowDownUp  },
    ],
  },
  {
    label: "Loans",
    href: "/loans",
    icon: CreditCard,
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
      { label: "Day Book",      href: "/accounting"                },
      { label: "Ledger",        href: "/accounting/ledger"         },
      { label: "Trial Balance", href: "/accounting/trial-balance"  },
      { label: "Vouchers",      href: "/accounting/vouchers"       },
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
  const { isStaff, isAdmin, loading: roleLoading } = useRole();

  // Role-based visibility
  const visibleNavItems = navItems.filter((item) => {
    if (item.href === "/settings"   && !isAdmin) return false;
    if (item.href === "/staff"      && !isAdmin) return false;
    if (item.href === "/accounting" && isStaff)  return false;
    if (item.href === "/reports"    && isStaff)  return false;
    return true;
  });

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const content = (
    <div className="flex h-full flex-col bg-slate-900 text-white">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center border-2 border-yellow-200/50 shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-900/10"></div>
            <div className="relative flex flex-col items-center">
              <Home className="h-4 w-4 text-slate-900" />
              <Hand className="h-3 w-3 text-slate-900 -mt-1" />
            </div>
          </div>
          <div>
            <p className="text-[13px] font-bold leading-tight tracking-tight text-white uppercase">Grihsevak Nidhi</p>
            <p className="text-[9px] text-yellow-500 font-medium leading-tight uppercase tracking-widest">Nidhi Limited</p>
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
        {visibleNavItems.map((item) => {
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
                <div className="ml-4 mt-0.5 space-y-0.5">
                  {item.children.map((child) => {
                    const CIcon = (child as any).icon;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm",
                          isActive(child.href)
                            ? "bg-blue-600 text-white font-medium"
                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                        )}
                      >
                        {CIcon && <CIcon className="h-3.5 w-3.5 flex-shrink-0" />}
                        {child.label}
                      </Link>
                    );
                  })}
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
        <p className="text-[11px] text-slate-500 text-center uppercase tracking-widest font-medium">
          Grihsevak Nidhi v1.0
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
