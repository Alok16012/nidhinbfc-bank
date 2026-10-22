-- ============================================================
-- Grihsevak Nidhi v1.2 — ek baar Supabase SQL Editor mein poora paste karke Run karo
-- (dobara chalana safe hai)
-- ============================================================

-- ########## PART 1: member double entry ##########
-- ============================================================
-- Stop the same member being registered twice
-- Run once in Supabase Dashboard -> SQL Editor. Safe to run again.
-- ============================================================
-- Registering a member from a slow phone could fire the save twice before
-- the button disabled itself, giving two members with the same Aadhaar.
-- The app now blocks the second tap; this makes the database refuse it too.
--
-- First, show any members that already share an Aadhaar number so they can
-- be merged or deleted; the index is only created once there are none.
SELECT aadhar, count(*) AS copies, string_agg(member_id || ' ' || name, ' | ' ORDER BY created_at) AS members
FROM members
WHERE coalesce(trim(aadhar), '') <> '' AND coalesce(status, '') <> 'deleted'
GROUP BY aadhar HAVING count(*) > 1;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM members
    WHERE coalesce(trim(aadhar), '') <> '' AND coalesce(status, '') <> 'deleted'
    GROUP BY aadhar HAVING count(*) > 1
  ) THEN
    RAISE NOTICE 'Duplicate Aadhaar numbers exist (see the list above). Clean them up, then run this file again to add the unique index.';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS members_aadhar_uniq
      ON members (trim(aadhar))
      WHERE coalesce(trim(aadhar), '') <> '' AND coalesce(status, '') <> 'deleted';
    RAISE NOTICE 'Unique Aadhaar index in place: a second member with the same Aadhaar is now refused.';
  END IF;
END $$;

-- ########## PART 2: passbook double entry ##########
-- ============================================================
-- FIX: every entry was showing up twice in the passbook
-- Run this whole file once in Supabase Dashboard -> SQL Editor.
-- Safe to run again.
-- ============================================================
--
-- Why it happened
--   Two generations of passbook triggers ended up on the live database:
--     * the unified set from schema.sql              (trg_*_passbook)
--     * the older set from passbook_triggers.sql /
--       sync_full_schema.sql                          (trg_passbook_*)
--   Both fired on every deposit opening, loan disbursal and EMI, so each
--   of those was written to the passbook twice.
--
-- What this file does
--   1. Drops the old triggers and their functions.
--   2. Tags every passbook row with a `source_key` naming the event it
--      came from, and deletes the duplicates (keeps one row per event).
--   3. Puts a UNIQUE index on `source_key`, so the same event can never
--      be written twice again, however many triggers fire.
--   4. Recreates the unified triggers using that key, records maturity
--      payouts / penalties on the correct side, and keeps the balance
--      column meaningful (the account's balance after the entry).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Old trigger generation
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_passbook_deposit_created   ON deposits;
DROP TRIGGER IF EXISTS trg_passbook_loan_repayment    ON loan_repayments;
DROP TRIGGER IF EXISTS trg_passbook_loan_disbursement ON loans;
DROP FUNCTION IF EXISTS fn_passbook_deposit_created();
DROP FUNCTION IF EXISTS fn_passbook_loan_repayment();
DROP FUNCTION IF EXISTS fn_passbook_loan_disbursement();

-- ------------------------------------------------------------
-- 2. Tag rows with the event they came from, then de-duplicate
-- ------------------------------------------------------------
ALTER TABLE passbook ADD COLUMN IF NOT EXISTS source_key TEXT;

-- Deposit opening: one per deposit
UPDATE passbook
SET source_key = 'deposit_open:' || reference_id
WHERE source_key IS NULL
  AND reference_type = 'deposit' AND reference_id IS NOT NULL
  AND type = 'deposit_credit'
  AND narration ILIKE '%deposit opened%';

-- Loan disbursal: one per loan
UPDATE passbook
SET source_key = 'loan_disburse:' || reference_id
WHERE source_key IS NULL
  AND reference_type = 'loan' AND reference_id IS NOT NULL
  AND type = 'loan_disbursement';

-- EMI: one per loan + installment number (both generations put "#<n>" in the narration)
UPDATE passbook
SET source_key = 'loan_repay:' || reference_id || ':' || substring(narration FROM '#\s*(\d+)')
WHERE source_key IS NULL
  AND reference_type = 'loan' AND reference_id IS NOT NULL
  AND type = 'loan_repayment'
  AND narration ~ '#\s*\d+';

-- Deposit transactions (collections, withdrawals) only ever had one trigger,
-- so they are left untagged: two identical daily collections are both real.

-- Keep one row per event. Prefer the unified convention (deposit in = credit,
-- loan out = debit, EMI in = credit), then the earliest row.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY source_key
           ORDER BY
             CASE
               WHEN type = 'loan_disbursement' AND debit  > 0 THEN 0
               WHEN type = 'loan_repayment'    AND credit > 0 THEN 0
               WHEN type = 'deposit_credit'    AND credit > 0 THEN 0
               ELSE 1
             END,
             created_at, id
         ) AS rn
  FROM passbook
  WHERE source_key IS NOT NULL
)
DELETE FROM passbook WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- ------------------------------------------------------------
-- 3. Never twice again
-- ------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS passbook_source_key_uniq
  ON passbook (source_key) WHERE source_key IS NOT NULL;

