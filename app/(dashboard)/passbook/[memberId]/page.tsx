"use client";

import { use, useState, useEffect, useMemo, useCallback } from "react";
import {
  Download, BookOpen, RefreshCw, Phone, Mail, MapPin,
  Calendar, CreditCard, User, Landmark, ShieldCheck, BadgeIndianRupee
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { PassbookTable } from "@/components/passbook/PassbookTable";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { formatINR, formatDate, cn, getInitials, calculateAge } from "@/lib/utils";
import type { DateRange } from "@/components/shared/DateRangePicker";

type BookTab = "all" | "fd" | "rd" | "drd" | "savings" | "mis";

const TABS: { id: BookTab; label: string; color: string; activeClass: string }[] = [
  { id: "all",     label: "All Transactions", color: "text-slate-600",   activeClass: "bg-slate-800 text-white" },
  { id: "savings", label: "Savings",          color: "text-blue-700",    activeClass: "bg-blue-600 text-white" },
  { id: "fd",      label: "FD",               color: "text-amber-700",   activeClass: "bg-amber-600 text-white" },
  { id: "rd",      label: "RD",               color: "text-purple-700",  activeClass: "bg-purple-600 text-white" },
  { id: "drd",     label: "DRD",              color: "text-emerald-700", activeClass: "bg-emerald-600 text-white" },
  { id: "mis",     label: "MIS",              color: "text-rose-700",    activeClass: "bg-rose-600 text-white" },
];

export default function PassbookPage({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = use(params);
  const [member, setMember]     = useState<any | null>(null);
  const [entries, setEntries]   = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<BookTab>("all");
  const [pdfLoading, setPdfLoading] = useState(false);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    if (!memberId) return;
    setLoading(true);
    let query = supabase
      .from("passbook")
      .select("*")
      .eq("member_id", memberId)
      .order("transaction_date", { ascending: true });
    if (dateRange) {
      query = query.gte("transaction_date", dateRange.from).lte("transaction_date", dateRange.to);
    }
    const { data } = await query;
    setEntries(data || []);
    setLoading(false);
  }, [memberId, supabase, dateRange]);

  useEffect(() => {
    supabase.from("members").select("*").eq("id", memberId).single().then(({ data }) => setMember(data));
  }, [memberId, supabase]);

  useEffect(() => {
    supabase.from("deposits").select("id, deposit_type, deposit_no, amount, status, maturity_date, interest_rate")
      .eq("member_id", memberId)
      .then(({ data }) => setDeposits(data || []));
  }, [memberId, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const depositTypeMap = useMemo(() => {
    const map: Record<string, string> = {};
    deposits.forEach((d) => { map[d.id] = d.deposit_type ?? d.type ?? ""; });
    return map;
  }, [deposits]);

  const filteredEntries = useMemo(() => {
    if (activeTab === "all") return entries;
    return entries.filter((e) => {
      if (e.reference_type !== "deposit" || !e.reference_id) return false;
      return depositTypeMap[e.reference_id] === activeTab;
    });
  }, [entries, activeTab, depositTypeMap]);

  const tabCounts = useMemo(() => {
    const counts: Record<BookTab, number> = { all: entries.length, fd: 0, rd: 0, drd: 0, savings: 0, mis: 0 };
    entries.forEach((e) => {
      if (e.reference_type === "deposit" && e.reference_id) {
        const t = depositTypeMap[e.reference_id] as BookTab;
        if (t && t in counts) counts[t]++;
      }
    });
    return counts;
  }, [entries, depositTypeMap]);

  const totalCredit = filteredEntries.reduce((s, e) => s + (e.credit || 0), 0);
  const totalDebit  = filteredEntries.reduce((s, e) => s + (e.debit  || 0), 0);
  const balance     = filteredEntries[filteredEntries.length - 1]?.balance ?? 0;

  // ── PDF Download ──────────────────────────────────────────────────────────
  const downloadPDF = async () => {
    if (!member) return;
    setPdfLoading(true);
    try {
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
      const doc = await PDFDocument.create();
      const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
      const fontReg  = await doc.embedFont(StandardFonts.Helvetica);
      const inr = (n: number) => formatINR(n).replace("₹", "Rs.");
      const tabLabel = TABS.find((t) => t.id === activeTab)?.label ?? "All Transactions";

      const addPage = () => { const p = doc.addPage([595, 842]); return { p, y: 800 }; };
      let { p, y } = addPage();
      const lm = 40, rm = 555, rowH = 16;

      const text = (page: typeof p, str: string, x: number, yy: number, size: number, font = fontReg, color = rgb(0,0,0)) =>
        page.drawText(str, { x, y: yy, size, font, color });

      text(p, "Grihsevak Nidhi Limited", 185, y, 16, fontBold); y -= 18;
      text(p, `Member Passbook - ${tabLabel}`, 210, y, 11, fontReg, rgb(0.28, 0.33, 0.4)); y -= 6;
      p.drawLine({ start: { x: lm, y }, end: { x: rm, y }, thickness: 1, color: rgb(0.12, 0.16, 0.23) }); y -= 16;
      text(p, "Member:", lm, y, 10, fontBold); text(p, member.name, lm + 52, y, 10);
      text(p, "Member ID:", 320, y, 10, fontBold); text(p, member.member_id, 390, y, 10); y -= 14;
      text(p, "Phone:", lm, y, 10, fontBold); text(p, member.phone || "—", lm + 52, y, 10);
      text(p, "Date:", 320, y, 10, fontBold); text(p, new Date().toLocaleDateString("en-IN"), 390, y, 10); y -= 18;

      p.drawRectangle({ x: lm, y: y - 4, width: rm - lm, height: 18, color: rgb(0.95, 0.97, 0.99) });
      text(p, `Total Credit: ${inr(totalCredit)}`, lm + 6, y + 2, 9, fontBold, rgb(0.09, 0.64, 0.29));
      text(p, `Total Debit: ${inr(totalDebit)}`, 230, y + 2, 9, fontBold, rgb(0.86, 0.15, 0.15));
      text(p, `Balance: ${inr(balance)}`, 390, y + 2, 9, fontBold, rgb(0.11, 0.31, 0.87)); y -= 24;

      const cols = [lm, lm+70, lm+155, lm+300, lm+375, lm+450];
      const colW = [70, 85, 145, 75, 75, 65];
      p.drawRectangle({ x: lm, y: y - 4, width: rm - lm, height: rowH, color: rgb(0.12, 0.16, 0.23) });
      ["Date","Transaction","Narration","Debit","Credit","Balance"].forEach((h, i) => text(p, h, cols[i]+3, y+2, 8, fontBold, rgb(1,1,1)));
      y -= rowH + 2;

      for (const [idx, e] of filteredEntries.entries()) {
        if (y < 60) {
          ({ p, y } = addPage());
          p.drawRectangle({ x: lm, y: y - 4, width: rm - lm, height: rowH, color: rgb(0.12, 0.16, 0.23) });
          ["Date","Transaction","Narration","Debit","Credit","Balance"].forEach((h, i) => text(p, h, cols[i]+3, y+2, 8, fontBold, rgb(1,1,1)));
          y -= rowH + 2;
        }
        if (idx % 2 === 0) p.drawRectangle({ x: lm, y: y - 4, width: rm - lm, height: rowH, color: rgb(0.97, 0.98, 0.99) });
        const row = [formatDate(e.transaction_date), (e.type ?? "").replace(/_/g," "), (e.narration ?? "").substring(0,30), e.debit > 0 ? inr(e.debit) : "-", e.credit > 0 ? inr(e.credit) : "-", inr(e.balance)];
        row.forEach((val, i) => {
          const color = i === 3 ? rgb(0.86, 0.15, 0.15) : i === 4 ? rgb(0.09, 0.64, 0.29) : rgb(0.1, 0.1, 0.1);
          const xPos = i >= 3 ? cols[i] + colW[i] - fontReg.widthOfTextAtSize(val, 8) - 3 : cols[i] + 3;
          text(p, val, xPos, y + 2, 8, i === 5 ? fontBold : fontReg, color);
        });
        p.drawLine({ start: { x: lm, y: y - 4 }, end: { x: rm, y: y - 4 }, thickness: 0.3, color: rgb(0.88, 0.9, 0.93) });
        y -= rowH;
      }
      text(p, `Generated on ${new Date().toLocaleString("en-IN")} · Grihsevak Nidhi Limited`, 140, y - 8, 8, fontReg, rgb(0.58, 0.64, 0.7));

      const bytes = await doc.save();
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `passbook-${activeTab}-${member.member_id}-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { console.error(err); }
    setPdfLoading(false);
  };

  const currentTab = TABS.find((t) => t.id === activeTab)!;

  const depositTypeLabel: Record<string, string> = {
    savings: "Savings", fd: "FD", rd: "RD", drd: "DRD", mis: "MIS",
    SAVINGS: "Savings", FD: "FD", RD: "RD", DRD: "DRD", MIS: "MIS",
  };
  const depositColor: Record<string, string> = {
    savings: "bg-blue-50 border-blue-200 text-blue-700",
    fd: "bg-amber-50 border-amber-200 text-amber-700",
    rd: "bg-purple-50 border-purple-200 text-purple-700",
    drd: "bg-emerald-50 border-emerald-200 text-emerald-700",
    mis: "bg-rose-50 border-rose-200 text-rose-700",
    SAVINGS: "bg-blue-50 border-blue-200 text-blue-700",
    FD: "bg-amber-50 border-amber-200 text-amber-700",
    RD: "bg-purple-50 border-purple-200 text-purple-700",
    DRD: "bg-emerald-50 border-emerald-200 text-emerald-700",
    MIS: "bg-rose-50 border-rose-200 text-rose-700",
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <PageHeader
        title="Member Passbook"
        description={member ? `${member.name} · ${member.member_id}` : "Loading..."}
      >
        <div className="flex items-center gap-2">
          <button onClick={fetchData} disabled={loading}
            className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors" title="Refresh">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <button onClick={downloadPDF} disabled={pdfLoading || loading || !member}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
            <Download className="h-4 w-4" />
            {pdfLoading ? "Generating..." : `Download ${activeTab === "all" ? "" : currentTab.label + " "}PDF`}
          </button>
        </div>
      </PageHeader>

      {/* ── PASSBOOK COVER / MEMBER DETAILS CARD ─────────────────────── */}
      {member && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Blue gradient header strip */}
          <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              {member.photo_url ? (
                <img src={member.photo_url} alt={member.name}
                  className="h-16 w-16 rounded-full object-cover border-2 border-white/40 shadow" />
              ) : (
                <div className="h-16 w-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-white text-2xl font-bold shadow">
                  {getInitials(member.name)}
                </div>
              )}
              <div>
                <p className="text-white text-xl font-bold leading-tight">{member.name}</p>
                <p className="text-blue-100 text-sm mt-0.5">{member.member_id}</p>
                <span className={cn("inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold",
                  member.status === "active" ? "bg-green-400/30 text-green-100 border border-green-300/40" : "bg-red-400/30 text-red-100 border border-red-300/40")}>
                  {(member.status ?? "active").toUpperCase()}
                </span>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-blue-100 text-xs uppercase tracking-wider font-medium">Grihsevak Nidhi Limited</p>
              <p className="text-white/70 text-xs mt-1">Member Since {member.join_date ? formatDate(member.join_date) : formatDate(member.created_at)}</p>
              <p className="text-white font-bold text-lg mt-1">{formatINR(member.share_capital || 0)}</p>
              <p className="text-blue-200 text-xs">Share Capital</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

            {/* Personal Info */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Personal Info</p>
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <Phone className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Mobile</p>
                    <p className="text-sm font-semibold text-slate-800">{member.phone || "—"}</p>
                  </div>
                </div>
                {member.email && (
                  <div className="flex items-start gap-2.5">
                    <Mail className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">Email</p>
                      <p className="text-sm font-semibold text-slate-800 break-all">{member.email}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2.5">
                  <Calendar className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Date of Birth</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {member.dob ? `${formatDate(member.dob)} (${calculateAge(member.dob)} yrs)` : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <User className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Gender / Occupation</p>
                    <p className="text-sm font-semibold text-slate-800 capitalize">
                      {[member.gender, member.occupation].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Address & KYC */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Address & KYC</p>
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Permanent Address</p>
                    <p className="text-sm font-semibold text-slate-800 leading-snug">
                      {[member.address, member.city, member.state, member.pincode].filter(Boolean).join(", ") || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Aadhar</p>
                    <p className="text-sm font-semibold text-slate-800 font-mono">
                      {member.aadhar ? `XXXX XXXX ${member.aadhar.slice(-4)}` : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <CreditCard className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">PAN</p>
                    <p className="text-sm font-semibold text-slate-800 font-mono">{member.pan || "—"}</p>
                  </div>
                </div>
                {(member.nominee_name) && (
                  <div className="flex items-start gap-2.5">
                    <User className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">Nominee</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {member.nominee_name}
                        {member.nominee_relation ? ` (${member.nominee_relation})` : ""}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bank & Accounts */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bank Details</p>
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <Landmark className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Bank Name</p>
                    <p className="text-sm font-semibold text-slate-800">{member.bank_name || "—"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <BadgeIndianRupee className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Account No</p>
                    <p className="text-sm font-semibold text-slate-800 font-mono">{member.bank_account_no || "—"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <CreditCard className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">IFSC Code</p>
                    <p className="text-sm font-semibold text-slate-800 font-mono">{member.bank_ifsc || "—"}</p>
                  </div>
                </div>
                {member.father_name && (
                  <div className="flex items-start gap-2.5">
                    <User className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">Guardian / Father</p>
                      <p className="text-sm font-semibold text-slate-800">{member.father_name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Deposit Accounts Strip */}
          {deposits.length > 0 && (
            <div className="border-t border-slate-100 px-5 py-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Deposit Accounts</p>
              <div className="flex flex-wrap gap-2">
                {deposits.map((dep) => {
                  const dtype = (dep.deposit_type ?? dep.type ?? "").toLowerCase();
                  const colorClass = depositColor[dtype] || depositColor[dep.deposit_type] || "bg-slate-50 border-slate-200 text-slate-700";
                  return (
                    <div key={dep.id} className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold", colorClass)}>
                      <span>{depositTypeLabel[dep.deposit_type] ?? depositTypeLabel[dtype] ?? dtype.toUpperCase()}</span>
                      <span className="font-mono">{dep.deposit_no}</span>
                      <span className="opacity-60">·</span>
                      <span>{formatINR(dep.amount)}</span>
                      {dep.status === "active" && <span className="bg-green-500 h-1.5 w-1.5 rounded-full" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary bar */}
          <div className="border-t border-slate-100 grid grid-cols-3 divide-x divide-slate-100">
            {[
              { label: "Total Credit", value: formatINR(totalCredit), color: "text-emerald-600" },
              { label: "Total Debit",  value: formatINR(totalDebit),  color: "text-red-500" },
              { label: "Balance",      value: formatINR(balance),     color: "text-blue-600" },
            ].map((s) => (
              <div key={s.label} className="text-center py-4">
                <p className={cn("text-lg font-bold", s.color)}>{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Transaction Tabs ──────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = tabCounts[tab.id];
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border",
                isActive
                  ? `${tab.activeClass} border-transparent shadow-md`
                  : `bg-white ${tab.color} border-slate-200 hover:border-current hover:shadow-sm`
              )}>
              <BookOpen className="h-3.5 w-3.5" />
              {tab.label}
              {count > 0 && (
                <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-semibold",
                  isActive ? "bg-white/20" : "bg-slate-100 text-slate-600")}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Transactions Table ────────────────────────────────────────── */}
      {!loading && activeTab !== "all" && filteredEntries.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-16 text-center">
          <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No {currentTab.label} transactions found</p>
        </div>
      ) : (
        <PassbookTable entries={filteredEntries} loading={loading} />
      )}
    </div>
  );
}
