"use client";

import { use, useState, useEffect, useMemo } from "react";
import { Download, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { PassbookTable } from "@/components/passbook/PassbookTable";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { formatINR, formatDate } from "@/lib/utils";
import type { DateRange } from "@/components/shared/DateRangePicker";

type BookTab = "all" | "fd" | "rd" | "drd" | "savings";

const TABS: { id: BookTab; label: string; color: string; activeClass: string }[] = [
  { id: "all", label: "All Transactions", color: "text-slate-600", activeClass: "bg-slate-800 text-white" },
  { id: "fd", label: "FD", color: "text-purple-700", activeClass: "bg-purple-700 text-white" },
  { id: "rd", label: "RD", color: "text-amber-700", activeClass: "bg-amber-600 text-white" },
  { id: "drd", label: "DRD", color: "text-emerald-700", activeClass: "bg-emerald-600 text-white" },
  { id: "savings", label: "Savings", color: "text-blue-700", activeClass: "bg-blue-600 text-white" },
];

export default function PassbookPage({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = use(params);
  const [member, setMember] = useState<any | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<BookTab>("all");
  const [pdfLoading, setPdfLoading] = useState(false);
  const supabase = createClient();

  // Fetch member
  useEffect(() => {
    supabase.from("members").select("*").eq("id", memberId).single().then(({ data }) => setMember(data));
  }, [memberId]);

  useEffect(() => {
    supabase.from("deposits").select("id, type, deposit_no").eq("member_id", memberId)
      .then(({ data }) => setDeposits(data || []));
  }, [memberId, supabase]);

  // Fetch all passbook entries
  useEffect(() => {
    let query = supabase
      .from("passbook")
      .select("*")
      .eq("member_id", memberId)
      .order("transaction_date", { ascending: true });

    if (dateRange) {
      query = query.gte("transaction_date", dateRange.from).lte("transaction_date", dateRange.to);
    }

    query.then(({ data }) => {
      setEntries(data || []);
      setLoading(false);
    });
  }, [memberId, dateRange]);

  const depositTypeMap = useMemo(() => {
    const map: Record<string, string> = {};
    deposits.forEach((d) => { map[d.id] = d.type; });
    return map;
  }, [deposits]);

  // Filter entries by active tab
  const filteredEntries = useMemo(() => {
    if (activeTab === "all") return entries;
    // loan entries: show in "all" only
    return entries.filter((e) => {
      if (e.reference_type !== "deposit" || !e.reference_id) return false;
      return depositTypeMap[e.reference_id] === activeTab;
    });
  }, [entries, activeTab, depositTypeMap]);

  // Count entries per tab (for badge)
  const tabCounts = useMemo(() => {
    const counts: Record<BookTab, number> = { all: entries.length, fd: 0, rd: 0, drd: 0, savings: 0 };
    entries.forEach((e) => {
      if (e.reference_type === "deposit" && e.reference_id) {
        const t = depositTypeMap[e.reference_id] as BookTab;
        if (t && t in counts) counts[t]++;
      }
    });
    return counts;
  }, [entries, depositTypeMap]);

  const totalCredit = filteredEntries.reduce((s, e) => s + e.credit, 0);
  const totalDebit = filteredEntries.reduce((s, e) => s + e.debit, 0);
  const balance = filteredEntries[filteredEntries.length - 1]?.balance ?? 0;

  // ── PDF Download ──────────────────────────────────────────────────────────
  const downloadPDF = async () => {
    if (!member) return;
    setPdfLoading(true);
    try {
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
      const doc = await PDFDocument.create();
      const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
      const fontReg = await doc.embedFont(StandardFonts.Helvetica);
      const inr = (n: number) => formatINR(n).replace("₹", "Rs.");
      const tabLabel = TABS.find((t) => t.id === activeTab)?.label ?? "All Transactions";

      const addPage = () => {
        const p = doc.addPage([595, 842]);
        return { p, y: 800 };
      };

      let { p, y } = addPage();
      const lm = 40, rm = 555, rowH = 16;

      const text = (
        page: typeof p, str: string, x: number, yy: number,
        size: number, font = fontReg, color = rgb(0, 0, 0)
      ) => page.drawText(str, { x, y: yy, size, font, color });

      // Header
      text(p, "Grihsevak Nidhi Limited", 185, y, 16, fontBold);
      y -= 18;
      text(p, `Member Passbook - ${tabLabel}`, 210, y, 11, fontReg, rgb(0.28, 0.33, 0.4));
      y -= 6;
      p.drawLine({ start: { x: lm, y }, end: { x: rm, y }, thickness: 1, color: rgb(0.12, 0.16, 0.23) });
      y -= 16;

      // Member info
      text(p, "Member:", lm, y, 10, fontBold);
      text(p, member.name, lm + 52, y, 10);
      text(p, "Member ID:", 320, y, 10, fontBold);
      text(p, member.member_id, 390, y, 10);
      y -= 14;
      text(p, "Phone:", lm, y, 10, fontBold);
      text(p, member.phone || "—", lm + 52, y, 10);
      text(p, "Date:", 320, y, 10, fontBold);
      text(p, new Date().toLocaleDateString("en-IN"), 390, y, 10);
      y -= 18;

      // Summary bar
      p.drawRectangle({ x: lm, y: y - 4, width: rm - lm, height: 18, color: rgb(0.95, 0.97, 0.99) });
      text(p, `Total Credit: ${inr(totalCredit)}`, lm + 6, y + 2, 9, fontBold, rgb(0.09, 0.64, 0.29));
      text(p, `Total Debit: ${inr(totalDebit)}`, 230, y + 2, 9, fontBold, rgb(0.86, 0.15, 0.15));
      text(p, `Balance: ${inr(balance)}`, 390, y + 2, 9, fontBold, rgb(0.11, 0.31, 0.87));
      y -= 24;

      // Table header
      const cols = [lm, lm + 70, lm + 155, lm + 300, lm + 375, lm + 450];
      const colW = [70, 85, 145, 75, 75, 65];
      p.drawRectangle({ x: lm, y: y - 4, width: rm - lm, height: rowH, color: rgb(0.12, 0.16, 0.23) });
      ["Date", "Transaction", "Narration", "Debit", "Credit", "Balance"].forEach(
        (h, i) => text(p, h, cols[i] + 3, y + 2, 8, fontBold, rgb(1, 1, 1))
      );
      y -= rowH + 2;

      // Rows
      for (const [idx, e] of filteredEntries.entries()) {
        if (y < 60) {
          ({ p, y } = addPage());
          p.drawRectangle({ x: lm, y: y - 4, width: rm - lm, height: rowH, color: rgb(0.12, 0.16, 0.23) });
          ["Date", "Transaction", "Narration", "Debit", "Credit", "Balance"].forEach(
            (h, i) => text(p, h, cols[i] + 3, y + 2, 8, fontBold, rgb(1, 1, 1))
          );
          y -= rowH + 2;
        }
        if (idx % 2 === 0)
          p.drawRectangle({ x: lm, y: y - 4, width: rm - lm, height: rowH, color: rgb(0.97, 0.98, 0.99) });

        const row = [
          formatDate(e.transaction_date),
          (e.type ?? "").replace(/_/g, " "),
          (e.narration ?? "").substring(0, 30),
          e.debit > 0 ? inr(e.debit) : "-",
          e.credit > 0 ? inr(e.credit) : "-",
          inr(e.balance),
        ];
        row.forEach((val, i) => {
          const isRight = i >= 3;
          const color = i === 3 ? rgb(0.86, 0.15, 0.15) : i === 4 ? rgb(0.09, 0.64, 0.29) : rgb(0.1, 0.1, 0.1);
          const xPos = isRight ? cols[i] + colW[i] - fontReg.widthOfTextAtSize(val, 8) - 3 : cols[i] + 3;
          text(p, val, xPos, y + 2, 8, i === 5 ? fontBold : fontReg, color);
        });
        p.drawLine({ start: { x: lm, y: y - 4 }, end: { x: rm, y: y - 4 }, thickness: 0.3, color: rgb(0.88, 0.9, 0.93) });
        y -= rowH;
      }

      y -= 8;
      text(p, `Generated on ${new Date().toLocaleString("en-IN")} · Grihsevak Nidhi Limited`, 140, y, 8, fontReg, rgb(0.58, 0.64, 0.7));

      const bytes = await doc.save();
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `passbook-${activeTab}-${member.member_id}-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
    setPdfLoading(false);
  };

  const currentTab = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="space-y-5">
      {/* No-print: page header */}
      <div className="no-print">
        <PageHeader
          title="Member Passbook"
          description={member ? `${member.name} · ${member.member_id}` : "Loading..."}
        >
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <button
            onClick={downloadPDF}
            disabled={pdfLoading || loading || !member}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {pdfLoading ? "Generating..." : `Download ${currentTab.id === "all" ? "" : currentTab.label + " "}PDF`}
          </button>
        </PageHeader>
      </div>

      {/* ── Passbook Tabs ─────────────────────────────────────────────── */}
      <div className="no-print">
        <div className="flex gap-2 flex-wrap">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = tabCounts[tab.id];
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${isActive
                    ? `${tab.activeClass} border-transparent shadow-md`
                    : `bg-white ${tab.color} border-slate-200 hover:border-current hover:shadow-sm`
                  }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                {tab.label}
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${isActive ? "bg-white/20" : "bg-slate-100 text-slate-600"
                    }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Printable area */}
      <div id="passbook-print">
        {/* Print-only header */}
        <div className="print-only mb-6">
          <div className="text-center border-b-2 border-slate-800 pb-4 mb-4">
            <h1 className="text-xl font-bold text-slate-900">Grihsevak Nidhi Limited</h1>
            <p className="text-sm text-slate-600 mt-1">
              Member Passbook — {currentTab.label}
            </p>
          </div>
          <div className="flex justify-between text-sm text-slate-700 mb-2">
            <div>
              <p><span className="font-semibold">Member:</span> {member?.name}</p>
              <p><span className="font-semibold">Member ID:</span> {member?.member_id}</p>
            </div>
            <div className="text-right">
              <p><span className="font-semibold">Phone:</span> {member?.phone}</p>
              <p><span className="font-semibold">Date:</span> {new Date().toLocaleDateString("en-IN")}</p>
            </div>
          </div>
          <div className="flex gap-8 text-sm border border-slate-200 rounded p-3 bg-slate-50">
            <div><span className="font-semibold">Total Credit:</span> <span className="text-emerald-700 font-bold">{formatINR(totalCredit)}</span></div>
            <div><span className="font-semibold">Total Debit:</span> <span className="text-red-600 font-bold">{formatINR(totalDebit)}</span></div>
            <div><span className="font-semibold">Balance:</span> <span className="text-blue-700 font-bold">{formatINR(balance)}</span></div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="no-print grid grid-cols-3 gap-4 mb-5">
          {[
            { label: "Total Credit", value: formatINR(totalCredit), color: "text-emerald-600" },
            { label: "Total Debit", value: formatINR(totalDebit), color: "text-red-500" },
            { label: "Current Balance", value: formatINR(balance), color: "text-blue-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Empty state for filtered tabs */}
        {!loading && activeTab !== "all" && filteredEntries.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-16 text-center">
            <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No {currentTab.label} transactions found</p>
            <p className="text-xs text-slate-400 mt-1">
              {currentTab.id === "fd" && "No Fixed Deposit entries recorded"}
              {currentTab.id === "rd" && "No Recurring Deposit entries recorded"}
              {currentTab.id === "drd" && "No Daily Recurring Deposit entries recorded"}
              {currentTab.id === "savings" && "No Savings account entries recorded"}
            </p>
          </div>
        ) : (
          <PassbookTable entries={filteredEntries} loading={loading} />
        )}
      </div>
    </div>
  );
}
