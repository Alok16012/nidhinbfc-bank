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
  Upload,
  X,
  Bell,
  Wallet,
  Star,
  RefreshCw,
  TrendingUp,
  Landmark,
  NotebookPen,
  BookText,
  Scale,
  FileText,
  HandCoins,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/mobile/Brand";
import { useRole } from "@/lib/hooks/useRole";
import { routePermission, type Permission } from "@/lib/permissions";

export const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Branches",
    href: "/branches",
    icon: Building2,
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
    // tabOnly sub-pages show in the tab bar under the header, not in the sidebar
    children: [
      { label: "All Deposits",       href: "/deposits",                 icon: PiggyBank, tabOnly: true },
      { label: "Savings",            href: "/deposits?type=savings",    icon: Landmark, tabOnly: true },
      { label: "FD",                 href: "/deposits?type=fd",         icon: Star, tabOnly: true },
      { label: "RD",                 href: "/deposits?type=rd",         icon: RefreshCw, tabOnly: true },
      { label: "DRD",                href: "/deposits?type=drd",        icon: TrendingUp, tabOnly: true },
      { label: "MIS",                href: "/deposits?type=mis",        icon: BarChart3, tabOnly: true },
    ],
  },
  {
    label: "Maturity Alerts",
    href: "/maturity",
    icon: Bell,
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
    label: "Loans",
    href: "/loans",
    icon: CreditCard,
  },
  {
    label: "Collection",
    href: "/deposit-collection",
    icon: HandCoins,
    children: [
      { label: "Deposit Collection",  href: "/deposit-collection", icon: Wallet,       tabOnly: true },
      { label: "Loan EMI Collection", href: "/collection",         icon: CalendarDays, tabOnly: true },
    ],
  },
  {
    label: "Accounting",
    href: "/accounting",
    icon: BookMarked,
    children: [
      { label: "Day Book",      href: "/accounting",               icon: NotebookPen, tabOnly: true },
      { label: "Ledger",        href: "/accounting/ledger",        icon: BookText, tabOnly: true },
      { label: "Trial Balance", href: "/accounting/trial-balance", icon: Scale, tabOnly: true },
      { label: "Vouchers",      href: "/accounting/vouchers",      icon: FileText, tabOnly: true },
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
    label: "Ledger Import",
    href: "/import",
    icon: Upload,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
  {
    label: "Profile",
    href: "/profile",
    icon: Users,
  },
];

// Permission-based visibility, shared with the tab bar and header search
export function visibleNavFor(isAdmin: boolean, can: (p: Permission) => boolean) {
  const allowed = (href: string) => {
    const need = routePermission(href.split("?")[0]);
    return !need || (need === "admin" ? isAdmin : can(need));
  };
  return navItems
    .map((item) => {
      if (!item.children) return item;
      const children = item.children.filter((c) => allowed(c.href));
      // The section link opens the first sub-page this user may see
      return { ...item, children, href: children[0]?.href ?? item.href };
    })
    .filter((item) => (item.children ? item.children.length > 0 : allowed(item.href)));
}

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { isAdmin, can } = useRole();

  const visibleNavItems = visibleNavFor(isAdmin, can);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    // For query-param links like /deposits?type=fd, check pathname only
    const hrefPath = href.split("?")[0];
    if (href.includes("?")) {
      // active only when pathname AND query match
      if (typeof window === "undefined") return false;
      return pathname === hrefPath && window.location.search === `?type=${href.split("type=")[1]}`;
    }
    return pathname.startsWith(hrefPath);
  };

  const content = (
    <div className="flex h-full flex-col text-white" style={{ background: "var(--blue-dark)" }}>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-5 border-b border-white/15">
        <div className="flex items-center gap-2.5">
          <div className="rounded-[10px] bg-white p-1 flex"><BrandMark size={28} /></div>
          <div>
            <p className="text-[15px] font-extrabold leading-tight tracking-wide text-white">GRIHSEVAK</p>
            <p className="text-[10px] font-semibold leading-tight tracking-[0.08em] text-white/65">NIDHI LIMITED</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-white/70 hover:text-white">
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
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    anyChildActive ? "text-white bg-white/15 font-semibold" : "text-white/80 hover:text-white hover:bg-white/10"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </Link>
                <div className="ml-4 mt-0.5 space-y-0.5">
                  {item.children.filter((c: any) => !c.tabOnly).map((child) => {
                    const CIcon = (child as any).icon;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm",
                          isActive(child.href)
                            ? "bg-white/15 text-white font-semibold"
                            : "text-white/75 hover:text-white hover:bg-white/10"
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
                  ? "bg-white/15 text-white font-semibold"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/15 p-4">
        <p className="text-[11px] text-white/50 text-center uppercase tracking-widest font-medium">
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