-- ------------------------------------------------------------
-- 4. Unified triggers (one of each)
-- ------------------------------------------------------------

-- A. Deposit opened -> credit, balance = opening amount
CREATE OR REPLACE FUNCTION sync_deposit_opening_to_passbook()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO passbook (
    member_id, transaction_date, type, reference_id, reference_type,
    narration, debit, credit, balance, created_by, source_key
  ) VALUES (
    NEW.member_id, COALESCE(NEW.open_date, CURRENT_DATE), 'deposit_credit', NEW.id, 'deposit',
    UPPER(COALESCE(NEW.deposit_type, NEW.type)) || ' deposit opened — ' || COALESCE(NEW.deposit_id, NEW.deposit_no),
    0, NEW.amount, NEW.amount, NEW.created_by,
    'deposit_open:' || NEW.id
  )
  ON CONFLICT (source_key) WHERE source_key IS NOT NULL DO NOTHING;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deposit_opening_passbook ON deposits;
CREATE TRIGGER trg_deposit_opening_passbook
  AFTER INSERT ON deposits
  FOR EACH ROW EXECUTE FUNCTION sync_deposit_opening_to_passbook();

-- B. Deposit transactions: collections, withdrawals, interest, penalties, maturity payout
CREATE OR REPLACE FUNCTION sync_deposit_txn_to_passbook()
RETURNS TRIGGER AS $$
DECLARE
  v_m_id UUID;
  v_type TEXT;
  v_is_debit BOOLEAN;
BEGIN
  IF NEW.member_id IS NULL THEN
    SELECT member_id INTO v_m_id FROM deposits WHERE id = NEW.deposit_id;
  ELSE
    v_m_id := NEW.member_id;
  END IF;

  v_is_debit := NEW.transaction_type IN ('debit', 'penalty', 'maturity_payout');
  v_type := CASE NEW.transaction_type
    WHEN 'credit'          THEN 'deposit_credit'
    WHEN 'pending'         THEN 'deposit_credit'
    WHEN 'interest'        THEN 'interest_credit'
    WHEN 'debit'           THEN 'deposit_debit'
    WHEN 'maturity_payout' THEN 'deposit_debit'
    WHEN 'penalty'         THEN 'penalty_debit'
    ELSE 'deposit_credit'
  END;

  INSERT INTO passbook (
    member_id, transaction_date, type, reference_id, reference_type,
    narration, debit, credit, balance, created_by, source_key
  ) VALUES (
    v_m_id, COALESCE(NEW.date, CURRENT_DATE), v_type, NEW.deposit_id, 'deposit',
    NEW.narration,
    CASE WHEN v_is_debit THEN NEW.amount ELSE 0 END,
    CASE WHEN v_is_debit THEN 0 ELSE NEW.amount END,
    COALESCE(NEW.balance_after, 0), NEW.created_by,
    'deposit_txn:' || NEW.id
  )
  ON CONFLICT (source_key) WHERE source_key IS NOT NULL DO NOTHING;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deposit_txn_passbook ON deposit_transactions;
