/**
 * Passbook Printer Configuration
 *
 * Optimized for Epson PLQ-35 passbook/dot-matrix printer.
 * All dimensions in millimeters for physical accuracy.
 */

// ── Column Definition ──────────────────────────────────────────────────

export interface PassbookColumnConfig {
  key: string;
  label: string;
  widthMm: number;
  alignment: "left" | "center" | "right";
}

export const PASSBOOK_COLUMNS: PassbookColumnConfig[] = [
  { key: "serialNumber", label: "S.No", widthMm: 10, alignment: "center" },
  { key: "branch", label: "Branch", widthMm: 18, alignment: "left" },
  { key: "date", label: "Date", widthMm: 18, alignment: "center" },
  { key: "narration", label: "Narration", widthMm: 56, alignment: "left" },
  { key: "credit", label: "Credit (Rs.)", widthMm: 26, alignment: "right" },
  { key: "debit", label: "Debit (Rs.)", widthMm: 26, alignment: "right" },
  { key: "balance", label: "Balance", widthMm: 26, alignment: "right" },
];

export function getPassbookColumns(printableWidthMm: number): PassbookColumnConfig[] {
  const baseColumns = PASSBOOK_COLUMNS;
  const baseTotal = baseColumns.reduce((sum, col) => sum + col.widthMm, 0);
  if (baseTotal <= printableWidthMm) return baseColumns;

  const ratio = printableWidthMm / baseTotal;
  return baseColumns.map((col) => ({
    ...col,
    widthMm: Math.round(col.widthMm * ratio * 10) / 10,
  }));
}

// ── Printer Profile ─────────────────────────────────────────────────────

export interface PassbookPrinterProfile {
  brand: string;
  model: string;
  pageWidthMm: number;
  pageHeightMm: number;
  printableWidthMm: number;
  printableHeightMm: number;
  leftOffsetMm: number;
  topOffsetMm: number;
  fontFamily: string;
  fontSizePt: number;
  lineHeightMm: number;
  rowHeightMm: number;
  characterPitch?: number;
}

export const DEFAULT_PRINTER_PROFILE: PassbookPrinterProfile = {
  brand: "EPSON",
  model: "PLQ-35",
  pageWidthMm: 170,
  pageHeightMm: 105,
  printableWidthMm: 160,
  printableHeightMm: 95,
  leftOffsetMm: 5,
  topOffsetMm: 5,
  fontFamily: "Courier New",
  fontSizePt: 8.5,
  lineHeightMm: 3.8,
  rowHeightMm: 4.2,
  characterPitch: 10,
};

export const PRINTER_PROFILES: Record<string, PassbookPrinterProfile> = {
  plq35: {
    ...DEFAULT_PRINTER_PROFILE,
  },
  a5: {
    brand: "Generic",
    model: "A5 Passbook",
    pageWidthMm: 210,
    pageHeightMm: 148,
    printableWidthMm: 190,
    printableHeightMm: 135,
    leftOffsetMm: 10,
    topOffsetMm: 10,
    fontFamily: "Courier New",
    fontSizePt: 9,
    lineHeightMm: 4.2,
    rowHeightMm: 4.8,
    characterPitch: 10,
  },
};

export function getDefaultProfile(size?: string): PassbookPrinterProfile {
  if (size && PRINTER_PROFILES[size.toLowerCase()]) {
    return PRINTER_PROFILES[size.toLowerCase()];
  }
  return DEFAULT_PRINTER_PROFILE;
}

// ── Transaction Data ────────────────────────────────────────────────────

export interface PassbookTransaction {
  serialNumber: number;
  branch: string;
  date: string;
  narration: string;
  credit: number | null;
  debit: number | null;
  balance: number;
}

// ── Conversion Utilities ───────────────────────────────────────────────

export function mmToPoints(mm: number): number {
  return mm * 2.83465;
}

export function ptToPoints(pt: number): number {
  return pt * 0.75;
}

export function mmToPixels(mm: number, dpi: number = 96): number {
  return (mm / 25.4) * dpi;
}

// ── Layout Calculation ─────────────────────────────────────────────────

export function calculateColumnPositions(
  columns: PassbookColumnConfig[],
  printableWidthMm: number,
  leftOffsetMm: number
): Array<{ key: string; xMm: number; widthMm: number }> {
  const totalWidth = columns.reduce((sum, col) => sum + col.widthMm, 0);

  if (totalWidth > printableWidthMm) {
    console.warn(
      `Total column width (${totalWidth}mm) exceeds printable width (${printableWidthMm}mm)`
    );
  }

  let currentX = leftOffsetMm;
  return columns.map((col) => {
    const position = { key: col.key, xMm: currentX, widthMm: col.widthMm };
    currentX += col.widthMm;
    return position;
  });
}

// ── Formatting Utilities ───────────────────────────────────────────────

export function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return "";
  return amount.toFixed(2);
}

export function formatPassbookDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

export function truncateNarration(text: string, maxWidthMm: number, charPitch: number = 10): string {
  const maxChars = Math.floor(maxWidthMm / (charPitch / 10));
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars - 2).trim() + "..";
}
