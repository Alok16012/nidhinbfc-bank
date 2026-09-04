/**
 * Executes an approved ImportPlan against Supabase.
 *
 * Every write carries a reference_no built by plan.ts, so the run is
 * idempotent: re-running after a network failure inserts only what is missing,
 * and a completed import re-planned later shows zero remaining entries.
 *
 * Passbook rows are NOT written here. The database already has AFTER INSERT
 * triggers on deposit_transactions and loan_repayments that mirror each row
 * into the passbook; writing them by hand would double every entry.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { IMPORT_TAG, type ImportPlan, type PlannedAccount, type PlannedEntry } from "./plan";
import { generateDepositID, generateLoanID } from "@/lib/utils";

const INSERT_BATCH = 400;
const PAGE = 1000;

export interface Progress {
  phase: string;
  done: number;
  total: number;
}

export interface RunResult {
  accountsCreated: number;
  entriesInserted: number;
  amount: number;
  errors: string[];
}

/** Supabase caps a select at 1000 rows; walk until a short page comes back. */
export async function fetchAll<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: (from: number, to: number) => any
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    all.push(...rows);
    if (rows.length < PAGE) return all;
  }
}

/** Merge every planned row for one account, in date order. */
function groupByAccount(accounts: PlannedAccount[]) {
  const groups = new Map<string, { account: PlannedAccount; entries: PlannedEntry[] }>();
  for (const account of accounts) {
    if (!account.accountId) continue;
    const group = groups.get(account.accountId);
    if (group) group.entries.push(...account.entries);
    else groups.set(account.accountId, { account, entries: [...account.entries] });
  }
  for (const group of groups.values()) {
    group.entries.sort((a, b) => a.date.localeCompare(b.date));
  }
  return groups;
}

async function insertInBatches(
  supabase: SupabaseClient,
  table: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: any[],
  onProgress: (inserted: number) => void
): Promise<string[]> {
  const errors: string[] = [];
  for (let i = 0; i < rows.length; i += INSERT_BATCH) {
    const slice = rows.slice(i, i + INSERT_BATCH);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from(table) as any).insert(slice);
    if (error) errors.push(`${table} rows ${i + 1}-${i + slice.length}: ${error.message}`);
    else onProgress(slice.length);
  }
  return errors;
}

export async function runDepositImport(
  supabase: SupabaseClient,
  plan: ImportPlan,
  report: (progress: Progress) => void
): Promise<RunResult> {
  const errors: string[] = [];
  let accountsCreated = 0;

  // 1. Open accounts for members who have none.
  const toCreate = plan.accounts.filter((a) => a.createAccount);
  report({ phase: "Opening deposit accounts", done: 0, total: toCreate.length });

  for (const [i, account] of toCreate.entries()) {
    const spec = account.createAccount!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("deposits") as any)
      .insert({
        member_id: account.member.id,
        deposit_id: generateDepositID(),
        type: "drd",
        deposit_type: "drd",
        amount: spec.installment,
        interest_rate: 0,
        current_balance: 0,
        balance: 0,
        status: "active",
        open_date: spec.openDate,
        nominee_name: "",
        remarks: `${IMPORT_TAG} imported from ledger row ${account.record.row}`,
      })
      .select("id, deposit_no")
      .single();

    if (error || !data) {
      errors.push(`Open account for ${account.member.name}: ${error?.message ?? "no row returned"}`);
      continue;
    }
    accountsCreated++;
    account.accountId = data.id;
    account.accountLabel = data.deposit_no;
    // Later rows for the same member were parked on this one.
    for (const other of plan.accounts) {
      if (!other.accountId && other.member.id === account.member.id) other.accountId = data.id;
    }
    report({ phase: "Opening deposit accounts", done: i + 1, total: toCreate.length });
  }

  // 2. Insert collections with a running balance per account.
  const groups = groupByAccount(plan.accounts);
  const ids = [...groups.keys()];
  const balances = new Map<string, number>();
  if (ids.length) {
    const current = await fetchAll<{ id: string; current_balance: number | null }>((from, to) =>
      supabase.from("deposits").select("id, current_balance").in("id", ids).range(from, to)
    );
    for (const row of current) balances.set(row.id, Number(row.current_balance ?? 0));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = [];
  for (const [accountId, group] of groups) {
    let balance = balances.get(accountId) ?? 0;
    for (const entry of group.entries) {
      balance += entry.amount;
      rows.push({
        deposit_id: accountId,
        member_id: group.account.member.id,
        transaction_type: "credit",
        amount: entry.amount,
        balance_after: Math.round(balance * 100) / 100,
        reference_no: entry.reference,
        narration: "Daily collection (ledger import)",
        date: entry.date,
        payment_mode: "cash",
      });
    }
    balances.set(accountId, balance);
  }

  let inserted = 0;
  report({ phase: "Importing deposit collections", done: 0, total: rows.length });
  errors.push(
    ...(await insertInBatches(supabase, "deposit_transactions", rows, (n) => {
      inserted += n;
      report({ phase: "Importing deposit collections", done: inserted, total: rows.length });
    }))
  );

  // 3. Bring each account's balance up to date.
  report({ phase: "Updating balances", done: 0, total: groups.size });
  let updated = 0;
  for (const accountId of groups.keys()) {
    const balance = Math.round((balances.get(accountId) ?? 0) * 100) / 100;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("deposits") as any)
      .update({ current_balance: balance, balance })
      .eq("id", accountId);
    if (error) errors.push(`Update balance ${accountId}: ${error.message}`);
    report({ phase: "Updating balances", done: ++updated, total: groups.size });
  }

  return {
    accountsCreated,
    entriesInserted: inserted,
    amount: rows.slice(0, inserted).reduce((total, row) => total + row.amount, 0),
    errors,
  };
}

