/**
 * Parser for the "DEPOSITER & RECOVERY" ledger book.
 *
 * Both sheets store one member per *pair* of rows:
 *
 *   row i     S.NO | NAME | ADDRESS | Mobile | ...totals... | "DATE" | d1 | d2 | ...
 *   row i+1     -  |   -  |    -    |   -    |      -       | "AMT"  | a1 | a2 | ...
 *
 * so the columns to the right of the marker cell are a daily collection ledger.
 * Three things the layout does that a naive reader gets wrong:
 *
 *  - Several hundred pre-numbered but empty template rows sit below the real
 *    data. A row only starts a record when its NAME cell is filled.
 *  - "A" in an amount cell means the collector marked the member absent that
 *    day. It is not a zero-value transaction; there is no transaction at all.
 *  - One row spells the marker "AM T", so markers are matched with spaces
 *    stripped.
 */

import { excelSerialToISODate, type XlsxCell, type XlsxSheet } from "./xlsx";

export interface LedgerEntry {
  date: string; // ISO
  amount: number;
}

export interface LedgerRecord {
  /** 1-based spreadsheet row of the record's first line — a stable id. */
  row: number;
  name: string;
  address: string;
  phone: string;
  rawPhone: string;
  remarks: string;
  entries: LedgerEntry[];
  total: number;
  /** Recovery sheet only. */
  loanAmount?: number;
  recoveryAmount?: number;
  paidAmount?: number;
  duesAmount?: number;
  /** Depositor sheet only — the end date written under the remarks cell. */
  endDate?: string;
}

export const DEPOSITOR_SHEET = "DEPOSITOR 25-26";
export const RECOVERY_SHEET = "RECOVER 25-26";

const NAME_COLUMN = 1;
const ADDRESS_COLUMN = 2;
const PHONE_COLUMN = 3;

// Excel serials for roughly 1982–2064; the ledger only spans 2025–2026.
const MIN_DATE_SERIAL = 30000;
const MAX_DATE_SERIAL = 60000;

