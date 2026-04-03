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
      const W = 595, H = 842, lm = 40, rm = 555;

      const txt = (
        page: any, str: string, x: number, yy: number,
        size: number, font = fontReg, color = rgb(0,0,0)
      ) => page.drawText(String(str || ""), { x, y: yy, size, font, color });

      const safe = (val: any) => String(val || "—");

      // ═══════════════════════════════════════════════
      // PAGE 1 — PROFESSIONAL COVER PAGE
      // ═══════════════════════════════════════════════
      const cover = doc.addPage([W, H]);

      // ── Top blue header band ──
      cover.drawRectangle({ x: 0, y: H - 100, width: W, height: 100, color: rgb(0.10, 0.22, 0.54) });
      // thin gold accent line
      cover.drawRectangle({ x: 0, y: H - 103, width: W, height: 3, color: rgb(0.95, 0.77, 0.06) });

      // Bank name
      txt(cover, "GRIHSEVAK NIDHI LIMITED", 145, H - 45, 20, fontBold, rgb(1,1,1));
      txt(cover, "Reg. under Nidhi Rules 2014  |  Member Passbook", 155, H - 65, 9.5, fontReg, rgb(0.75, 0.85, 1));
      txt(cover, `Generated: ${new Date().toLocaleString("en-IN")}`, lm, H - 85, 8, fontReg, rgb(0.70, 0.80, 0.95));
      txt(cover, `Account Type: ${tabLabel}`, 380, H - 85, 8, fontBold, rgb(0.95, 0.77, 0.06));

      // ── Member name banner ──
      cover.drawRectangle({ x: lm, y: H - 165, width: rm - lm, height: 52, color: rgb(0.95, 0.97, 1.0) });
      cover.drawRectangle({ x: lm, y: H - 165, width: 4, height: 52, color: rgb(0.10, 0.22, 0.54) });
      txt(cover, safe(member.name).toUpperCase(), lm + 14, H - 130, 16, fontBold, rgb(0.10, 0.22, 0.54));
      txt(cover, `Member ID: ${safe(member.member_id)}   |   Status: ${safe(member.status).toUpperCase()}`, lm + 14, H - 148, 9, fontReg, rgb(0.35, 0.40, 0.50));

      // ── Section helper ──
      let y = H - 185;
      const sectionHeader = (page: any, title: string, yy: number) => {
        page.drawRectangle({ x: lm, y: yy - 2, width: rm - lm, height: 16, color: rgb(0.10, 0.22, 0.54) });
        txt(page, title.toUpperCase(), lm + 6, yy + 2, 8, fontBold, rgb(1,1,1));
        return yy - 20;
      };
      const field = (page: any, label: string, value: string, x: number, yy: number, colW = 240) => {
        txt(page, label + ":", x, yy, 8, fontBold, rgb(0.35, 0.40, 0.50));
        txt(page, value, x + 85, yy, 8.5, fontReg, rgb(0.08, 0.10, 0.15));
        page.drawLine({ start: { x, y: yy - 4 }, end: { x: x + colW, y: yy - 4 }, thickness: 0.3, color: rgb(0.88, 0.90, 0.93) });
        return yy - 16;
      };

      // ── Personal Info ──
      y = sectionHeader(cover, "Personal Information", y);
      const col1 = lm, col2 = lm + 255;

      // Row 1
      field(cover, "Full Name",      safe(member.name),      col1, y);
      field(cover, "Member ID",      safe(member.member_id), col2, y);
      y -= 16;
      field(cover, "Mobile",         safe(member.phone),     col1, y);
      field(cover, "Email",          safe(member.email),     col2, y);
      y -= 16;
      field(cover, "Date of Birth",  member.dob ? formatDate(member.dob) + (member.dob ? ` (${calculateAge(member.dob)} yrs)` : "") : "—", col1, y);
      field(cover, "Gender",         safe(member.gender),    col2, y);
      y -= 16;
      field(cover, "Occupation",     safe(member.occupation),   col1, y);
      field(cover, "Education",      safe(member.education),    col2, y);
      y -= 16;
      field(cover, "Father / Guardian", safe(member.father_name), col1, y);
      field(cover, "Join Date",      member.join_date ? formatDate(member.join_date) : formatDate(member.created_at), col2, y);
      y -= 20;

      // ── Address ──
      y = sectionHeader(cover, "Address Details", y);
      field(cover, "Permanent Address", safe(member.address), col1, y, 500);
      y -= 16;
      field(cover, "City / District",  safe(member.city),    col1, y);
      field(cover, "State",            safe(member.state),   col2, y);
      y -= 16;
      field(cover, "Pin Code",         safe(member.pincode), col1, y);
      if (member.current_address && member.current_address !== member.address) {
        field(cover, "Current Address", safe(member.current_address), col2, y);
      }
      y -= 20;

      // ── KYC ──
      y = sectionHeader(cover, "KYC & Identity", y);
      field(cover, "Aadhar Number", member.aadhar ? `XXXX XXXX ${member.aadhar.slice(-4)}` : "—", col1, y);
      field(cover, "PAN Number",    safe(member.pan),         col2, y);
      y -= 16;
      field(cover, "ID Proof Type", safe(member.id_type),     col1, y);
      field(cover, "ID Proof No",   safe(member.id_number),   col2, y);
      y -= 20;

      // ── Nominee ──
      y = sectionHeader(cover, "Nominee Details", y);
      field(cover, "Nominee Name",     safe(member.nominee_name),     col1, y);
      field(cover, "Relation",         safe(member.nominee_relation),  col2, y);
      y -= 16;
      field(cover, "Nominee Age",      member.nominee_age ? String(member.nominee_age) + " yrs" : "—", col1, y);
      y -= 20;

      // ── Bank ──
      y = sectionHeader(cover, "Bank Details", y);
      field(cover, "Bank Name",    safe(member.bank_name),       col1, y);
      field(cover, "IFSC Code",    safe(member.bank_ifsc),       col2, y);
      y -= 16;
      field(cover, "Account No",   safe(member.bank_account_no), col1, y);
      y -= 20;

      // ── Deposit Accounts ──
      if (deposits.length > 0) {
        y = sectionHeader(cover, "Deposit Accounts", y);
        // Table header
        const dCols = [lm, lm+70, lm+150, lm+250, lm+340, lm+430];
        cover.drawRectangle({ x: lm, y: y - 2, width: rm - lm, height: 14, color: rgb(0.92, 0.94, 0.98) });
        ["Type","Deposit No","Amount","Rate","Maturity","Status"].forEach((h, i) =>
          txt(cover, h, dCols[i] + 3, y + 1, 7.5, fontBold, rgb(0.30, 0.35, 0.45))
        );
        y -= 15;
        deposits.forEach((dep, idx) => {
          if (idx % 2 === 0) cover.drawRectangle({ x: lm, y: y - 2, width: rm - lm, height: 13, color: rgb(0.975, 0.980, 0.995) });
          const dtype = (dep.deposit_type ?? dep.type ?? "").toUpperCase();
          const drow = [
            dtype,
            safe(dep.deposit_no),
            inr(dep.amount || 0),
            dep.interest_rate ? `${dep.interest_rate}% p.a.` : "—",
            dep.maturity_date ? formatDate(dep.maturity_date) : "—",
            safe(dep.status).toUpperCase(),
          ];
          drow.forEach((val, i) => txt(cover, val, dCols[i] + 3, y + 1, 7.5, fontReg, rgb(0.08,0.10,0.15)));
          cover.drawLine({ start: { x: lm, y: y - 2 }, end: { x: rm, y: y - 2 }, thickness: 0.25, color: rgb(0.88,0.90,0.93) });
          y -= 14;
        });
        y -= 6;
      }

      // ── Share Capital box ──
      cover.drawRectangle({ x: lm, y: y - 22, width: 160, height: 28, color: rgb(0.10, 0.22, 0.54) });
      txt(cover, "SHARE CAPITAL", lm + 8, y - 6, 7, fontBold, rgb(0.75, 0.85, 1));
      txt(cover, inr(member.share_capital || 0), lm + 8, y - 18, 11, fontBold, rgb(1,1,1));

      // ── Summary box ──
      cover.drawRectangle({ x: lm + 170, y: y - 22, width: rm - lm - 170, height: 28, color: rgb(0.96, 0.98, 1) });
      txt(cover, `Total Credit: ${inr(totalCredit)}`, lm + 178, y - 6,  8, fontBold, rgb(0.09, 0.55, 0.25));
      txt(cover, `Total Debit: ${inr(totalDebit)}`,   lm + 178, y - 18, 8, fontBold, rgb(0.80, 0.10, 0.10));
      txt(cover, `Balance: ${inr(balance)}`,           lm + 360, y - 12, 9, fontBold, rgb(0.10, 0.22, 0.54));
      y -= 30;

      // ── Footer ──
      cover.drawRectangle({ x: 0, y: 0, width: W, height: 28, color: rgb(0.10, 0.22, 0.54) });
      txt(cover, "Grihsevak Nidhi Limited  |  This is a computer-generated passbook. No signature required.", 60, 10, 7.5, fontReg, rgb(0.75, 0.85, 1));

      // ═══════════════════════════════════════════════
      // PAGE 2+ — TRANSACTION STATEMENT
      // ═══════════════════════════════════════════════
      const addTxPage = () => {
        const p = doc.addPage([W, H]);
        // Mini header
        p.drawRectangle({ x: 0, y: H - 36, width: W, height: 36, color: rgb(0.10, 0.22, 0.54) });
        p.drawRectangle({ x: 0, y: H - 39, width: W, height: 3, color: rgb(0.95, 0.77, 0.06) });
        txt(p, "GRIHSEVAK NIDHI LIMITED", lm, H - 16, 10, fontBold, rgb(1,1,1));
        txt(p, `Member Passbook — ${tabLabel}`, lm, H - 28, 8, fontReg, rgb(0.75,0.85,1));
        txt(p, `${safe(member.name)}  |  ${safe(member.member_id)}`, 330, H - 16, 8, fontReg, rgb(0.75,0.85,1));
        txt(p, `Date: ${new Date().toLocaleDateString("en-IN")}`, 330, H - 28, 8, fontReg, rgb(0.75,0.85,1));
        return { p, y: H - 52 };
      };

      let { p, y: ty } = addTxPage();
      const rowH = 16;
      const cols = [lm, lm+70, lm+155, lm+310, lm+385, lm+460];
      const colW = [70, 85, 155, 75, 75, 65];

      const drawTxHeader = (page: any, yy: number) => {
        page.drawRectangle({ x: lm, y: yy - 4, width: rm - lm, height: rowH, color: rgb(0.10, 0.22, 0.54) });
        ["Date","Transaction","Narration","Debit","Credit","Balance"].forEach((h, i) =>
          txt(page, h, cols[i]+3, yy+2, 8, fontBold, rgb(1,1,1))
        );
        return yy - rowH - 2;
      };
      ty = drawTxHeader(p, ty);

      for (const [idx, e] of filteredEntries.entries()) {
        if (ty < 60) {
          txt(p, `Page ${doc.getPageCount()} — Continued...`, lm, ty - 8, 7, fontReg, rgb(0.58, 0.64, 0.7));
          ({ p, y: ty } = addTxPage());
          ty = drawTxHeader(p, ty);
        }
        if (idx % 2 === 0) p.drawRectangle({ x: lm, y: ty - 4, width: rm - lm, height: rowH, color: rgb(0.97, 0.98, 1) });
        const row = [
          formatDate(e.transaction_date),
          (e.type ?? "").replace(/_/g," "),
          (e.narration ?? "").substring(0, 32),
          e.debit  > 0 ? inr(e.debit)  : "-",
          e.credit > 0 ? inr(e.credit) : "-",
          inr(e.balance),
        ];
        row.forEach((val, i) => {
          const color = i === 3 ? rgb(0.80,0.10,0.10) : i === 4 ? rgb(0.09,0.55,0.25) : rgb(0.08,0.10,0.15);
          const xPos = i >= 3 ? cols[i] + colW[i] - fontReg.widthOfTextAtSize(val, 8) - 3 : cols[i] + 3;
          txt(p, val, xPos, ty + 2, 8, i === 5 ? fontBold : fontReg, color);
        });
        p.drawLine({ start: { x: lm, y: ty - 4 }, end: { x: rm, y: ty - 4 }, thickness: 0.25, color: rgb(0.88,0.90,0.93) });
        ty -= rowH;
      }

      // Closing balance row
      if (filteredEntries.length > 0) {
        ty -= 4;
        p.drawRectangle({ x: lm, y: ty - 4, width: rm - lm, height: rowH, color: rgb(0.10, 0.22, 0.54) });
        txt(p, "CLOSING BALANCE", lm + 3, ty + 2, 8, fontBold, rgb(1,1,1));
        txt(p, inr(balance), cols[5] + colW[5] - fontBold.widthOfTextAtSize(inr(balance), 9) - 3, ty + 2, 9, fontBold, rgb(0.95, 0.77, 0.06));
        ty -= rowH + 8;
      }

      // Footer on last page
      p.drawRectangle({ x: 0, y: 0, width: W, height: 28, color: rgb(0.10, 0.22, 0.54) });
      txt(p, `Generated on ${new Date().toLocaleString("en-IN")}  |  Total ${filteredEntries.length} transactions  |  Grihsevak Nidhi Limited`, 50, 10, 7.5, fontReg, rgb(0.75, 0.85, 1));

      const bytes = await doc.save();
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
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