export async function runRecoveryImport(
  supabase: SupabaseClient,
  plan: ImportPlan,
  report: (progress: Progress) => void
): Promise<RunResult> {
  const errors: string[] = [];
  let accountsCreated = 0;

  const toCreate = plan.accounts.filter((a) => a.createAccount);
  report({ phase: "Opening loan accounts", done: 0, total: toCreate.length });

  for (const [i, account] of toCreate.entries()) {
    const spec = account.createAccount!;
    const principal = spec.principal || account.record.loanAmount || 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("loans") as any)
      .insert({
        member_id: account.member.id,
        loan_id: generateLoanID(),
        loan_type: "personal",
        amount: principal,
        disbursed_amount: principal,
        interest_rate: 0,
        tenure_months: 12,
        emi_amount: spec.installment,
        repayment_type: "emi",
        status: "disbursed",
        applied_date: spec.openDate,
        disbursed_date: spec.openDate,
        outstanding_balance: principal,
        principal_outstanding: principal,
        purpose: "Imported from ledger",
        remarks: `${IMPORT_TAG} imported from ledger row ${account.record.row}`,
      })
      .select("id, loan_id")
      .single();

    if (error || !data) {
      errors.push(`Open loan for ${account.member.name}: ${error?.message ?? "no row returned"}`);
      continue;
    }
    accountsCreated++;
    account.accountId = data.id;
    account.accountLabel = data.loan_id;
    for (const other of plan.accounts) {
      if (!other.accountId && other.member.id === account.member.id) other.accountId = data.id;
    }
    report({ phase: "Opening loan accounts", done: i + 1, total: toCreate.length });
  }

  const groups = groupByAccount(plan.accounts);
  const ids = [...groups.keys()];

  // Continue installment numbering after whatever the loan already has.
  const nextInstallment = new Map<string, number>();
  const paidSoFar = new Map<string, number>();
  if (ids.length) {
    const existing = await fetchAll<{ loan_id: string; installment_no: number | null }>((from, to) =>
      supabase.from("loan_repayments").select("loan_id, installment_no").in("loan_id", ids).range(from, to)
    );
    for (const row of existing) {
      const seen = nextInstallment.get(row.loan_id) ?? 0;
      nextInstallment.set(row.loan_id, Math.max(seen, Number(row.installment_no ?? 0)));
    }
    const loans = await fetchAll<{ id: string; total_paid: number | null; amount: number | null }>((from, to) =>
      supabase.from("loans").select("id, total_paid, amount").in("id", ids).range(from, to)
    );
    for (const loan of loans) paidSoFar.set(loan.id, Number(loan.total_paid ?? 0));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = [];
  for (const [loanId, group] of groups) {
    let installment = nextInstallment.get(loanId) ?? 0;
    let paid = paidSoFar.get(loanId) ?? 0;
    for (const entry of group.entries) {
      installment++;
      paid += entry.amount;
      rows.push({
        loan_id: loanId,
        member_id: group.account.member.id,
        installment_no: installment,
        due_date: entry.date,
        paid_date: entry.date,
        total_amount: entry.amount,
        paid_amount: entry.amount,
        principal_amount: entry.amount,
        interest_amount: 0,
        emi_amount: entry.amount,
        payment_mode: "cash",
        reference_no: entry.reference,
        narration: "Daily recovery (ledger import)",
        status: "paid",
      });
    }
    paidSoFar.set(loanId, paid);
  }

  let inserted = 0;
  report({ phase: "Importing recovery collections", done: 0, total: rows.length });
  errors.push(
    ...(await insertInBatches(supabase, "loan_repayments", rows, (n) => {
      inserted += n;
      report({ phase: "Importing recovery collections", done: inserted, total: rows.length });
    }))
  );

  report({ phase: "Updating loan balances", done: 0, total: groups.size });
  let updated = 0;
  for (const loanId of groups.keys()) {
    const paid = Math.round((paidSoFar.get(loanId) ?? 0) * 100) / 100;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: loan } = await (supabase.from("loans") as any)
      .select("amount")
      .eq("id", loanId)
      .single();
    const principal = Number(loan?.amount ?? 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("loans") as any)
      .update({
        total_paid: paid,
        outstanding_balance: Math.max(0, Math.round((principal - paid) * 100) / 100),
      })
      .eq("id", loanId);
    if (error) errors.push(`Update loan ${loanId}: ${error.message}`);
    report({ phase: "Updating loan balances", done: ++updated, total: groups.size });
  }

  return {
    accountsCreated,
    entriesInserted: inserted,
    amount: rows.slice(0, inserted).reduce((total, row) => total + row.total_amount, 0),
    errors,
  };
}
