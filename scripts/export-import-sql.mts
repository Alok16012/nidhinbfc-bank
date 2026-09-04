/**
 * Emit the ledger book as SQL you can paste into the Supabase SQL editor.
 *
 *   npx tsx scripts/export-import-sql.mts "<path to .xlsx>" [output directory]
 *
 * Output defaults to a folder beside the spreadsheet, never inside this repo:
 * the files carry members' names, mobile numbers and amounts, and anything in
 * the repo gets committed and pushed.
 *
 * The generated SQL stages the sheet rows, then does the member matching in
 * Postgres — the app's member ids are not known here, so name + mobile are
 * resolved against the live members table at run time.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { readXlsxSheets } from "../lib/import/xlsx";
import {
  DEPOSITOR_SHEET,
  RECOVERY_SHEET,
  parseDepositorSheet,
  parseRecoverySheet,
  type LedgerRecord,
} from "../lib/import/ledger-sheet";
import { IMPORT_TAG, depositReference, recoveryReference, inferInstallment } from "../lib/import/plan";

const CHUNK_BYTES = 400_000;

const quote = (value: string) => `'${value.replace(/'/g, "''").replace(/[\x00-\x1f]/g, " ")}'`;
const nullable = (value: number | undefined) =>
  value === undefined || value === null || !Number.isFinite(value) ? "NULL" : String(value);

interface Row {
  book: "deposit" | "recovery";
  record: LedgerRecord;
  reference: (row: number, date: string) => string;
}

function entryValues({ book, record, reference }: Row): string[] {
  const occurrences = new Map<string, number>();
  return record.entries.map((entry) => {
    const nth = (occurrences.get(entry.date) ?? 0) + 1;
    occurrences.set(entry.date, nth);
    const base = reference(record.row, entry.date);
    const ref = nth === 1 ? base : `${base}#${nth}`;
    return `(${quote(book)},${record.row},${quote(entry.date)},${entry.amount},${quote(ref)})`;
  });
}

function rowValues({ book, record }: Row): string {
  const first = record.entries[0]?.date;
  return [
    quote(book),
    record.row,
    quote(record.name),
    quote(record.phone),
    inferInstallment(record),
    first ? quote(first) : "NULL",
    nullable(record.loanAmount),
    record.total,
    quote(record.remarks ?? ""),
  ].join(",");
}

function chunkedInserts(header: string, values: string[]): string[] {
  const files: string[] = [];
  let buffer: string[] = [];
  let size = 0;

  const flush = () => {
    if (!buffer.length) return;
    files.push(`${header}\n${buffer.join(",\n")};\n`);
    buffer = [];
    size = 0;
  };

  for (const value of values) {
    buffer.push(value);
    size += value.length + 2;
    if (size >= CHUNK_BYTES) flush();
  }
  flush();
  return files;
}

const SETUP = `-- ${IMPORT_TAG} ledger import — step 1 of 5: staging area
-- Safe to re-run: this only creates scratch tables, it does not touch your data.

-- Normalisation must agree with the app: a name is upper-cased with runs of
-- whitespace collapsed, and a mobile is the last 10 digits of the FIRST run of
-- 7+ digits in the cell (two rows in the book hold two numbers in one cell).
CREATE OR REPLACE FUNCTION xls_norm_name(t TEXT) RETURNS TEXT
  LANGUAGE sql IMMUTABLE AS $$
  SELECT upper(btrim(regexp_replace(coalesce(t, ''), '\\s+', ' ', 'g')))
$$;

CREATE OR REPLACE FUNCTION xls_norm_phone(t TEXT) RETURNS TEXT
  LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN p ~ '^[6-9][0-9]{9}$' THEN p ELSE '' END
  FROM (SELECT right(coalesce((regexp_match(coalesce(t, ''), '[0-9]{7,}'))[1], ''), 10) AS p) s
$$;

DROP TABLE IF EXISTS xls_entry;
DROP TABLE IF EXISTS xls_row;

CREATE TABLE xls_row (
  book          TEXT    NOT NULL,
  sheet_row     INT     NOT NULL,
  member_name   TEXT    NOT NULL,
  member_phone  TEXT    NOT NULL,
  installment   NUMERIC(14,2),
  first_date    DATE,
  loan_amount   NUMERIC(14,2),
  sheet_total   NUMERIC(14,2),
  remarks       TEXT,
  PRIMARY KEY (book, sheet_row)
);

CREATE TABLE xls_entry (
  book         TEXT           NOT NULL,
  sheet_row    INT            NOT NULL,
  entry_date   DATE           NOT NULL,
  amount       NUMERIC(14,2)  NOT NULL,
  reference_no TEXT           NOT NULL PRIMARY KEY
);

CREATE INDEX xls_entry_lookup ON xls_entry (book, sheet_row);
`;

const PREVIEW = `-- ${IMPORT_TAG} ledger import — step 3 of 5: preview (READ ONLY)
-- Nothing is written. Check these numbers before running step 4.

-- A. What the spreadsheet holds
SELECT book,
       count(*)                              AS sheet_rows,
       (SELECT count(*) FROM xls_entry e WHERE e.book = r.book)          AS entries,
       (SELECT sum(amount) FROM xls_entry e WHERE e.book = r.book)       AS amount
FROM   xls_row r
GROUP  BY book
ORDER  BY book;

-- B. How the rows match your members (name AND mobile must both agree)
WITH candidate AS (
  SELECT r.book, r.sheet_row, m.id AS member_id
  FROM   xls_row r
  JOIN   members m ON xls_norm_name(m.name) = r.member_name
                  AND xls_norm_phone(m.phone) = r.member_phone
  WHERE  r.member_phone <> ''
),
verdict AS (
  SELECT r.book, r.sheet_row,
         CASE
           WHEN r.member_phone = ''                     THEN 'no mobile in sheet'
           WHEN count(c.member_id) = 0                  THEN 'no member with this name + mobile'
           WHEN count(DISTINCT c.member_id) > 1         THEN 'several members share this name + mobile'
           WHEN NOT EXISTS (SELECT 1 FROM xls_entry e
                             WHERE e.book = r.book AND e.sheet_row = r.sheet_row)
                                                        THEN 'row has no collection entries'
           ELSE 'will import'
         END AS status
  FROM   xls_row r
  LEFT   JOIN candidate c ON c.book = r.book AND c.sheet_row = r.sheet_row
  GROUP  BY r.book, r.sheet_row, r.member_phone
)
SELECT v.book, v.status, count(*) AS rows,
       sum((SELECT coalesce(sum(e.amount), 0) FROM xls_entry e
             WHERE e.book = v.book AND e.sheet_row = v.sheet_row)) AS amount
FROM   verdict v
GROUP  BY v.book, v.status
ORDER  BY v.book, rows DESC;

-- C. The rows that will be left out, by name — fix these in Members and re-run
WITH candidate AS (
  SELECT r.book, r.sheet_row, m.id AS member_id
  FROM   xls_row r
  JOIN   members m ON xls_norm_name(m.name) = r.member_name
                  AND xls_norm_phone(m.phone) = r.member_phone
  WHERE  r.member_phone <> ''
)
SELECT r.book, r.sheet_row, r.member_name, r.member_phone,
       (SELECT coalesce(sum(e.amount), 0) FROM xls_entry e
         WHERE e.book = r.book AND e.sheet_row = r.sheet_row) AS amount,
       CASE WHEN r.member_phone = '' THEN 'no mobile in sheet'
            ELSE 'no member with this name + mobile' END AS reason,
       (SELECT string_agg(m2.name, ', ')
          FROM members m2
         WHERE r.member_phone <> '' AND xls_norm_phone(m2.phone) = r.member_phone) AS same_mobile_belongs_to
FROM   xls_row r
WHERE  NOT EXISTS (SELECT 1 FROM candidate c WHERE c.book = r.book AND c.sheet_row = r.sheet_row)
ORDER  BY r.book, r.sheet_row;

-- D. Entries already imported by an earlier run (these are skipped)
SELECT 'deposit' AS book, count(*) AS already_imported
FROM   xls_entry e
WHERE  e.book = 'deposit'
  AND  EXISTS (SELECT 1 FROM deposit_transactions t WHERE t.reference_no = e.reference_no)
UNION ALL
SELECT 'recovery', count(*)
FROM   xls_entry e
WHERE  e.book = 'recovery'
  AND  EXISTS (SELECT 1 FROM loan_repayments p WHERE p.reference_no = e.reference_no);
`;

const APPLY = `-- ${IMPORT_TAG} ledger import — step 4 of 5: apply
--
-- Runs as ONE transaction: if any statement fails, nothing is written.
-- Safe to re-run — every row carries a ${IMPORT_TAG}/... reference_no and rows
-- that already exist are skipped, so a retry inserts only what is missing.
--
-- Passbook rows are NOT written here. The database already mirrors every
-- deposit_transactions and loan_repayments row into the passbook by trigger.

BEGIN;

-- ── 1. Resolve members: name AND mobile must both match, unambiguously ──
DROP TABLE IF EXISTS xls_match;
CREATE TEMP TABLE xls_match AS
WITH candidate AS (
  SELECT r.book, r.sheet_row, m.id AS member_id
  FROM   xls_row r
  JOIN   members m ON xls_norm_name(m.name) = r.member_name
                  AND xls_norm_phone(m.phone) = r.member_phone
  WHERE  r.member_phone <> ''
)
-- Postgres has no min(uuid); the HAVING leaves exactly one id to pick anyway.
SELECT book, sheet_row, (array_agg(DISTINCT member_id))[1] AS member_id
FROM   candidate
GROUP  BY book, sheet_row
HAVING count(DISTINCT member_id) = 1;

-- ══ DEPOSITS ═══════════════════════════════════════════════════════════

-- ── 2. Use the member's existing account, preferring a daily one ────────
DROP TABLE IF EXISTS xls_dep_account;
CREATE TEMP TABLE xls_dep_account AS
SELECT DISTINCT ON (mt.member_id)
       mt.member_id,
       (SELECT d.id
          FROM deposits d
         WHERE d.member_id = mt.member_id
         ORDER BY (CASE WHEN lower(coalesce(d.deposit_type, d.type, '')) IN ('drd', 'rd')
                        THEN 0 ELSE 1 END),
                  d.created_at
         LIMIT 1) AS deposit_id,
       0::NUMERIC(14,2) AS opening
FROM   xls_match mt
WHERE  mt.book = 'deposit';

-- An account opened through the app carries its opening amount in
-- current_balance without a matching row in deposit_transactions. Capture that
-- difference now, before anything is inserted, so rebuilding the running
-- balance in step 5 keeps it instead of resetting the account to zero.
UPDATE xls_dep_account a
SET    opening = coalesce(d.current_balance, 0) - coalesce(t.total, 0)
FROM   deposits d
LEFT   JOIN LATERAL (
         SELECT sum(CASE WHEN tx.transaction_type IN ('debit', 'penalty', 'maturity_payout')
                         THEN -tx.amount ELSE tx.amount END) AS total
           FROM deposit_transactions tx
          WHERE tx.deposit_id = d.id
       ) t ON true
WHERE  a.deposit_id = d.id;

-- ── 3. Open an account only for matched members who have none ───────────
INSERT INTO deposits (member_id, deposit_id, type, deposit_type, amount, interest_rate,
                      current_balance, balance, status, open_date, nominee_name, remarks)
SELECT a.member_id,
       'DEP' || to_char(now(), 'YY') || lpad((10000 + floor(random() * 90000))::int::text, 5, '0'),
       'drd', 'drd',
       coalesce(max(r.installment), 0),
       0, 0, 0, 'active',
       min(r.first_date),
       '',
       '${IMPORT_TAG} ledger import'
FROM   xls_dep_account a
JOIN   xls_match mt ON mt.book = 'deposit' AND mt.member_id = a.member_id
JOIN   xls_row   r  ON r.book = 'deposit' AND r.sheet_row = mt.sheet_row
WHERE  a.deposit_id IS NULL
GROUP  BY a.member_id;

UPDATE xls_dep_account a
SET    deposit_id = d.id
FROM   deposits d
WHERE  a.deposit_id IS NULL
  AND  d.member_id = a.member_id
  AND  d.remarks = '${IMPORT_TAG} ledger import';

-- ── 4. Insert the daily collections ─────────────────────────────────────
INSERT INTO deposit_transactions (deposit_id, member_id, transaction_type, amount,
                                  balance_after, reference_no, narration, date, payment_mode)
SELECT a.deposit_id, mt.member_id, 'credit', e.amount,
       0,                                    -- recalculated in step 5
       e.reference_no, 'Daily collection (ledger import)', e.entry_date, 'cash'
FROM   xls_entry e
JOIN   xls_match       mt ON mt.book = 'deposit' AND mt.sheet_row = e.sheet_row
JOIN   xls_dep_account a  ON a.member_id = mt.member_id
WHERE  e.book = 'deposit'
  AND  a.deposit_id IS NOT NULL
  AND  NOT EXISTS (SELECT 1 FROM deposit_transactions t WHERE t.reference_no = e.reference_no);

-- ── 5. Rebuild each touched account's running balance in date order ─────
-- The import back-fills history, so balances have to be recomputed over the
-- whole account rather than appended, or any transaction the account already
-- had after these dates would carry a stale figure.
WITH running AS (
  SELECT t.id,
         a.opening + sum(CASE WHEN t.transaction_type IN ('debit', 'penalty', 'maturity_payout')
                              THEN -t.amount ELSE t.amount END)
           OVER (PARTITION BY t.deposit_id ORDER BY t.date, t.created_at, t.id
                 ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS balance
  FROM   deposit_transactions t
  JOIN   xls_dep_account a ON a.deposit_id = t.deposit_id
)
UPDATE deposit_transactions t
SET    balance_after = r.balance
FROM   running r
WHERE  t.id = r.id;

UPDATE deposits d
SET    current_balance = s.balance, balance = s.balance
FROM  (SELECT DISTINCT ON (t.deposit_id) t.deposit_id, t.balance_after AS balance
         FROM deposit_transactions t
        WHERE t.deposit_id IN (SELECT deposit_id FROM xls_dep_account WHERE deposit_id IS NOT NULL)
        ORDER BY t.deposit_id, t.date DESC, t.created_at DESC, t.id DESC) s
WHERE  d.id = s.deposit_id;

-- ══ RECOVERY ═══════════════════════════════════════════════════════════

-- ── 6. Use the member's existing loan, preferring an open one ───────────
DROP TABLE IF EXISTS xls_loan_account;
CREATE TEMP TABLE xls_loan_account AS
SELECT DISTINCT ON (mt.member_id)
       mt.member_id,
       (SELECT l.id
          FROM loans l
         WHERE l.member_id = mt.member_id
         ORDER BY (CASE WHEN lower(coalesce(l.status, '')) = 'closed' THEN 1 ELSE 0 END),
                  l.created_at
         LIMIT 1) AS loan_id,
       0::NUMERIC(14,2) AS paid_before
FROM   xls_match mt
WHERE  mt.book = 'recovery';

-- Same idea as the deposits: keep any total_paid the loan already carries that
-- no repayment row accounts for, so step 9 adds to it rather than replacing it.
UPDATE xls_loan_account a
SET    paid_before = coalesce(l.total_paid, 0) - coalesce(p.total, 0)
FROM   loans l
LEFT   JOIN LATERAL (
         SELECT sum(r.paid_amount) AS total
           FROM loan_repayments r
          WHERE r.loan_id = l.id AND r.status = 'paid'
       ) p ON true
WHERE  a.loan_id = l.id;

-- ── 7. Open a loan only for matched members who have none ───────────────
INSERT INTO loans (member_id, loan_id, loan_type, amount, disbursed_amount, interest_rate,
                   tenure_months, emi_amount, repayment_type, status, applied_date,
                   disbursed_date, outstanding_balance, principal_outstanding, purpose, remarks)
SELECT a.member_id,
       'LN' || to_char(now(), 'YY') || lpad((10000 + floor(random() * 90000))::int::text, 5, '0'),
       'personal',
       coalesce(max(r.loan_amount), 0), coalesce(max(r.loan_amount), 0),
       0, 12,
       coalesce(max(r.installment), 0),
       'emi', 'disbursed',
       min(r.first_date), min(r.first_date),
       coalesce(max(r.loan_amount), 0), coalesce(max(r.loan_amount), 0),
       'Imported from ledger',
       '${IMPORT_TAG} ledger import'
FROM   xls_loan_account a
JOIN   xls_match mt ON mt.book = 'recovery' AND mt.member_id = a.member_id
JOIN   xls_row   r  ON r.book = 'recovery' AND r.sheet_row = mt.sheet_row
WHERE  a.loan_id IS NULL
GROUP  BY a.member_id;

UPDATE xls_loan_account a
SET    loan_id = l.id
FROM   loans l
WHERE  a.loan_id IS NULL
  AND  l.member_id = a.member_id
  AND  l.remarks = '${IMPORT_TAG} ledger import';

-- ── 8. Insert the daily recoveries, numbering on from what is there ─────
WITH todo AS (
  SELECT e.reference_no, e.entry_date, e.amount, a.loan_id, mt.member_id,
         row_number() OVER (PARTITION BY a.loan_id ORDER BY e.entry_date, e.reference_no)
           + coalesce((SELECT max(p.installment_no) FROM loan_repayments p
                        WHERE p.loan_id = a.loan_id), 0) AS installment_no
  FROM   xls_entry e
  JOIN   xls_match        mt ON mt.book = 'recovery' AND mt.sheet_row = e.sheet_row
  JOIN   xls_loan_account a  ON a.member_id = mt.member_id
  WHERE  e.book = 'recovery'
    AND  a.loan_id IS NOT NULL
    AND  NOT EXISTS (SELECT 1 FROM loan_repayments p WHERE p.reference_no = e.reference_no)
)
INSERT INTO loan_repayments (loan_id, member_id, installment_no, due_date, paid_date,
                             total_amount, paid_amount, principal_amount, interest_amount,
                             emi_amount, payment_mode, reference_no, narration, status)
SELECT loan_id, member_id, installment_no, entry_date, entry_date,
       amount, amount, amount, 0, amount, 'cash', reference_no,
       'Daily recovery (ledger import)', 'paid'
FROM   todo;

-- ── 9. Bring each touched loan's paid / outstanding figures up to date ──
UPDATE loans l
SET    total_paid = s.paid,
       outstanding_balance = greatest(0, coalesce(l.amount, 0) - s.paid)
FROM  (SELECT a.loan_id,
              a.paid_before + coalesce((SELECT sum(p.paid_amount) FROM loan_repayments p
                                         WHERE p.loan_id = a.loan_id AND p.status = 'paid'), 0) AS paid
         FROM xls_loan_account a
        WHERE a.loan_id IS NOT NULL) s
WHERE  l.id = s.loan_id;

COMMIT;
`;

const VERIFY = `-- ${IMPORT_TAG} ledger import — step 5 of 5: verify
-- Compare these against the numbers the preview showed.

SELECT 'deposit collections imported' AS what,
       count(*) AS rows, sum(amount) AS amount
FROM   deposit_transactions WHERE reference_no LIKE '${IMPORT_TAG}/D/%'
UNION ALL
SELECT 'recovery collections imported',
       count(*), sum(paid_amount)
FROM   loan_repayments WHERE reference_no LIKE '${IMPORT_TAG}/R/%'
UNION ALL
SELECT 'deposit accounts opened by import', count(*), NULL
FROM   deposits WHERE remarks = '${IMPORT_TAG} ledger import'
UNION ALL
SELECT 'loan accounts opened by import', count(*), NULL
FROM   loans WHERE remarks = '${IMPORT_TAG} ledger import';

-- Anything from the sheet that did not land (should match the preview's
-- "left out" list exactly)
SELECT e.book, count(*) AS entries_not_imported, sum(e.amount) AS amount
FROM   xls_entry e
WHERE  (e.book = 'deposit'
         AND NOT EXISTS (SELECT 1 FROM deposit_transactions t WHERE t.reference_no = e.reference_no))
   OR  (e.book = 'recovery'
         AND NOT EXISTS (SELECT 1 FROM loan_repayments p WHERE p.reference_no = e.reference_no))
GROUP  BY e.book;
`;

const CLEANUP = `-- ${IMPORT_TAG} ledger import — optional: remove the staging tables
-- Run this only once you are happy with the verify output. The imported data
-- itself is untouched; this drops the scratch copy of the spreadsheet.

DROP TABLE IF EXISTS xls_entry;
DROP TABLE IF EXISTS xls_row;
DROP FUNCTION IF EXISTS xls_norm_name(TEXT);
DROP FUNCTION IF EXISTS xls_norm_phone(TEXT);
`;

function undoScript() {
  return `-- ${IMPORT_TAG} ledger import — UNDO
-- Removes everything this import created, and nothing else. Every imported row
-- is tagged, so this cannot touch collections your staff entered by hand.
--
-- Balances are rebuilt afterwards from whatever transactions remain.

BEGIN;

-- Capture what each account held that no transaction accounts for, before the
-- imported rows are removed, so the rebuild at the end restores it.
DROP TABLE IF EXISTS xls_undo_dep;
CREATE TEMP TABLE xls_undo_dep AS
SELECT d.id AS deposit_id,
       coalesce(d.current_balance, 0) - coalesce(t.total, 0) AS opening
FROM   deposits d
JOIN  (SELECT DISTINCT deposit_id FROM deposit_transactions
        WHERE reference_no LIKE '${IMPORT_TAG}/D/%') x ON x.deposit_id = d.id
LEFT   JOIN LATERAL (
         SELECT sum(CASE WHEN tx.transaction_type IN ('debit', 'penalty', 'maturity_payout')
                         THEN -tx.amount ELSE tx.amount END) AS total
           FROM deposit_transactions tx WHERE tx.deposit_id = d.id
       ) t ON true;

DROP TABLE IF EXISTS xls_undo_loan;
CREATE TEMP TABLE xls_undo_loan AS
SELECT l.id AS loan_id,
       coalesce(l.total_paid, 0) - coalesce(p.total, 0) AS paid_before
FROM   loans l
JOIN  (SELECT DISTINCT loan_id FROM loan_repayments
        WHERE reference_no LIKE '${IMPORT_TAG}/R/%') x ON x.loan_id = l.id
LEFT   JOIN LATERAL (
         SELECT sum(r.paid_amount) AS total FROM loan_repayments r
          WHERE r.loan_id = l.id AND r.status = 'paid'
       ) p ON true;

-- The collection rows the triggers mirrored into the passbook. Narration is
-- what the import wrote, so hand-entered collections are never matched.
DELETE FROM passbook
WHERE  reference_type = 'deposit'
  AND  narration = 'Daily collection (ledger import)';

-- Repayment rows are matched on the trigger's exact narration for the imported
-- installment, so a manual payment on the same day and loan is left alone.
DELETE FROM passbook p
WHERE  p.reference_type = 'loan'
  AND  EXISTS (SELECT 1 FROM loan_repayments r
                WHERE r.reference_no LIKE '${IMPORT_TAG}/R/%'
                  AND r.loan_id = p.reference_id
                  AND r.paid_date = p.transaction_date
                  AND p.narration = 'Loan EMI Payment #' || r.installment_no);

DELETE FROM deposit_transactions WHERE reference_no LIKE '${IMPORT_TAG}/D/%';
DELETE FROM loan_repayments      WHERE reference_no LIKE '${IMPORT_TAG}/R/%';

-- The account-opening rows the triggers wrote for accounts this import created,
-- removed before the accounts themselves so the ids are still resolvable.
DELETE FROM passbook
WHERE  reference_type = 'deposit'
  AND  reference_id IN (SELECT d.id FROM deposits d
                         WHERE d.remarks = '${IMPORT_TAG} ledger import'
                           AND NOT EXISTS (SELECT 1 FROM deposit_transactions t
                                            WHERE t.deposit_id = d.id));

DELETE FROM passbook
WHERE  reference_type = 'loan'
  AND  reference_id IN (SELECT l.id FROM loans l
                         WHERE l.remarks = '${IMPORT_TAG} ledger import'
                           AND NOT EXISTS (SELECT 1 FROM loan_repayments p
                                            WHERE p.loan_id = l.id));

-- Accounts the import opened, only if nothing else was recorded against them
DELETE FROM deposits d
WHERE  d.remarks = '${IMPORT_TAG} ledger import'
  AND  NOT EXISTS (SELECT 1 FROM deposit_transactions t WHERE t.deposit_id = d.id);

DELETE FROM loans l
WHERE  l.remarks = '${IMPORT_TAG} ledger import'
  AND  NOT EXISTS (SELECT 1 FROM loan_repayments p WHERE p.loan_id = l.id);

-- Rebuild balances on the accounts that survived
WITH running AS (
  SELECT t.id,
         u.opening + sum(CASE WHEN t.transaction_type IN ('debit', 'penalty', 'maturity_payout')
                              THEN -t.amount ELSE t.amount END)
           OVER (PARTITION BY t.deposit_id ORDER BY t.date, t.created_at, t.id
                 ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS balance
  FROM   deposit_transactions t
  JOIN   xls_undo_dep u ON u.deposit_id = t.deposit_id
)
UPDATE deposit_transactions t SET balance_after = r.balance FROM running r WHERE t.id = r.id;

UPDATE deposits d
SET    current_balance = s.balance, balance = s.balance
FROM  (SELECT u.deposit_id,
              coalesce((SELECT t.balance_after FROM deposit_transactions t
                         WHERE t.deposit_id = u.deposit_id
                         ORDER BY t.date DESC, t.created_at DESC, t.id DESC LIMIT 1),
                       u.opening) AS balance
         FROM xls_undo_dep u) s
WHERE  d.id = s.deposit_id;

UPDATE loans l
SET    total_paid = s.paid,
       outstanding_balance = greatest(0, coalesce(l.amount, 0) - s.paid)
FROM  (SELECT u.loan_id,
              u.paid_before + coalesce((SELECT sum(p.paid_amount) FROM loan_repayments p
                                         WHERE p.loan_id = u.loan_id AND p.status = 'paid'), 0) AS paid
         FROM xls_undo_loan u) s
WHERE  l.id = s.loan_id;

COMMIT;
`;
}

function main() {
  const source = process.argv[2];
  if (!source) {
    console.error('Usage: npx tsx scripts/export-import-sql.mts "<file.xlsx>" [output directory]');
    process.exit(1);
  }
  const outDir = process.argv[3] ?? join(dirname(source), "nidhi-ledger-sql");

  const bytes = readFileSync(source);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

  return readXlsxSheets(buffer, [DEPOSITOR_SHEET, RECOVERY_SHEET]).then((sheets) => {
    const depSheet = sheets.find((s) => s.name === DEPOSITOR_SHEET);
    const recSheet = sheets.find((s) => s.name === RECOVERY_SHEET);
    if (!depSheet || !recSheet) throw new Error("Workbook is missing one of the two sheets.");

    const rows: Row[] = [
      ...parseDepositorSheet(depSheet).map((record) => ({
        book: "deposit" as const, record, reference: depositReference,
      })),
      ...parseRecoverySheet(recSheet).map((record) => ({
        book: "recovery" as const, record, reference: recoveryReference,
      })),
    ];

    const rowInserts = chunkedInserts(
      "INSERT INTO xls_row (book, sheet_row, member_name, member_phone, installment, first_date, loan_amount, sheet_total, remarks) VALUES",
      rows.map((row) => `(${rowValues(row)})`)
    );
    const entryInserts = chunkedInserts(
      "INSERT INTO xls_entry (book, sheet_row, entry_date, amount, reference_no) VALUES",
      rows.flatMap(entryValues)
    );

    mkdirSync(outDir, { recursive: true });
    const files: Array<[string, string]> = [["01_setup.sql", SETUP]];

    const data = [...rowInserts, ...entryInserts];
    data.forEach((sql, i) => {
      const name = `02_data_${String(i + 1).padStart(2, "0")}.sql`;
      files.push([name, `-- ${IMPORT_TAG} ledger import — step 2 of 5: data (part ${i + 1} of ${data.length})\n\n${sql}`]);
    });

    files.push(["03_preview.sql", PREVIEW]);
    files.push(["04_apply.sql", APPLY]);
    files.push(["05_verify.sql", VERIFY]);
    files.push(["06_cleanup.sql", CLEANUP]);
    files.push(["99_undo.sql", undoScript()]);

    const entryCount = rows.reduce((total, row) => total + row.record.entries.length, 0);
    const amount = rows.reduce((total, row) => total + row.record.total, 0);

    files.push([
      "README.txt",
      [
        `Ledger import for ${basename(source)}`,
        ``,
        `${rows.length} sheet rows, ${entryCount.toLocaleString("en-IN")} collection entries, Rs ${amount.toLocaleString("en-IN")}.`,
        ``,
        `Run these in the Supabase SQL editor, in order, one file at a time:`,
        ``,
        `  01_setup.sql        creates two scratch tables (touches nothing else)`,
        ...data.map((_, i) => `  02_data_${String(i + 1).padStart(2, "0")}.sql     loads part ${i + 1} of ${data.length} of the spreadsheet`),
        `  03_preview.sql      READ ONLY - shows what will and will not import`,
        `  04_apply.sql        the actual import, as a single transaction`,
        `  05_verify.sql       counts what landed`,
        `  06_cleanup.sql      drops the scratch tables (optional, run last)`,
        ``,
        `Stop and read 03_preview.sql's output before running 04_apply.sql.`,
        ``,
        `If something looks wrong afterwards, 99_undo.sql removes everything this`,
        `import created and rebuilds the affected balances. It is tag-based, so it`,
        `cannot touch collections your staff entered by hand.`,
        ``,
        `04_apply.sql is safe to re-run: rows already imported are skipped.`,
        ``,
        `These files contain members' names, mobile numbers and amounts. Keep them`,
        `off shared drives and delete them once the import is done.`,
      ].join("\n"),
    ]);

    for (const [name, content] of files) writeFileSync(join(outDir, name), content);

    console.log(`Wrote ${files.length} files to ${outDir}`);
    console.log(`  ${rows.length} rows, ${entryCount.toLocaleString("en-IN")} entries, Rs ${amount.toLocaleString("en-IN")}`);
    console.log(`  data split across ${data.length} file(s)`);
  });
}

main();
