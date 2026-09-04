"use client";

import { useRef, useState } from "react";
import {
  PassbookPrinterProfile,
  PassbookTransaction,
  DEFAULT_PRINTER_PROFILE,
  PASSBOOK_COLUMNS,
  calculateColumnPositions,
  formatPassbookDate,
  formatCurrency,
  truncateNarration,
  mmToPoints,
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
  printerProfile?: Partial<PassbookPrinterProfile>;
  onPrint?: () => void;
  onDownloadPDF?: () => void;
}

export function PassbookPrint({
  member,
  deposits = [],
  transactions,
  printerProfile: profileOverrides,
  onPrint,
  onDownloadPDF,
}: PassbookPrintProps) {
  const [profile, setProfile] = useState<PassbookPrinterProfile>(() => ({
    ...DEFAULT_PRINTER_PROFILE,
    ...profileOverrides,
  }));
  const [isGenerating, setIsGenerating] = useState(false);

  const primaryDeposit = deposits[0];
  const columns = PASSBOOK_COLUMNS;
  const columnPositions = calculateColumnPositions(
    columns,
    profile.printableWidthMm,
    profile.leftOffsetMm
  );

  // Calculate available width for narration
  const narrationCol = columns.find((c) => c.key === "narration")!;
  const narrationMaxChars = Math.floor(
    (narrationCol.widthMm * 2.8) / (profile.fontSizePt / 2.5)
  );

  // Calculate pages
  const headerHeightMm = 14;
  const tableHeaderHeightMm = 5;
  const availableHeightMm = profile.printableHeightMm - profile.topOffsetMm - headerHeightMm - tableHeaderHeightMm - 5;
  const rowsPerPage = Math.floor(availableHeightMm / profile.rowHeightMm);

  // Split transactions into pages
  const pages: PassbookTransaction[][] = [];
  for (let i = 0; i < transactions.length; i += rowsPerPage) {
    pages.push(transactions.slice(i, i + rowsPerPage));
  }

  // PDF Generation
  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Courier);

      const pageWidth = mmToPoints(profile.pageWidthMm);
      const pageHeight = mmToPoints(profile.pageHeightMm);
      const leftOffset = mmToPoints(profile.leftOffsetMm);
      const topOffset = mmToPoints(profile.topOffsetMm);

      const fontSize = profile.fontSizePt * 0.75;
      const rowHeight = mmToPoints(profile.rowHeightMm);

      for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const page = doc.addPage([pageWidth, pageHeight]);
        const pageTransactions = pages[pageIndex];
        let y = pageHeight - topOffset;

        // Header box
        const headerBoxHeight = mmToPoints(headerHeightMm);
        page.drawRectangle({
          x: leftOffset,
          y: y - headerBoxHeight,
          width: mmToPoints(profile.printableWidthMm),
          height: headerBoxHeight,
          borderWidth: 1,
          borderColor: rgb(0, 0, 0),
        });

        // Society name
        page.drawText("SAHAYOG CREDIT COOPERATIVE SOCIETY LTD.", {
          x: leftOffset + mmToPoints(2),
          y: y - mmToPoints(2.5),
          size: fontSize + 2,
          font,
          color: rgb(0.05, 0.2, 0.5),
        });

        // Passbook title
        page.drawText("MEMBER PASSBOOK - TRANSACTION STATEMENT", {
          x: leftOffset + mmToPoints(2),
          y: y - mmToPoints(5.5),
          size: fontSize + 0.5,
          font,
          color: rgb(0, 0, 0),
        });

        // Member info
        page.drawText(
          `Member: ${member.name.toUpperCase()}  |  ${member.member_id}  |  ${member.member_no || ""}`,
          {
            x: leftOffset + mmToPoints(2),
            y: y - mmToPoints(8.5),
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          }
        );

        if (primaryDeposit) {
          page.drawText(
            `Account: ${primaryDeposit.deposit_no || "N/A"}  |  Type: ${(primaryDeposit.deposit_type || primaryDeposit.type || "N/A").toUpperCase()}`,
            {
              x: leftOffset + mmToPoints(2),
              y: y - mmToPoints(11),
              size: fontSize,
              font,
              color: rgb(0, 0, 0),
            }
          );
        }

        y -= headerBoxHeight;

        // Table header
        const tableHeaderH = mmToPoints(tableHeaderHeightMm);
        page.drawRectangle({
          x: leftOffset,
          y: y - tableHeaderH,
          width: mmToPoints(profile.printableWidthMm),
          height: tableHeaderH,
          color: rgb(0.05, 0.2, 0.5),
        });

        columns.forEach((col) => {
          const colPos = columnPositions.find((cp) => cp.key === col.key)!;
          let textX = leftOffset + mmToPoints(colPos.xMm - profile.leftOffsetMm);
          if (col.alignment === "center") {
            textX += mmToPoints(col.widthMm / 2);
          } else if (col.alignment === "right") {
            textX += mmToPoints(col.widthMm);
          }

          page.drawText(col.label, {
            x: textX,
            y: y - mmToPoints(3.5),
            size: fontSize,
            font,
            color: rgb(1, 1, 1),
          });
        });

        // Header separator lines
        for (let i = 1; i < columns.length; i++) {
          const x = leftOffset + mmToPoints(
            columns.slice(0, i).reduce((sum, c) => sum + c.widthMm, 0)
          );
          page.drawLine({
            start: { x, y: y - tableHeaderH },
            end: { x, y },
            thickness: 0.5,
            color: rgb(1, 1, 1),
          });
        }

        y -= tableHeaderH;

        // Transaction rows
        pageTransactions.forEach((txn, idx) => {
          const globalIdx = pageIndex * rowsPerPage + idx + 1;
          const isEven = idx % 2 === 0;

          // Row background
          page.drawRectangle({
            x: leftOffset,
            y: y - rowHeight,
            width: mmToPoints(profile.printableWidthMm),
            height: rowHeight,
            color: isEven ? rgb(0.98, 0.98, 0.98) : rgb(1, 1, 1),
          });

          // Row bottom line
          page.drawLine({
            start: { x: leftOffset, y: y - rowHeight },
            end: { x: leftOffset + mmToPoints(profile.printableWidthMm), y: y - rowHeight },
            thickness: 0.3,
            color: rgb(0.7, 0.7, 0.7),
          });

          // Cells
          const rowData: Array<{ key: string; value: string; alignment: string }> = [
            { key: "serialNumber", value: String(globalIdx), alignment: "center" },
            { key: "branch", value: txn.branch || "HEADOFFICE", alignment: "left" },
            { key: "date", value: formatPassbookDate(txn.date), alignment: "center" },
            { key: "narration", value: truncateNarration(txn.narration || "--", narrationCol.widthMm, profile.characterPitch), alignment: "left" },
            { key: "credit", value: formatCurrency(txn.credit), alignment: "right" },
            { key: "debit", value: formatCurrency(txn.debit), alignment: "right" },
            { key: "balance", value: formatCurrency(txn.balance), alignment: "right" },
          ];

          rowData.forEach((cell) => {
            const colPos = columnPositions.find((cp) => cp.key === cell.key)!;
            let textX = leftOffset + mmToPoints(colPos.xMm - profile.leftOffsetMm);
            if (cell.alignment === "center") {
              textX += mmToPoints(colPos.widthMm / 2);
            } else if (cell.alignment === "right") {
              textX += mmToPoints(colPos.widthMm);
            }

            let textColor = rgb(0, 0, 0);
            if (cell.key === "credit" && txn.credit && txn.credit > 0) {
              textColor = rgb(0, 0.35, 0);
            } else if (cell.key === "debit" && txn.debit && txn.debit > 0) {
              textColor = rgb(0.55, 0, 0);
            } else if (cell.key === "balance") {
              textColor = rgb(0.02, 0.1, 0.4);
            }

            page.drawText(cell.value, {
              x: textX,
              y: y - mmToPoints(3.2),
              size: fontSize,
              font,
              color: textColor,
            });
          });

          // Vertical lines
          for (let i = 1; i < columns.length; i++) {
            const x = leftOffset + mmToPoints(
              columns.slice(0, i).reduce((sum, c) => sum + c.widthMm, 0)
            );
            page.drawLine({
              start: { x, y: y - rowHeight },
              end: { x, y },
              thickness: 0.3,
              color: rgb(0.7, 0.7, 0.7),
            });
          }

          y -= rowHeight;
        });

        // Footer
        const footerY = topOffset + mmToPoints(1.5);
        page.drawText(
          `Generated: ${new Date().toLocaleString("en-IN")}${pages.length > 1 ? ` | Page ${pageIndex + 1}/${pages.length}` : ""}`,
          {
            x: leftOffset,
            y: footerY,
            size: fontSize - 0.5,
            font,
            color: rgb(0.4, 0.4, 0.4),
          }
        );
      }

      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      if (onDownloadPDF) {
        onDownloadPDF();
      }

      const a = document.createElement("a");
      a.href = url;
      a.download = `passbook-${member.member_id}-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (onPrint) onPrint();
    else window.print();
  };

  return (
    <div className="passbook-print-container">
      {/* Toolbar */}
      <div className="no-print mb-4 flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-600"></div>
          <span className="text-sm font-semibold text-slate-700">
            EPSON PLQ-35
          </span>
          <span className="text-xs text-slate-500">
            {profile.pageWidthMm}x{profile.pageHeightMm}mm
          </span>
        </div>
        <div className="flex-1"></div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {transactions.length} transactions
            {pages.length > 1 && ` (${pages.length} pages)`}
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

      {/* Print Preview */}
      <div className="flex justify-center">
        <div
          className="passbook-preview"
          style={{
            width: `${profile.pageWidthMm}mm`,
            height: `${profile.pageHeightMm}mm`,
            backgroundColor: "white",
            border: "1px solid #ddd",
            position: "relative",
            overflow: "hidden",
            fontFamily: profile.fontFamily,
            fontSize: `${profile.fontSizePt}pt`,
          }}
        >
          {/* Header */}
          <div
            style={{
              position: "absolute",
              left: `${profile.leftOffsetMm}mm`,
              top: `${profile.topOffsetMm}mm`,
              width: `${profile.printableWidthMm}mm`,
              height: `${headerHeightMm}mm`,
              border: "1px solid #000",
              padding: "1mm",
            }}
          >
            <div style={{ fontWeight: "bold", fontSize: "10pt", color: "#003080" }}>
              SAHAYOG CREDIT COOPERATIVE SOCIETY LTD.
            </div>
            <div style={{ fontSize: "8pt", marginTop: "0.5mm" }}>
              MEMBER PASSBOOK - TRANSACTION STATEMENT
            </div>
            <div style={{ fontSize: "7.5pt", marginTop: "1mm" }}>
              Member: {member.name.toUpperCase()} | {member.member_id}
              {primaryDeposit && (
                <> | Account: {primaryDeposit.deposit_no || "N/A"}</>
              )}
            </div>
          </div>

          {/* Table Header */}
          <div
            style={{
              position: "absolute",
              left: `${profile.leftOffsetMm}mm`,
              top: `${profile.topOffsetMm + headerHeightMm}mm`,
              width: `${profile.printableWidthMm}mm`,
              height: `${tableHeaderHeightMm}mm`,
              display: "flex",
              backgroundColor: "#003080",
            }}
          >
            {columnPositions.map((colPos) => {
              const col = columns.find((c) => c.key === colPos.key)!;
              return (
                <div
                  key={col.key}
                  style={{
                    width: `${colPos.widthMm}mm`,
                    textAlign: col.alignment,
                    color: "white",
                    fontWeight: "bold",
                    fontSize: `${profile.fontSizePt}pt`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: col.alignment === "center" ? "center" : col.alignment === "right" ? "flex-end" : "flex-start",
                    padding: "0 1mm",
                    borderRight: "1px solid rgba(255,255,255,0.3)",
                  }}
                >
                  {col.label}
                </div>
              );
            })}
          </div>

          {/* Transaction Rows */}
          <div
            style={{
              position: "absolute",
              left: `${profile.leftOffsetMm}mm`,
              top: `${profile.topOffsetMm + headerHeightMm + tableHeaderHeightMm}mm`,
              width: `${profile.printableWidthMm}mm`,
              height: `${profile.printableHeightMm - headerHeightMm - tableHeaderHeightMm - 5}mm`,
            }}
          >
            {transactions.map((txn, idx) => {
              const rowY = idx * profile.rowHeightMm;
              if (rowY + profile.rowHeightMm > profile.printableHeightMm - headerHeightMm - tableHeaderHeightMm - 5) return null;

              return (
                <div
                  key={idx}
                  style={{
                    position: "absolute",
                    top: `${rowY}mm`,
                    width: `${profile.printableWidthMm}mm`,
                    height: `${profile.rowHeightMm}mm`,
                    display: "flex",
                    backgroundColor: idx % 2 === 0 ? "#f8f8f8" : "white",
                    borderBottom: "0.3px solid #ccc",
                  }}
                >
                  {columnPositions.map((colPos) => {
                    const col = columns.find((c) => c.key === colPos.key)!;
                    let value = "";

                    switch (col.key) {
                      case "serialNumber":
                        value = String(idx + 1);
                        break;
                      case "branch":
                        value = txn.branch || "HEADOFFICE";
                        break;
                      case "date":
                        value = formatPassbookDate(txn.date);
                        break;
                      case "narration":
                        value = truncateNarration(
                          txn.narration || "--",
                          col.widthMm,
                          profile.characterPitch
                        );
                        break;
                      case "credit":
                        value = formatCurrency(txn.credit);
                        break;
                      case "debit":
                        value = formatCurrency(txn.debit);
                        break;
                      case "balance":
                        value = formatCurrency(txn.balance);
                        break;
                    }

                    const textColor =
                      (col.key === "credit" && txn.credit && txn.credit > 0) ? "#006400" :
                      (col.key === "debit" && txn.debit && txn.debit > 0) ? "#8b0000" :
                      col.key === "balance" ? "#002080" : "#000";

                    return (
                      <div
                        key={col.key}
                        style={{
                          width: `${colPos.widthMm}mm`,
                          textAlign: col.alignment,
                          color: textColor,
                          fontSize: `${profile.fontSizePt}pt`,
                          fontFamily: profile.fontFamily,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: col.alignment === "center" ? "center" : col.alignment === "right" ? "flex-end" : "flex-start",
                          padding: "0 1mm",
                          borderRight: "0.5px solid #ddd",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {value}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div
            style={{
              position: "absolute",
              left: `${profile.leftOffsetMm}mm`,
              bottom: `${profile.topOffsetMm}mm`,
              width: `${profile.printableWidthMm}mm`,
              fontSize: "7pt",
              color: "#666",
              textAlign: "center",
            }}
          >
            Generated: {new Date().toLocaleString("en-IN")}
          </div>
        </div>
      </div>
    </div>
  );
}
