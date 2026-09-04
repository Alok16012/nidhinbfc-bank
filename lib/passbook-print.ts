/**
 * Passbook Printer Configuration
 *
 * Optimized for Epson PLQ-35 passbook/dot-matrix printer.
 * All dimensions in millimeters for physical accuracy.
 */

// ── Society Identity ───────────────────────────────────────────────────

export const PASSBOOK_SOCIETY = {
  name: "GRIHSEVAK NIDHI LIMITED",
  subtitle: "Regd. under Nidhi Rules 2014 & Companies Act 2013",
  branch: "HEADOFFICE - 001",
} as const;

// ── Vertical Metrics ───────────────────────────────────────────────────
// Shared by the PDF writer and the on-screen preview so both paginate the
// same way. Previously each computed rowsPerPage from a different formula.

export const HEADER_HEIGHT_MM = 16;
export const TABLE_HEADER_HEIGHT_MM = 5;
export const FOOTER_HEIGHT_MM = 5;

export function getRowsPerPage(profile: PassbookPrinterProfile): number {
  const available =
    profile.printableHeightMm - HEADER_HEIGHT_MM - TABLE_HEADER_HEIGHT_MM - FOOTER_HEIGHT_MM;
  return Math.max(1, Math.floor(available / profile.rowHeightMm));
}

/**
 * Split rows across pages, reserving a slot on the final page for the TOTAL
 * row. Without the reserve, a run that exactly fills the last page pushed the
 * totals past the table frame, where the preview clipped it away entirely.
 */
export function paginate<T>(items: T[], perPage: number): T[][] {
  if (items.length === 0) return [[]];
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += perPage) {
    pages.push(items.slice(i, i + perPage));
  }
  if (pages[pages.length - 1].length >= perPage) pages.push([]);
  return pages;
}

/**
 * Effective characters-per-inch for the preview's monospace truncation.
 * A Courier glyph advances 0.6em, so the pitch follows the font size rather
 * than the profile's fixed 10 CPI (which assumes 12pt and under-fills at 8.5).
 */
export function monospacePitch(fontSizePt: number): number {
  return 72 / (0.6 * fontSizePt);
}

// ── Column Definition ──────────────────────────────────────────────────

export interface PassbookColumnConfig {
  key: string;
  label: string;
  widthMm: number;
  alignment: "left" | "center" | "right";
}

// Branch is printed once in the page header, not repeated on every row — a
// per-row "HEADOFFICE" column ate 10% of the passbook width and overflowed it.
export const PASSBOOK_COLUMNS: PassbookColumnConfig[] = [
  { key: "serialNumber", label: "S.No", widthMm: 10, alignment: "center" },
  { key: "date", label: "Date", widthMm: 18, alignment: "center" },
  { key: "narration", label: "Particulars", widthMm: 62, alignment: "left" },
  { key: "credit", label: "Credit", widthMm: 23, alignment: "right" },
  { key: "debit", label: "Debit", widthMm: 23, alignment: "right" },
  { key: "balance", label: "Balance", widthMm: 24, alignment: "right" },
];

/**
 * Scale the column set to exactly fill the printable width — up as well as
 * down, so the table never floats short of the page edge or spills past it.
 * Rounding drift is absorbed by Particulars, which is the elastic column.
 */
export function getPassbookColumns(printableWidthMm: number): PassbookColumnConfig[] {
  const baseTotal = PASSBOOK_COLUMNS.reduce((sum, col) => sum + col.widthMm, 0);
  const ratio = printableWidthMm / baseTotal;

  const scaled = PASSBOOK_COLUMNS.map((col) => ({
    ...col,
    widthMm: Math.round(col.widthMm * ratio * 10) / 10,
  }));

  const drift = printableWidthMm - scaled.reduce((sum, col) => sum + col.widthMm, 0);
  const elastic = scaled.find((col) => col.key === "narration");
  if (elastic) elastic.widthMm = Math.round((elastic.widthMm + drift) * 10) / 10;

  return scaled;
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
  if (amount === null || amount === undefined || amount === 0) return "";
  // Indian grouping, no symbol — the PDF standard fonts are WinAnsi and cannot
  // encode the rupee sign, so the unit is stated in the column header instead.
  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPassbookDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

/**
 * Monospace-pitch truncation, used by the on-screen preview.
 * At `charPitch` characters per inch one glyph is 25.4/charPitch mm wide — the
 * previous version divided by charPitch/10 instead, allowing roughly 2.5x too
 * many characters so long narrations ran into the next column.
 */
export function truncateNarration(text: string, maxWidthMm: number, charPitch: number = 10): string {
  const maxChars = Math.floor((maxWidthMm * charPitch) / 25.4);
  if (maxChars <= 2) return "";
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars - 2).trim() + "..";
}

/**
 * Truncate to a measured width. `measure` comes from the real PDF font, so this
 * is exact rather than pitch-based.
 */
export function fitText(text: string, maxWidthPt: number, measure: (s: string) => number): string {
  if (!text) return "";
  if (measure(text) <= maxWidthPt) return text;

  let out = text;
  while (out.length > 0 && measure(out + "..") > maxWidthPt) {
    out = out.slice(0, -1);
  }
  return out.length > 0 ? out.trimEnd() + ".." : "";
}

/**
 * X position for a piece of text inside a column, accounting for the text's own
 * width. Center/right alignment previously only shifted the *start* of the text
 * to the middle/right edge, so every centered and right-aligned cell overflowed
 * into the next column and the last column ran off the page.
 */
export function alignedTextX(
  columnXPt: number,
  columnWidthPt: number,
  textWidthPt: number,
  alignment: "left" | "center" | "right",
  paddingPt: number
): number {
  if (alignment === "center") {
    return columnXPt + (columnWidthPt - textWidthPt) / 2;
  }
  if (alignment === "right") {
    return columnXPt + columnWidthPt - textWidthPt - paddingPt;
  }
  return columnXPt + paddingPt;
}

/**
 * pdf-lib's standard fonts use WinAnsi encoding and throw on anything outside
 * it — a member name in Devanagari, a stray emoji or a curly quote would abort
 * the whole document. Map the common typographic characters and drop the rest.
 */
export function sanitizeForPdf(value: unknown): string {
  return String(value ?? "")
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐-―]/g, "-")
    .replace(/…/g, "...")
    .replace(/₹/g, "Rs.")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
}
