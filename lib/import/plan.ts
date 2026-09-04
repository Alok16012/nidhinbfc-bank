/**
 * Turns parsed ledger records into an explicit, reviewable list of database
 * writes. Kept pure so the preview the user approves is computed by exactly
 * the same code that later executes — nothing is decided during the run.
 *
 * Rules, as chosen by the user:
 *  - Only members whose name *and* mobile both match an existing member are
 *    touched. Nothing is created for anyone else; they are reported instead.
 *  - Collections are added to the member's existing account when there is one,
 *    and a new account is opened only when they have none.
 *  - The daily entries are the source of truth for balances; the sheet's own
 *    total columns disagree with them and are carried only as a note.
 */

import type { LedgerRecord, MatchableMember, MatchStatus } from "./ledger-sheet";
import { indexMembers, matchRecord } from "./ledger-sheet";

/** Marks every row this importer writes, so a run is repeatable and traceable. */
export const IMPORT_TAG = "XLS25";

export function depositReference(row: number, date: string): string {
  return `${IMPORT_TAG}/D/${row}/${date.replace(/-/g, "")}`;
}

export function recoveryReference(row: number, date: string): string {
  return `${IMPORT_TAG}/R/${row}/${date.replace(/-/g, "")}`;
}

export interface ExistingDeposit {
  id: string;
  member_id: string;
  type?: string | null;
  deposit_type?: string | null;
  current_balance?: number | null;
  deposit_no?: string | null;
  open_date?: string | null;
}

export interface ExistingLoan {
  id: string;
  member_id: string;
  status?: string | null;
  amount?: number | null;
  total_paid?: number | null;
  outstanding_balance?: number | null;
  loan_id?: string | null;
  loan_no?: string | null;
}

export interface PlannedEntry {
  date: string;
  amount: number;
  reference: string;
}

export interface PlannedAccount {
  record: LedgerRecord;
  member: MatchableMember;
  /** Existing account to append to, when the member already has one. */
  accountId?: string;
  accountLabel?: string;
  /** Set when a new account has to be opened first. */
  createAccount?: {
    installment: number;
    openDate: string;
    principal?: number;
  };
  entries: PlannedEntry[];
  duplicateEntries: number;
  amount: number;
}

export interface SkippedRecord {
  record: LedgerRecord;
  reason: MatchStatus | "no-entries";
  hint?: string;
}

export interface ImportPlan {
  accounts: PlannedAccount[];
  skipped: SkippedRecord[];
  totals: {
    records: number;
    members: number;
    entries: number;
    amount: number;
    duplicateEntries: number;
    newAccounts: number;
  };
}

/** Most frequent entry amount — the member's daily instalment. */
export function inferInstallment(record: LedgerRecord): number {
  const counts = new Map<number, number>();
  for (const entry of record.entries) {
    counts.set(entry.amount, (counts.get(entry.amount) ?? 0) + 1);
  }
  let best = 0;
  let bestCount = -1;
  for (const [amount, count] of counts) {
    if (count > bestCount || (count === bestCount && amount < best)) {
      best = amount;
      bestCount = count;
    }
  }
  return best;
}

function summarise(accounts: PlannedAccount[], skipped: SkippedRecord[], records: number): ImportPlan {
  return {
    accounts,
    skipped,
    totals: {
      records,
      members: new Set(accounts.map((a) => a.member.id)).size,
      entries: accounts.reduce((total, a) => total + a.entries.length, 0),
      amount: accounts.reduce((total, a) => total + a.amount, 0),
      duplicateEntries: accounts.reduce((total, a) => total + a.duplicateEntries, 0),
      newAccounts: accounts.filter((a) => a.createAccount).length,
    },
  };
}

interface PlanInput<TAccount> {
  records: LedgerRecord[];
  members: MatchableMember[];
  accounts: TAccount[];
  /** reference_no values already present, so a re-run does not duplicate. */
  existingReferences: Set<string>;
}

function planEntries(
  record: LedgerRecord,
  reference: (row: number, date: string) => string,
  existingReferences: Set<string>
) {
  const entries: PlannedEntry[] = [];
  let duplicates = 0;
  const occurrences = new Map<string, number>();

  for (const entry of record.entries) {
    // A member can pay twice on one day, and at least one row in the book does.
    // Numbering the repeat keeps its reference distinct, so the second payment
    // is imported rather than mistaken for a duplicate of the first.
    const nth = (occurrences.get(entry.date) ?? 0) + 1;
    occurrences.set(entry.date, nth);

    const base = reference(record.row, entry.date);
    const key = nth === 1 ? base : `${base}#${nth}`;

    if (existingReferences.has(key)) {
      duplicates++; // already imported by an earlier run
      continue;
    }
    entries.push({ date: entry.date, amount: entry.amount, reference: key });
  }
  return { entries, duplicates };
}

