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
    supabase.from("deposits").select(`
      id, deposit_type, deposit_no, amount, status, 
      maturity_date, maturity_amount, interest_rate,
      tenure_months, type, monthly_amount, nominee_name,
      created_by
    `)
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
      const W = 595, H = 842, lm = 40, rm = 555;

      const txt = (
        page: any, str: string, x: number, yy: number,
        size: number, font = fontReg, color = rgb(0,0,0)
      ) => page.drawText(String(str || ""), { x, y: yy, size, font, color });

      const safe = (val: any) => String(val || "—");

      // Find primary deposit for details if a specific tab is selected
      const primaryDep = activeTab !== "all" 
        ? deposits.find(d => (d.deposit_type?.toLowerCase() === activeTab || d.type?.toLowerCase() === activeTab))
        : deposits[0];

      // ═══════════════════════════════════════════════
      // PAGE 1 — PHYSICAL STYLE FRONT COVER
      // ═══════════════════════════════════════════════
      const cover = doc.addPage([W, H]);

      // Professional Headers
      txt(cover, "GRIHSEVAK NIDHI LIMITED", 145, H - 50, 22, fontBold, rgb(0.1, 0.2, 0.5));
      txt(cover, "Regd. under Nidhi Rules 2014 & Companies Act 2013", 175, H - 65, 9, fontReg, rgb(0.4, 0.4, 0.4));
      
      cover.drawRectangle({ x: lm, y: H - 100, width: rm - lm, height: 1.5, color: rgb(0.1, 0.2, 0.5) });

      let y = H - 120;
      txt(cover, "Branch & Code : HEAD OFFICE - 001", lm, y, 9, fontBold);
      txt(cover, "Email : grihsevaknl@gmail.com", 350, y, 9, fontReg);
      y -= 25;

      // Member Info Box
      cover.drawRectangle({ x: lm, y: y - 110, width: rm - lm, height: 110, borderWidth: 1, borderColor: rgb(0.2, 0.2, 0.2) });
      let iy = y - 20;
      txt(cover, "Applicant Name : ", lm + 10, iy, 9, fontBold);
      txt(cover, safe(member.name).toUpperCase(), lm + 100, iy, 10, fontBold);
      
      iy -= 20;
      txt(cover, "S/O / D/O / W/O : ", lm + 10, iy, 9, fontBold);
      txt(cover, safe(member.father_name), lm + 100, iy, 9, fontReg);
      
      iy -= 20;
      txt(cover, "ADDRESS : ", lm + 10, iy, 9, fontBold);
      txt(cover, safe(member.address), lm + 100, iy, 9, fontReg);
      
      iy -= 20;
      txt(cover, "STATE : " + safe(member.state), lm + 10, iy, 9, fontReg);
      txt(cover, "PIN CODE : " + safe(member.pincode), 250, iy, 9, fontReg);
      txt(cover, "DOC : " + (primaryDep?.open_date ? formatDate(primaryDep.open_date) : formatDate(member.created_at)), 430, iy, 9, fontReg);

      // Account Specs Area
      y -= 125;
      cover.drawRectangle({ x: lm, y: y - 120, width: rm - lm, height: 120, borderWidth: 1, borderColor: rgb(0.2, 0.2, 0.2) });
      
      let ay = y - 20;
      txt(cover, "PLAN : " + (primaryDep?.deposit_type?.toUpperCase() || "N/A") + (primaryDep?.tenure_months ? `-${primaryDep.tenure_months}` : ""), lm + 10, ay, 10, fontBold);
      txt(cover, "SCHEME : " + (primaryDep?.type?.toUpperCase() || "N/A"), 250, ay, 9, fontBold);
      txt(cover, "TERM : " + (primaryDep?.tenure_months || "N/A"), 430, ay, 9, fontReg);
      
      ay -= 25;
      txt(cover, "TOTAL VALUE : " + inr((primaryDep?.amount || 0) * (primaryDep?.tenure_months || 1)), lm + 10, ay, 9, fontBold);
      txt(cover, "MODE : " + (primaryDep?.type === "drd" ? "Daily" : "Monthly"), 250, ay, 9, fontReg);
      txt(cover, "INSTALMENT : " + inr(primaryDep?.monthly_amount || primaryDep?.amount || 0), 430, ay, 9, fontBold);
      
      ay -= 25;
      txt(cover, "MATURITY AMT : " + inr(primaryDep?.maturity_amount || 0), lm + 10, ay, 11, fontBold, rgb(0.8, 0.1, 0.1));
      txt(cover, "MATURITY DATE : " + (primaryDep?.maturity_date ? formatDate(primaryDep.maturity_date) : "N/A"), 250, ay, 10, fontBold);
      
      ay -= 25;
      txt(cover, "ACCOUNT NO : " + safe(primaryDep?.deposit_no || member.member_id), lm + 10, ay, 10, fontBold);
      txt(cover, "MEMBER ID : " + safe(member.member_id), 250, ay, 10, fontReg);

      // Agent & Nominee
      y -= 140;
      txt(cover, "Agent Code & Name: GSCC0011 (CHANDAN KUMAR)", lm, y, 9, fontBold);
      y -= 18;
      txt(cover, "Nominee Name: " + safe(member.nominee_name || primaryDep?.nominee_name), lm, y, 9, fontBold);
      txt(cover, "Relation: " + safe(member.nominee_relation), 300, y, 9, fontReg);

      // Useful Tips Area (Bilingual)
      y -= 60;
      cover.drawRectangle({ x: lm, y: y - 140, width: rm - lm, height: 140, color: rgb(0.97, 0.98, 1.0) });
      txt(cover, "USEFUL TIPS & GUIDELINES", lm + 10, y - 15, 10, fontBold, rgb(0.1, 0.2, 0.5));
      
      const tips = [
        "1. Please update your mobile number and email for regular alerts.",
        "2. Do not share your password or OTP with anyone.",
        "3. Ensure every deposit is entered in this passbook.",
        "4. Keep this passbook safely for maturity claims.",
        "5. Contact helpline 7979986284 for any queries."
      ];
      let ty = y - 35;
      tips.forEach(t => {
        txt(cover, t, lm + 15, ty, 8, fontReg);
        ty -= 15;
      });

      // Signature area
      txt(cover, "Authorized Signatory", 420, 60, 9, fontBold);
      cover.drawRectangle({ x: 410, y: 75, width: 100, height: 40, borderWidth: 1, borderDashArray: [2, 2], borderColor: rgb(0.5, 0.5, 0.5) });

      // ═══════════════════════════════════════════════
      // PAGE 2+ — BANK STYLE TRANSACTION STATEMENT
      // ═══════════════════════════════════════════════
      const addTxPage = () => {
        const p = doc.addPage([W, H]);
        p.drawRectangle({ x: 0, y: H - 40, width: W, height: 40, color: rgb(0.1, 0.2, 0.5) });
        txt(p, "GRIHSEVAK NIDHI LIMITED - PASSBOOK STATEMENT", lm, H - 25, 12, fontBold, rgb(1,1,1));
        return { p, y: H - 65 };
      };

      let { p, y: nextY } = addTxPage();
      ty = nextY;
      const rowH = 20;
      const cols = [lm, lm+50, lm+130, lm+210, lm+320, lm+410];
      const colW = [50, 80, 80, 110, 90, 85];

      const drawTxHeader = (page: any, yy: number) => {
        page.drawRectangle({ x: lm, y: yy - 5, width: rm - lm, height: rowH, color: rgb(0.92, 0.94, 0.98) });
        ["Inst.No", "Branch", "Date", "Credit (Deposit)", "Debit", "Balance"].forEach((h, i) =>
          txt(page, h, cols[i] + 5, yy, 8.5, fontBold, rgb(0.1, 0.2, 0.5))
        );
        page.drawLine({ start: { x: lm, y: yy - 5 }, end: { x: rm, y: yy - 5 }, thickness: 1 });
        return yy - rowH - 5;
      };
      
      ty = drawTxHeader(p, ty);

      for (const [idx, e] of filteredEntries.entries()) {
        if (ty < 50) {
          ({ p, y: ty } = addTxPage());
          ty = drawTxHeader(p, ty);
        }
        
        const row = [
          String(idx + 1),
          "HEADOFFICE",
          formatDate(e.transaction_date),
          e.credit > 0 ? inr(e.credit) : "0",
          e.debit > 0 ? inr(e.debit) : "0",
          inr(e.balance),
        ];
        
        row.forEach((val, i) => {
          const color = i === 3 ? rgb(0, 0.5, 0) : i === 4 ? rgb(0.8, 0, 0) : rgb(0.1, 0.1, 0.1);
          txt(p, val, cols[i] + 5, ty, 8.5, i === 5 ? fontBold : fontReg, color);
        });
        
        p.drawLine({ start: { x: lm, y: ty - 5 }, end: { x: rm, y: ty - 5 }, thickness: 0.2, color: rgb(0.8, 0.8, 0.8) });
        ty -= rowH;
      }

      const bytes = await doc.save();
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `passbook-${member.member_id}.pdf`;
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
                    <div key={dep.id} className={cn("flex flex-col gap-1 p-3 rounded-xl border text-xs", colorClass)}>
                      <div className="flex items-center justify-between gap-4 font-bold">
                        <span>{depositTypeLabel[dep.deposit_type] ?? depositTypeLabel[dtype] ?? dtype.toUpperCase()}</span>
                        <span className="font-mono">{dep.deposit_no}</span>
                      </div>
                      <div className="flex justify-between items-end mt-1">
                        <div>
                          <p className="text-[10px] opacity-60">Principal</p>
                          <p className="font-semibold">{formatINR(dep.amount)}</p>
                        </div>
                        {dep.maturity_amount > 0 && (
                          <div className="text-right">
                            <p className="text-[10px] opacity-60 text-amber-600">Maturity</p>
                            <p className="font-bold text-amber-700">{formatINR(dep.maturity_amount)}</p>
                          </div>
                        )}
                      </div>
                      {dep.maturity_date && (
                        <p className="text-[10px] mt-1 border-t border-current/10 pt-1 text-center font-medium">
                          Matures on {formatDate(dep.maturity_date)}
                        </p>
                      )}
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