CREATE TRIGGER trg_deposit_txn_passbook
  AFTER INSERT ON deposit_transactions
  FOR EACH ROW EXECUTE FUNCTION sync_deposit_txn_to_passbook();

-- C. EMI paid -> credit, balance = loan outstanding after this installment
CREATE OR REPLACE FUNCTION sync_loan_repayment_to_passbook()
RETURNS TRIGGER AS $$
DECLARE
  v_loan_ref TEXT;
  v_outstanding NUMERIC;
  v_member UUID;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status IN ('paid', 'recorded')) OR
     (TG_OP = 'UPDATE' AND NEW.status IN ('paid', 'recorded')
        AND (OLD.status IS NULL OR OLD.status NOT IN ('paid', 'recorded'))) THEN

    SELECT COALESCE(loan_id, loan_no), member_id, COALESCE(outstanding_balance, 0)
      INTO v_loan_ref, v_member, v_outstanding
      FROM loans WHERE id = NEW.loan_id;

    INSERT INTO passbook (
      member_id, transaction_date, type, reference_id, reference_type,
      narration, debit, credit, balance, created_by, source_key
    ) VALUES (
      COALESCE(NEW.member_id, v_member), COALESCE(NEW.paid_date, CURRENT_DATE), 'loan_repayment', NEW.loan_id, 'loan',
      'Loan EMI payment #' || COALESCE(NEW.installment_no::TEXT, '?') || ' — ' || COALESCE(v_loan_ref, ''),
      0, COALESCE(NEW.total_amount, NEW.paid_amount, 0),
      GREATEST(v_outstanding - COALESCE(NEW.principal_amount, 0), 0),
      NEW.collected_by,
      'loan_repay:' || NEW.loan_id || ':' || COALESCE(NEW.installment_no::TEXT, NEW.id::TEXT)
    )
    ON CONFLICT (source_key) WHERE source_key IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_loan_repayment_passbook ON loan_repayments;
CREATE TRIGGER trg_loan_repayment_passbook
  AFTER INSERT OR UPDATE ON loan_repayments
  FOR EACH ROW EXECUTE FUNCTION sync_loan_repayment_to_passbook();

-- D. Loan disbursed -> debit, balance = loan outstanding
CREATE OR REPLACE FUNCTION sync_loan_disbursement_to_passbook()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'disbursed'
     AND (OLD.status IS NULL OR OLD.status <> 'disbursed') THEN
    INSERT INTO passbook (
      member_id, transaction_date, type, reference_id, reference_type,
      narration, debit, credit, balance, created_by, source_key
    ) VALUES (
      NEW.member_id, COALESCE(NEW.disbursed_date, CURRENT_DATE), 'loan_disbursement', NEW.id, 'loan',
      'Loan disbursed — ' || COALESCE(NEW.loan_id, NEW.loan_no),
      NEW.amount, 0, NEW.amount, NEW.created_by,
      'loan_disburse:' || NEW.id
    )
    ON CONFLICT (source_key) WHERE source_key IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_loan_disbursement_passbook ON loans;
CREATE TRIGGER trg_loan_disbursement_passbook
  AFTER UPDATE ON loans
  FOR EACH ROW EXECUTE FUNCTION sync_loan_disbursement_to_passbook();

NOTIFY pgrst, 'reload schema';

-- Check: every passbook trigger that is now installed (expect exactly these four)
SELECT tgname, tgrelid::regclass AS "table"
FROM pg_trigger
WHERE NOT tgisinternal AND tgname LIKE '%passbook%'
ORDER BY 2, 1;