export function normaliseName(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/** Last 10 digits of the first plausible Indian mobile in the cell. */
export function normalisePhone(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = String(value).trim();
  if (!text || /^not\b/i.test(text)) return "";
  if (text.endsWith(".0")) text = text.slice(0, -2);
  for (const token of text.match(/\d{7,}/g) ?? []) {
    const candidate = token.length >= 10 ? token.slice(-10) : token;
    if (candidate.length === 10 && "6789".includes(candidate[0])) return candidate;
  }
  return "";
}

function text(cell: XlsxCell): string {
  return cell === null || cell === undefined ? "" : String(cell).replace(/\s+/g, " ").trim();
}

function numberOrNull(cell: XlsxCell): number | null {
  return typeof cell === "number" && Number.isFinite(cell) ? cell : null;
}

function markerColumn(row: XlsxCell[]): number {
  for (let i = 0; i < row.length; i++) {
    const cell = row[i];
    if (typeof cell !== "string") continue;
    const token = cell.replace(/\s+/g, "").toUpperCase();
    if (token === "DATE" || token === "AMT") return i;
  }
  return -1;
}

function readEntries(dateRow: XlsxCell[], amountRow: XlsxCell[], from: number): LedgerEntry[] {
  const entries: LedgerEntry[] = [];
  const width = Math.max(dateRow.length, amountRow.length);

  for (let i = from + 1; i < width; i++) {
    const serial = numberOrNull(dateRow[i] ?? null);
    if (serial === null || serial < MIN_DATE_SERIAL || serial > MAX_DATE_SERIAL) continue;
    const date = excelSerialToISODate(serial);
    if (!date) continue;

    const raw = amountRow[i] ?? null;
    let amount: number | null = null;
    if (typeof raw === "number") {
      amount = raw;
    } else if (typeof raw === "string") {
      const token = raw.replace(/[\s,]/g, "");
      if (!token || token.toUpperCase() === "A") continue; // absent that day
      const parsed = Number(token);
      amount = Number.isFinite(parsed) ? parsed : null;
    }
    if (amount === null || !Number.isFinite(amount) || amount <= 0) continue;

    entries.push({ date, amount: Math.round(amount * 100) / 100 });
  }

  entries.sort((a, b) => a.date.localeCompare(b.date));
  return entries;
}

function parseRecords(
  rows: XlsxCell[][],
  headerRows: number,
  read: (top: XlsxCell[], bottom: XlsxCell[], record: LedgerRecord) => void
): LedgerRecord[] {
  const records: LedgerRecord[] = [];

  for (let i = headerRows; i < rows.length; i++) {
    const top = rows[i] ?? [];
    const name = normaliseName(top[NAME_COLUMN] ?? null);
    if (!name) continue; // empty template row

    const bottom = rows[i + 1] ?? [];
    const marker = markerColumn(top);
    const rawPhone = text(top[PHONE_COLUMN] ?? null);

    const record: LedgerRecord = {
      row: i + 1,
      name,
      address: text(top[ADDRESS_COLUMN] ?? null),
      phone: normalisePhone(top[PHONE_COLUMN] ?? null),
      rawPhone,
      remarks: "",
      entries: marker >= 0 ? readEntries(top, bottom, marker) : [],
      total: 0,
    };
    read(top, bottom, record);
    record.total = record.entries.reduce((sum, entry) => sum + entry.amount, 0);
    records.push(record);
  }
  return records;
}

export function parseDepositorSheet(sheet: XlsxSheet): LedgerRecord[] {
  return parseRecords(sheet.rows, 2, (top, bottom, record) => {
    record.remarks = text(top[4] ?? null).toUpperCase();
    const endSerial = numberOrNull(bottom[4] ?? null);
    if (endSerial !== null && endSerial >= MIN_DATE_SERIAL && endSerial <= MAX_DATE_SERIAL) {
      record.endDate = excelSerialToISODate(endSerial) ?? undefined;
    }
  });
}

export function parseRecoverySheet(sheet: XlsxSheet): LedgerRecord[] {
  return parseRecords(sheet.rows, 3, (top, _bottom, record) => {
    record.loanAmount = numberOrNull(top[4] ?? null) ?? undefined;
    record.recoveryAmount = numberOrNull(top[5] ?? null) ?? undefined;
    record.paidAmount = numberOrNull(top[6] ?? null) ?? undefined;
    record.duesAmount = numberOrNull(top[7] ?? null) ?? undefined;
    record.remarks = text(top[8] ?? null).toUpperCase();
  });
}

// ── Member matching ──────────────────────────────────────────────────────

export interface MatchableMember {
  id: string;
  name: string;
  phone: string | null;
  member_id?: string | null;
}

export type MatchStatus = "matched" | "no-phone" | "not-found" | "ambiguous";

export interface MatchResult {
  status: MatchStatus;
  member?: MatchableMember;
  /** Members sharing the phone number when the name did not agree. */
  phoneOnly?: MatchableMember[];
}

/**
 * Index members for lookup. Keyed on normalised name + normalised phone,
 * because the import only touches members where *both* agree.
 */
export function indexMembers(members: MatchableMember[]) {
  const byNameAndPhone = new Map<string, MatchableMember[]>();
  const byPhone = new Map<string, MatchableMember[]>();

  for (const member of members) {
    const phone = normalisePhone(member.phone);
    if (!phone) continue;
    const name = normaliseName(member.name);
    if (!name) continue;

    const key = `${name}|${phone}`;
    const exact = byNameAndPhone.get(key);
    if (exact) exact.push(member);
    else byNameAndPhone.set(key, [member]);

    const samePhone = byPhone.get(phone);
    if (samePhone) samePhone.push(member);
    else byPhone.set(phone, [member]);
  }
  return { byNameAndPhone, byPhone };
}

export function matchRecord(
  record: LedgerRecord,
  index: ReturnType<typeof indexMembers>
): MatchResult {
  if (!record.phone) return { status: "no-phone" };

  const exact = index.byNameAndPhone.get(`${record.name}|${record.phone}`);
  if (exact && exact.length === 1) return { status: "matched", member: exact[0] };
  if (exact && exact.length > 1) return { status: "ambiguous", member: exact[0], phoneOnly: exact };

  const samePhone = index.byPhone.get(record.phone);
  return { status: "not-found", phoneOnly: samePhone };
}
