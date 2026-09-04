"use client";

import { useMemo, useState } from "react";
import {
  PassbookPrinterProfile,
  PassbookTransaction,
  getDefaultProfile,
  PRINTER_PROFILES,
  getPassbookColumns,
  calculateColumnPositions,
  formatPassbookDate,
  formatCurrency,
  truncateNarration,
  fitText,
  alignedTextX,
  sanitizeForPdf,
  mmToPoints,
  getRowsPerPage,
  paginate,
  monospacePitch,
  PASSBOOK_SOCIETY,
  HEADER_HEIGHT_MM,
  TABLE_HEADER_HEIGHT_MM,
  FOOTER_HEIGHT_MM,
} from "@/lib/passbook-print";

interface PassbookPrintProps {
  member: {
    name: string;
    member_id: string;
    member_no?: string;
    phone?: string;
    address?: string;
    father_name?: string;
    nominee_name?: string;
    nominee_relation?: string;
    photo_url?: string;
    join_date?: string;
  };
  deposits?: Array<{
    deposit_no?: string;
    deposit_type?: string;
    type?: string;
    amount?: number;
    open_date?: string;
    maturity_date?: string;
    maturity_amount?: number;
  }>;
  transactions: PassbookTransaction[];
  printSize?: "plq35" | "a5";
  printerProfile?: Partial<PassbookPrinterProfile>;
  onPrint?: () => void;
  onDownloadPDF?: () => void;
}

const CELL_PADDING_MM = 1;
/** Courier cap height as a fraction of font size, for vertical centering. */
const CAP_HEIGHT_RATIO = 0.62;

