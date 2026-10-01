"use client";

import { useState, useEffect, useRef } from "react";
import { Menu, Bell, Search, LogOut, User, ChevronDown, Clock, ShieldCheck, Loader2, Users, CreditCard, PiggyBank, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatINR, formatDate } from "@/lib/utils";
import { useRole } from "@/lib/hooks/useRole";
import { visibleNavFor } from "./Sidebar";
import { BranchSwitcher } from "./BranchSwitcher";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const router = useRouter();
  const supabase = createClient();
  const { role, roleName, name, email, isAdmin, can } = useRole();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{ members: any[]; loans: any[]; deposits: any[] }>({ members: [], loans: [], deposits: [] });
  const searchRef = useRef<HTMLInputElement>(null);

  // Debounced global search across members, loans and deposits
  useEffect(() => {
    // Commas and parentheses would break the PostgREST .or() filter
    const q = query.trim().replace(/[,()]/g, "");
    if (q.length < 2) { setResults({ members: [], loans: [], deposits: [] }); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const [m, l, d] = await Promise.all([
        supabase
          .from("members")
          .select("id, name, phone, member_id")
          .or(`name.ilike.%${q}%,phone.ilike.%${q}%,member_id.ilike.%${q}%`)
          .limit(6),
        supabase
          .from("loans")
          .select("id, loan_id, status, amount, member:members(name)")
          .ilike("loan_id", `%${q}%`)
          .limit(4),
        supabase
          .from("deposits")
          .select("id, deposit_id, deposit_type, status, member:members(name)")
          .ilike("deposit_id", `%${q}%`)
          .limit(4),
      ]);
      setResults({ members: m.data || [], loans: l.data || [], deposits: d.data || [] });
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, supabase]);

  // Sidebar pages matching the query, e.g. "fd" → Deposits › FD
  const pageQuery = query.trim().toLowerCase();
  const pages = pageQuery
    ? visibleNavFor(isAdmin, can)
        .flatMap((item) => [
          { label: item.label, parent: "", href: item.href, icon: item.icon },
          ...(item.children ?? []).map((c: any) => ({ label: c.label, parent: item.label, href: c.href, icon: c.icon ?? item.icon })),
        ])
        .filter((p, i, all) =>
          (p.label.toLowerCase().includes(pageQuery) || p.parent.toLowerCase().includes(pageQuery)) &&
          all.findIndex((x) => x.href === p.href) === i
        )
        .slice(0, 6)
    : [];

  const resultLinks = [
    ...pages.map((p) => p.href),
    ...results.members.map((m) => `/members/${m.id}`),
    ...results.loans.map((l) => `/loans/${l.id}`),
    ...results.deposits.map((d) => `/deposits/${d.id}`),
  ];

  const goTo = (href: string) => {
    setSearchOpen(false);
    setQuery("");
    searchRef.current?.blur();
    router.push(href);
  };

  useEffect(() => {
    const today = new Date();
    const twoDaysLater = new Date();
    twoDaysLater.setDate(today.getDate() + 2);

    const todayStr = today.toISOString().split("T")[0];
    const laterStr = twoDaysLater.toISOString().split("T")[0];

    supabase
      .from("deposits")
      .select("id, deposit_id, deposit_type, maturity_date, maturity_amount, member:members(name)")
      .eq("status", "active")
      .gte("maturity_date", todayStr)
      .lte("maturity_date", laterStr)
      .then(({ data }) => setNotifications(data || []));
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // Clear all demo cookies
    document.cookie = "sb-demo-access=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "sb-demo-role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "sb-demo-email=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "sb-demo-name=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  };

  const getDaysLeft = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maturity = new Date(dateStr);
    maturity.setHours(0, 0, 0, 0);
    const diff = Math.round((maturity.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    return `In ${diff} days`;
  };

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 z-20 h-16 bg-white border-b border-slate-200 flex items-center px-4 gap-4">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search */}
      <div className="relative flex-1 max-w-md hidden sm:block">
        <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-500 focus-within:ring-2 focus-within:ring-blue-500/30">
          <Search className="h-4 w-4" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && resultLinks.length > 0) goTo(resultLinks[0]);
              if (e.key === "Escape") { setSearchOpen(false); searchRef.current?.blur(); }
            }}
            placeholder="Search members, loans..."
            className="flex-1 bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
          />
          {searching && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        </div>

        {searchOpen && query.trim().length >= 1 && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setSearchOpen(false)} />
            <div className="absolute left-0 right-0 z-50 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden max-h-96 overflow-y-auto">
              {!searching && resultLinks.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">No results for “{query.trim()}”</p>
              ) : (
                <>
                  {pages.length > 0 && (
                    <div>
                      <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Pages</p>
                      {pages.map((p) => {
                        const Icon = p.icon;
                        return (
                          <button
                            key={p.href}
                            onClick={() => goTo(p.href)}
                            className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50"
                          >
                            <Icon className="h-4 w-4 text-slate-500 shrink-0" />
                            <p className="flex-1 text-sm font-medium text-slate-800 truncate">
                              {p.parent && <span className="text-slate-400 font-normal">{p.parent} › </span>}
                              {p.label}
                            </p>
                            <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {results.members.length > 0 && (
                    <div className={pages.length > 0 ? "border-t border-slate-100" : ""}>
                      <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Members</p>
                      {results.members.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => goTo(`/members/${m.id}`)}
                          className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50"
                        >
                          <Users className="h-4 w-4 text-blue-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{m.name}</p>
                            <p className="text-xs text-slate-400">{m.member_id}{m.phone ? ` · ${m.phone}` : ""}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {results.loans.length > 0 && (
                    <div className="border-t border-slate-100">
                      <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Loans</p>
                      {results.loans.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => goTo(`/loans/${l.id}`)}
                          className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50"
                        >
                          <CreditCard className="h-4 w-4 text-emerald-500 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-800 truncate">{l.loan_id}</p>
                            <p className="text-xs text-slate-400 truncate">{l.member?.name} · <span className="capitalize">{l.status}</span></p>
                          </div>
                          <span className="text-xs font-semibold text-slate-600">{formatINR(l.amount)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {results.deposits.length > 0 && (
                    <div className="border-t border-slate-100">
                      <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Deposits</p>
                      {results.deposits.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => goTo(`/deposits/${d.id}`)}
                          className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50"
                        >
                          <PiggyBank className="h-4 w-4 text-amber-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{d.deposit_id}</p>
                            <p className="text-xs text-slate-400 truncate">{d.member?.name} · {d.deposit_type?.toUpperCase()}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <BranchSwitcher />

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          >
            <Bell className="h-5 w-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 z-50 mt-1 w-80 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-semibold text-slate-800">Maturity Alerts</p>
                  {notifications.length > 0 && (
                    <span className="ml-auto bg-red-100 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {notifications.length}
                    </span>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <Bell className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">No upcoming maturities</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <Link
                        key={n.id}
                        href={`/deposits/${n.id}`}
                        onClick={() => setNotifOpen(false)}
                        className="flex items-center justify-between px-4 py-3 hover:bg-amber-50 border-b border-slate-50 last:border-0 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-800">{n.member?.name}</p>
                          <p className="text-xs text-slate-400">{n.deposit_id} · {n.deposit_type.toUpperCase()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-amber-600">{formatINR(n.maturity_amount)}</p>
                          <p className="text-xs font-medium text-red-500">{getDaysLeft(n.maturity_date)}</p>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
                    <p className="text-xs text-slate-500 text-center">Deposits maturing within 2 days</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100"
          >
            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${isAdmin ? "bg-blue-600" : "bg-slate-700"}`}>
              {(name || email || "A")[0].toUpperCase()}
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-sm font-medium text-slate-700 leading-tight">{name || (isAdmin ? "Admin" : email.split("@")[0])}</span>
              <span className="text-[10px] text-slate-400 capitalize leading-tight">{isAdmin ? "admin" : roleName || role}</span>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 z-50 mt-1 w-52 rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-800">{name || (isAdmin ? "Admin" : email.split("@")[0])}</p>
                  <p className="text-[11px] text-slate-400 truncate">{email}</p>
                  <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${isAdmin ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                    <ShieldCheck className="h-3 w-3" />{isAdmin ? "admin" : roleName || role}
                  </span>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <User className="h-4 w-4" />
                  Profile
                </Link>
                <hr className="my-1 border-slate-100" />
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