const DAILY_TYPES = new Set(["drd", "rd"]);

export function buildDepositPlan({
  records,
  members,
  accounts,
  existingReferences,
}: PlanInput<ExistingDeposit>): ImportPlan {
  const index = indexMembers(members);

  const byMember = new Map<string, ExistingDeposit[]>();
  for (const deposit of accounts) {
    const list = byMember.get(deposit.member_id);
    if (list) list.push(deposit);
    else byMember.set(deposit.member_id, [deposit]);
  }

  const planned: PlannedAccount[] = [];
  const skipped: SkippedRecord[] = [];
  // A member can appear on several sheet rows; the first row opens the account
  // and the rest must append to that same one rather than each opening another.
  const openedFor = new Map<string, PlannedAccount>();

  for (const record of records) {
    const match = matchRecord(record, index);
    if (match.status !== "matched" || !match.member) {
      skipped.push({
        record,
        reason: match.status,
        hint:
          match.status === "not-found" && match.phoneOnly?.length
            ? `mobile belongs to ${match.phoneOnly.map((m) => m.name).join(", ")}`
            : undefined,
      });
      continue;
    }
    if (record.entries.length === 0) {
      skipped.push({ record, reason: "no-entries" });
      continue;
    }

    const member = match.member;
    const { entries, duplicates } = planEntries(record, depositReference, existingReferences);
    const amount = entries.reduce((total, e) => total + e.amount, 0);

    const existing = (byMember.get(member.id) ?? []).filter((d) =>
      DAILY_TYPES.has(String(d.deposit_type ?? d.type ?? "").toLowerCase())
    );
    const reuse = existing[0] ?? (byMember.get(member.id) ?? [])[0];
    const alreadyOpening = openedFor.get(member.id);

    const account: PlannedAccount = {
      record,
      member,
      entries,
      duplicateEntries: duplicates,
      amount,
      ...(reuse
        ? { accountId: reuse.id, accountLabel: reuse.deposit_no ?? undefined }
        : alreadyOpening
        ? { accountLabel: "opens with row " + alreadyOpening.record.row }
        : {
            createAccount: {
              installment: inferInstallment(record),
              openDate: record.entries[0].date,
            },
          }),
    };
    if (!reuse && !alreadyOpening) openedFor.set(member.id, account);
    planned.push(account);
  }

  return summarise(planned, skipped, records.length);
}

const CLOSED_LOAN_STATUS = new Set(["closed"]);

export function buildRecoveryPlan({
  records,
  members,
  accounts,
  existingReferences,
}: PlanInput<ExistingLoan>): ImportPlan {
  const index = indexMembers(members);

  const byMember = new Map<string, ExistingLoan[]>();
  for (const loan of accounts) {
    const list = byMember.get(loan.member_id);
    if (list) list.push(loan);
    else byMember.set(loan.member_id, [loan]);
  }

  const planned: PlannedAccount[] = [];
  const skipped: SkippedRecord[] = [];
  const openedFor = new Map<string, PlannedAccount>();

  for (const record of records) {
    const match = matchRecord(record, index);
    if (match.status !== "matched" || !match.member) {
      skipped.push({
        record,
        reason: match.status,
        hint:
          match.status === "not-found" && match.phoneOnly?.length
            ? `mobile belongs to ${match.phoneOnly.map((m) => m.name).join(", ")}`
            : undefined,
      });
      continue;
    }
    if (record.entries.length === 0) {
      skipped.push({ record, reason: "no-entries" });
      continue;
    }

    const member = match.member;
    const { entries, duplicates } = planEntries(record, recoveryReference, existingReferences);
    const amount = entries.reduce((total, e) => total + e.amount, 0);

    const open = (byMember.get(member.id) ?? []).filter(
      (l) => !CLOSED_LOAN_STATUS.has(String(l.status ?? "").toLowerCase())
    );
    const reuse = open[0] ?? (byMember.get(member.id) ?? [])[0];
    const alreadyOpening = openedFor.get(member.id);

    const account: PlannedAccount = {
      record,
      member,
      entries,
      duplicateEntries: duplicates,
      amount,
      ...(reuse
        ? { accountId: reuse.id, accountLabel: reuse.loan_id ?? reuse.loan_no ?? undefined }
        : alreadyOpening
        ? { accountLabel: "opens with row " + alreadyOpening.record.row }
        : {
            createAccount: {
              installment: inferInstallment(record),
              openDate: record.entries[0].date,
              principal: record.loanAmount ?? 0,
            },
          }),
    };
    if (!reuse && !alreadyOpening) openedFor.set(member.id, account);
    planned.push(account);
  }

  return summarise(planned, skipped, records.length);
}