export function PassbookPrint({
  member,
  deposits = [],
  transactions,
  printSize = "plq35",
  printerProfile: profileOverrides,
  onPrint,
  onDownloadPDF,
}: PassbookPrintProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  // Derived from props, not seeded into state — the print page loads the saved
  // printer profile from localStorage after mount, and a useState initializer
  // would have pinned this to the defaults forever.
  const profile = useMemo<PassbookPrinterProfile>(
    () => ({ ...(PRINTER_PROFILES[printSize] || getDefaultProfile()), ...profileOverrides }),
    [printSize, profileOverrides]
  );

  const primaryDeposit = deposits[0];
  const columns = useMemo(() => getPassbookColumns(profile.printableWidthMm), [profile.printableWidthMm]);
  const columnPositions = useMemo(
    () => calculateColumnPositions(columns, profile.printableWidthMm, 0),
    [columns, profile.printableWidthMm]
  );
  const rowsPerPage = getRowsPerPage(profile);
  const pages = useMemo(() => paginate(transactions, rowsPerPage), [transactions, rowsPerPage]);
  const rowsAreaHeightMm =
    profile.printableHeightMm - HEADER_HEIGHT_MM - TABLE_HEADER_HEIGHT_MM - FOOTER_HEIGHT_MM;

  const totals = useMemo(
    () => ({
      credit: transactions.reduce((s, t) => s + (t.credit || 0), 0),
      debit: transactions.reduce((s, t) => s + (t.debit || 0), 0),
      closing: transactions.length ? transactions[transactions.length - 1].balance : 0,
    }),
    [transactions]
  );

  const headerLines = useMemo(() => {
    const account = primaryDeposit
      ? `A/c: ${primaryDeposit.deposit_no || "N/A"}   Type: ${(
          primaryDeposit.deposit_type ||
          primaryDeposit.type ||
          "N/A"
        ).toUpperCase()}`
      : "";
    return {
      title: PASSBOOK_SOCIETY.name,
      subtitle: PASSBOOK_SOCIETY.subtitle,
      member: `Member: ${(member.name || "").toUpperCase()}   ${member.member_id || ""}`,
      account: [account, `Branch: ${PASSBOOK_SOCIETY.branch}`, "Amounts in Rs."]
        .filter(Boolean)
        .join("   "),
    };
  }, [member, primaryDeposit]);

  const cellValue = (key: string, txn: PassbookTransaction, serial: number): string => {
    switch (key) {
      case "serialNumber":
        return String(serial);
      case "date":
        return formatPassbookDate(txn.date);
      case "narration":
        return txn.narration || "--";
      case "credit":
        return formatCurrency(txn.credit);
      case "debit":
        return formatCurrency(txn.debit);
      case "balance":
        return formatCurrency(txn.balance) || "0.00";
      default:
        return "";
    }
  };

  // ── PDF ────────────────────────────────────────────────────────────────
  const generatePDF = async () => {
    setIsGenerating(true);
    setError("");
    try {
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Courier);
      const fontBold = await doc.embedFont(StandardFonts.CourierBold);

      const pageWidth = mmToPoints(profile.pageWidthMm);
      const pageHeight = mmToPoints(profile.pageHeightMm);
      const leftOffset = mmToPoints(profile.leftOffsetMm);
      const topOffset = mmToPoints(profile.topOffsetMm);
      const tableWidth = mmToPoints(profile.printableWidthMm);
      const padding = mmToPoints(CELL_PADDING_MM);

      // pdf-lib takes points directly; the previous 0.75 factor rendered every
      // PDF at 75% of the size the preview showed.
      const fontSize = profile.fontSizePt;
      const rowHeight = mmToPoints(profile.rowHeightMm);

      const ink = {
        rule: rgb(0.55, 0.55, 0.55),
        frame: rgb(0.1, 0.1, 0.1),
        band: rgb(0.05, 0.2, 0.5),
        credit: rgb(0, 0.35, 0),
        debit: rgb(0.55, 0, 0),
        balance: rgb(0.02, 0.1, 0.4),
        body: rgb(0, 0, 0),
        muted: rgb(0.4, 0.4, 0.4),
      };

      /** Baseline that visually centres text in a band of `height` under `topY`. */
      const baselineIn = (topY: number, height: number, size: number) =>
        topY - height / 2 - (size * CAP_HEIGHT_RATIO) / 2;

      const drawCell = (
        page: Awaited<ReturnType<typeof doc.addPage>>,
        text: string,
        colX: number,
        colWidth: number,
        alignment: "left" | "center" | "right",
        baseline: number,
        size: number,
        pdfFont: typeof font,
        color: ReturnType<typeof rgb>
      ) => {
        const safe = sanitizeForPdf(text);
        if (!safe) return;
        const measure = (s: string) => pdfFont.widthOfTextAtSize(s, size);
        const clipped = fitText(safe, colWidth - padding * 2, measure);
        if (!clipped) return;
        page.drawText(clipped, {
          x: alignedTextX(colX, colWidth, measure(clipped), alignment, padding),
          y: baseline,
          size,
          font: pdfFont,
          color,
        });
      };

      for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const page = doc.addPage([pageWidth, pageHeight]);
        const pageRows = pages[pageIndex];
        const isLastPage = pageIndex === pages.length - 1;

        let y = pageHeight - topOffset;

        // ── Header box ────────────────────────────────────────────────────
        const headerHeight = mmToPoints(HEADER_HEIGHT_MM);
        page.drawRectangle({
          x: leftOffset,
          y: y - headerHeight,
          width: tableWidth,
          height: headerHeight,
          borderWidth: 0.8,
          borderColor: ink.frame,
        });

        const headerX = leftOffset + padding * 2;
        const headerRight = leftOffset + tableWidth - padding * 2;
        // Explicit baselines inside the box; the old version placed the title
        // 2.5mm below the box top, so the glyphs crossed the border.
        const titleSize = fontSize + 1.5;
        page.drawText(sanitizeForPdf(headerLines.title), {
          x: headerX,
          y: y - mmToPoints(4.6),
          size: titleSize,
          font: fontBold,
          color: ink.band,
        });
        page.drawText(sanitizeForPdf(headerLines.subtitle), {
          x: headerX,
          y: y - mmToPoints(8),
          size: fontSize - 1.5,
          font,
          color: ink.muted,
        });
        page.drawText(sanitizeForPdf(headerLines.member), {
          x: headerX,
          y: y - mmToPoints(11.5),
          size: fontSize,
          font: fontBold,
          color: ink.body,
        });
        page.drawText(
          fitText(sanitizeForPdf(headerLines.account), tableWidth - padding * 4, (s) =>
            font.widthOfTextAtSize(s, fontSize - 1)
          ),
          {
            x: headerX,
            y: y - mmToPoints(14.5),
            size: fontSize - 1,
            font,
            color: ink.body,
          }
        );

        if (pages.length > 1) {
          const label = `Page ${pageIndex + 1}/${pages.length}`;
          page.drawText(label, {
            x: headerRight - font.widthOfTextAtSize(label, fontSize - 1),
            y: y - mmToPoints(4.6),
            size: fontSize - 1,
            font,
            color: ink.muted,
          });
        }

        y -= headerHeight;

        // ── Table header band ─────────────────────────────────────────────
        const tableHeaderH = mmToPoints(TABLE_HEADER_HEIGHT_MM);
        const tableTop = y;
        page.drawRectangle({
          x: leftOffset,
          y: y - tableHeaderH,
          width: tableWidth,
          height: tableHeaderH,
          color: ink.band,
        });

        const headerBaseline = baselineIn(y, tableHeaderH, fontSize - 0.5);
        columns.forEach((col) => {
          const colPos = columnPositions.find((cp) => cp.key === col.key)!;
          drawCell(
            page,
            col.label,
            leftOffset + mmToPoints(colPos.xMm),
            mmToPoints(colPos.widthMm),
            col.alignment,
            headerBaseline,
            fontSize - 0.5,
            fontBold,
            rgb(1, 1, 1)
          );
        });

        y -= tableHeaderH;

        // ── Rows ──────────────────────────────────────────────────────────
        pageRows.forEach((txn, idx) => {
          const serial = pageIndex * rowsPerPage + idx + 1;

          if (idx % 2 === 0) {
            page.drawRectangle({
              x: leftOffset,
              y: y - rowHeight,
              width: tableWidth,
              height: rowHeight,
              color: rgb(0.96, 0.97, 0.99),
            });
          }

          const baseline = baselineIn(y, rowHeight, fontSize);
          columns.forEach((col) => {
            const colPos = columnPositions.find((cp) => cp.key === col.key)!;
            const color =
              col.key === "credit"
                ? ink.credit
                : col.key === "debit"
                ? ink.debit
                : col.key === "balance"
                ? ink.balance
                : ink.body;

            drawCell(
              page,
              cellValue(col.key, txn, serial),
              leftOffset + mmToPoints(colPos.xMm),
              mmToPoints(colPos.widthMm),
              col.alignment,
              baseline,
              fontSize,
              col.key === "balance" ? fontBold : font,
              color
            );
          });

          page.drawLine({
            start: { x: leftOffset, y: y - rowHeight },
            end: { x: leftOffset + tableWidth, y: y - rowHeight },
            thickness: 0.3,
            color: ink.rule,
          });

          y -= rowHeight;
        });

        // ── Totals (last page only) ───────────────────────────────────────
        if (isLastPage) {
          page.drawRectangle({
            x: leftOffset,
            y: y - rowHeight,
            width: tableWidth,
            height: rowHeight,
            color: rgb(0.89, 0.92, 0.97),
          });
          const baseline = baselineIn(y, rowHeight, fontSize);
          const totalsRow: Record<string, string> = {
            narration: "TOTAL",
            credit: formatCurrency(totals.credit),
            debit: formatCurrency(totals.debit),
            balance: formatCurrency(totals.closing) || "0.00",
          };
          columns.forEach((col) => {
            const value = totalsRow[col.key];
            if (!value) return;
            const colPos = columnPositions.find((cp) => cp.key === col.key)!;
            drawCell(
              page,
              value,
              leftOffset + mmToPoints(colPos.xMm),
              mmToPoints(colPos.widthMm),
              col.alignment,
              baseline,
              fontSize,
              fontBold,
              col.key === "balance" ? ink.balance : ink.body
            );
          });
          y -= rowHeight;
        }

        // ── Table frame ───────────────────────────────────────────────────
        // Spans the whole rows area, not just the filled rows, so a short page
        // still prints as a ruled passbook page and matches the preview.
        const tableBottom = tableTop - tableHeaderH - mmToPoints(rowsAreaHeightMm);
        page.drawRectangle({
          x: leftOffset,
          y: tableBottom,
          width: tableWidth,
          height: tableTop - tableBottom,
          borderWidth: 0.8,
          borderColor: ink.frame,
        });
        columnPositions.slice(1).forEach((colPos) => {
          const x = leftOffset + mmToPoints(colPos.xMm);
          page.drawLine({
            start: { x, y: tableBottom },
            end: { x, y: tableTop },
            thickness: 0.4,
            color: ink.rule,
          });
        });

        // ── Footer ────────────────────────────────────────────────────────
        page.drawText(
          sanitizeForPdf(`Generated: ${new Date().toLocaleString("en-IN")}`),
          {
            x: leftOffset,
            y: mmToPoints(profile.topOffsetMm / 2),
            size: fontSize - 2,
            font,
            color: ink.muted,
          }
        );
      }

      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      if (onDownloadPDF) onDownloadPDF();

      const a = document.createElement("a");
      a.href = url;
      a.download = `passbook-${member.member_id}-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
      setError(err instanceof Error ? err.message : "PDF generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (onPrint) onPrint();
    else window.print();
  };

  // ── Preview ────────────────────────────────────────────────────────────
  const cellStyle = (
    alignment: "left" | "center" | "right",
    widthMm: number
  ): React.CSSProperties => ({
    width: `${widthMm}mm`,
    display: "flex",
    alignItems: "center",
    justifyContent:
      alignment === "center" ? "center" : alignment === "right" ? "flex-end" : "flex-start",
    padding: `0 ${CELL_PADDING_MM}mm`,
    overflow: "hidden",
    whiteSpace: "nowrap",
    boxSizing: "border-box",
  });

  return (
    <div className="passbook-print-container">
      {/* Exact page geometry for window.print(); without this the browser fell
          back to the global A4 + 15mm margin rule and nothing lined up with the
          passbook the printer is feeding. */}
      <style>{`
        @page {
          size: ${profile.pageWidthMm}mm ${profile.pageHeightMm}mm;
          margin: 0;
        }
        @media print {
          html, body {
            width: ${profile.pageWidthMm}mm;
            background: #fff !important;
          }
          body * { visibility: hidden !important; }
          .passbook-sheet, .passbook-sheet * { visibility: visible !important; }
          .passbook-sheet {
            position: absolute;
            left: 0;
            top: 0;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            break-after: page;
            page-break-after: always;
          }
          .passbook-sheet:last-of-type {
            break-after: auto;
            page-break-after: auto;
          }
          .passbook-sheet-stack { display: block !important; gap: 0 !important; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print mb-4 flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-600"></div>
          <span className="text-sm font-semibold text-slate-700">
            {profile.brand} {profile.model}
          </span>
          <span className="text-xs text-slate-500">
            {profile.pageWidthMm}×{profile.pageHeightMm}mm
          </span>
        </div>
        <div className="flex-1"></div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {transactions.length} transactions
            {pages.length > 1 && ` · ${pages.length} pages`}
          </span>
          <button
            onClick={handlePrint}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Passbook
          </button>
          <button
            onClick={generatePDF}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {isGenerating ? "Generating..." : "Download PDF"}
          </button>
        </div>
      </div>

      {error && (
        <div className="no-print mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Sheets — one per printed page, so long passbooks print in full */}
      <div className="passbook-sheet-stack flex flex-col items-center gap-6">
        {pages.map((pageRows, pageIndex) => {
          const isLastPage = pageIndex === pages.length - 1;
          return (
            <div
              key={pageIndex}
              className="passbook-sheet"
              style={{
                width: `${profile.pageWidthMm}mm`,
                height: `${profile.pageHeightMm}mm`,
                backgroundColor: "white",
                border: "1px solid #ddd",
                position: "relative",
                overflow: "hidden",
                fontFamily: profile.fontFamily,
                fontSize: `${profile.fontSizePt}pt`,
                boxSizing: "border-box",
              }}
            >
              {/* Header */}
              <div
                style={{
                  position: "absolute",
                  left: `${profile.leftOffsetMm}mm`,
                  top: `${profile.topOffsetMm}mm`,
                  width: `${profile.printableWidthMm}mm`,
                  height: `${HEADER_HEIGHT_MM}mm`,
                  border: "0.8px solid #1a1a1a",
                  padding: `${CELL_PADDING_MM}mm ${CELL_PADDING_MM * 2}mm`,
                  boxSizing: "border-box",
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontWeight: "bold", fontSize: `${profile.fontSizePt + 1.5}pt`, color: "#0d3380" }}>
                    {headerLines.title}
                  </span>
                  {pages.length > 1 && (
                    <span style={{ fontSize: `${profile.fontSizePt - 1}pt`, color: "#666" }}>
                      Page {pageIndex + 1}/{pages.length}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: `${profile.fontSizePt - 1.5}pt`, color: "#666", marginTop: "0.4mm" }}>
                  {headerLines.subtitle}
                </div>
                <div style={{ fontSize: `${profile.fontSizePt}pt`, fontWeight: "bold", marginTop: "1mm" }}>
                  {headerLines.member}
                </div>
                <div style={{ fontSize: `${profile.fontSizePt - 1}pt`, marginTop: "0.6mm" }}>
                  {headerLines.account}
                </div>
              </div>

              {/* Table header */}
              <div
                style={{
                  position: "absolute",
                  left: `${profile.leftOffsetMm}mm`,
                  top: `${profile.topOffsetMm + HEADER_HEIGHT_MM}mm`,
                  width: `${profile.printableWidthMm}mm`,
                  height: `${TABLE_HEADER_HEIGHT_MM}mm`,
                  display: "flex",
                  backgroundColor: "#0d3380",
                  color: "white",
                  fontWeight: "bold",
                  fontSize: `${profile.fontSizePt - 0.5}pt`,
                  boxSizing: "border-box",
                }}
              >
                {columnPositions.map((colPos) => {
                  const col = columns.find((c) => c.key === colPos.key)!;
                  return (
                    <div key={col.key} style={cellStyle(col.alignment, colPos.widthMm)}>
                      {col.label}
                    </div>
                  );
                })}
              </div>

              {/* Rows */}
              <div
                style={{
                  position: "absolute",
                  left: `${profile.leftOffsetMm}mm`,
                  top: `${profile.topOffsetMm + HEADER_HEIGHT_MM + TABLE_HEADER_HEIGHT_MM}mm`,
                  width: `${profile.printableWidthMm}mm`,
                  height: `${rowsAreaHeightMm}mm`,
                  border: "0.8px solid #1a1a1a",
                  borderTop: "none",
                  boxSizing: "border-box",
                  overflow: "hidden",
                }}
              >
                {pageRows.map((txn, idx) => {
                  const serial = pageIndex * rowsPerPage + idx + 1;
                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        height: `${profile.rowHeightMm}mm`,
                        backgroundColor: idx % 2 === 0 ? "#f5f7fb" : "white",
                        borderBottom: "0.3px solid #8c8c8c",
                        boxSizing: "border-box",
                      }}
                    >
                      {columnPositions.map((colPos) => {
                        const col = columns.find((c) => c.key === colPos.key)!;
                        const raw =
                          col.key === "narration"
                            ? truncateNarration(
                                txn.narration || "--",
                                colPos.widthMm - CELL_PADDING_MM * 2,
                                monospacePitch(profile.fontSizePt)
                              )
                            : cellValue(col.key, txn, serial);
                        const color =
                          col.key === "credit"
                            ? "#005900"
                            : col.key === "debit"
                            ? "#8c0000"
                            : col.key === "balance"
                            ? "#051a66"
                            : "#000";
                        return (
                          <div
                            key={col.key}
                            style={{
                              ...cellStyle(col.alignment, colPos.widthMm),
                              color,
                              fontWeight: col.key === "balance" ? "bold" : "normal",
                              borderRight: "0.4px solid #8c8c8c",
                            }}
                          >
                            {raw}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {isLastPage && (
                  <div
                    style={{
                      display: "flex",
                      height: `${profile.rowHeightMm}mm`,
                      backgroundColor: "#e3ebf7",
                      fontWeight: "bold",
                      boxSizing: "border-box",
                    }}
                  >
                    {columnPositions.map((colPos) => {
                      const col = columns.find((c) => c.key === colPos.key)!;
                      const totalsRow: Record<string, string> = {
                        narration: "TOTAL",
                        credit: formatCurrency(totals.credit),
                        debit: formatCurrency(totals.debit),
                        balance: formatCurrency(totals.closing) || "0.00",
                      };
                      return (
                        <div
                          key={col.key}
                          style={{
                            ...cellStyle(col.alignment, colPos.widthMm),
                            color: col.key === "balance" ? "#051a66" : "#000",
                            borderRight: "0.4px solid #8c8c8c",
                          }}
                        >
                          {totalsRow[col.key] || ""}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                style={{
                  position: "absolute",
                  left: `${profile.leftOffsetMm}mm`,
                  bottom: `${profile.topOffsetMm / 2}mm`,
                  width: `${profile.printableWidthMm}mm`,
                  fontSize: `${profile.fontSizePt - 2}pt`,
                  color: "#666",
                }}
              >
                Generated: {new Date().toLocaleString("en-IN")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
