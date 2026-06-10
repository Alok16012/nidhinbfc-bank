-- ============================================================
-- FULL SYNC MIGRATION
-- Brings an existing live database in line with schema.sql.
-- Safe to run multiple times (idempotent).
-- Run once in Supabase Dashboard -> SQL Editor.
-- ============================================================

-- ------------------------------------------------------------
-- 1. MEMBERS — ensure all columns exist
-- ------------------------------------------------------------
ALTER TABLE members ADD COLUMN IF NOT EXISTS member_no        TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS father_name      TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS mother_name      TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS dob              DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS gender           TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS phone            TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS alt_phone        TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS email            TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS address          TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS city             TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS state            TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS pincode          TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS occupation       TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS education         TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS annual_income    NUMERIC(14,2);
ALTER TABLE members ADD COLUMN IF NOT EXISTS current_address  TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS current_pincode  TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS current_state    TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS current_district TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS nominee_name     TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS nominee_relation TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS nominee_phone    TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS nominee_age      INTEGER;
ALTER TABLE members ADD COLUMN IF NOT EXISTS bank_account_no  TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS bank_ifsc        TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS bank_name        TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS id_type          TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS id_number        TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS aadhar           TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS pan              TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS staff_id         TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS member_id        TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS form_no          TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS share_amount     NUMERIC(12,2) DEFAULT 0;
ALTER TABLE members ADD COLUMN IF NOT EXISTS share_count      INTEGER DEFAULT 0;
ALTER TABLE members ADD COLUMN IF NOT EXISTS share_capital    NUMERIC(14,2) DEFAULT 0;
-- Documents & images
ALTER TABLE members ADD COLUMN IF NOT EXISTS aadhar_url       TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS aadhar_back_url  TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS pan_url          TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS id_card_url      TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS photo_url        TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS signature_url    TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS fingerprint_url  TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS join_date        DATE DEFAULT CURRENT_DATE;

-- ------------------------------------------------------------
-- 2. MEMBER ID auto-generation (MEM0000001 ...)
-- ------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS member_id_seq START 1;

CREATE OR REPLACE FUNCTION generate_member_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.member_id IS NULL OR NEW.member_id = '' THEN
    NEW.member_id := 'MEM' || LPAD(nextval('member_id_seq')::TEXT, 7, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_member_id ON members;
CREATE TRIGGER trg_member_id
  BEFORE INSERT ON members
  FOR EACH ROW EXECUTE FUNCTION generate_member_id();

-- Backfill any existing members missing an ID
WITH numbered_members AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS row_num
  FROM members
  WHERE member_id IS NULL OR member_id = ''
)
UPDATE members m
SET member_id = 'MEM' || LPAD((
  (SELECT COUNT(*) FROM members WHERE member_id IS NOT NULL AND member_id <> '') + nm.row_num
)::TEXT, 7, '0')
FROM numbered_members nm
WHERE m.id = nm.id;

-- Move sequence past the highest used number
SELECT setval('member_id_seq', GREATEST((SELECT COUNT(*) FROM members), 1));

-- ------------------------------------------------------------
-- 3. LOANS — EMI frequency + guarantor KYC/document fields
-- ------------------------------------------------------------
ALTER TABLE loans ADD COLUMN IF NOT EXISTS emi_frequency TEXT DEFAULT 'monthly';
ALTER TABLE loans ADD COLUMN IF NOT EXISTS guarantor_aadhar          TEXT;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS guarantor_pan             TEXT;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS guarantor_relation        TEXT;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS guarantor_dob             DATE;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS guarantor_aadhar_url      TEXT;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS guarantor_aadhar_back_url TEXT;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS guarantor_pan_url         TEXT;

-- ------------------------------------------------------------
-- 4. APP SETTINGS table (admin-configurable rates)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
  id INT PRIMARY KEY DEFAULT 1,
  savings_rate NUMERIC(5,2) DEFAULT 4.0,
  fd_rate NUMERIC(5,2) DEFAULT 7.5,
  rd_rate NUMERIC(5,2) DEFAULT 7.0,
  drd_rate NUMERIC(5,2) DEFAULT 7.0,
  mis_rate NUMERIC(5,2) DEFAULT 7.25,
  personal_loan_rate NUMERIC(5,2) DEFAULT 12.0,
  business_loan_rate NUMERIC(5,2) DEFAULT 14.0,
  gold_loan_rate NUMERIC(5,2) DEFAULT 10.0,
  penalty_rate NUMERIC(5,2) DEFAULT 2.0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO app_settings DEFAULT VALUES ON CONFLICT (id) DO NOTHING;

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_read_settings" ON app_settings;
CREATE POLICY "allow_read_settings" ON app_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_update_settings" ON app_settings;
CREATE POLICY "allow_update_settings" ON app_settings FOR UPDATE USING (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 5. PASSBOOK auto-populate triggers
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_member_last_balance(p_member_id UUID)
RETURNS NUMERIC LANGUAGE SQL AS $$
  SELECT COALESCE(
    (SELECT balance FROM passbook
     WHERE member_id = p_member_id
     ORDER BY transaction_date DESC, created_at DESC
     LIMIT 1),
    0
  );
$$;

CREATE OR REPLACE FUNCTION fn_passbook_loan_disbursement()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  last_bal NUMERIC;
BEGIN
  IF NEW.status = 'disbursed' AND OLD.status IS DISTINCT FROM 'disbursed' THEN
    last_bal := get_member_last_balance(NEW.member_id);
    INSERT INTO passbook (
      member_id, transaction_date, type,
      reference_id, reference_type,
      narration, credit, debit, balance
    ) VALUES (
      NEW.member_id,
      COALESCE(NEW.disbursed_date, CURRENT_DATE),
      'loan_disbursement',
      NEW.id, 'loan',
      'Loan disbursed — ' || COALESCE(NEW.loan_id, NEW.loan_no),
      COALESCE(NEW.disbursed_amount, NEW.amount),
      0,
      last_bal + COALESCE(NEW.disbursed_amount, NEW.amount)
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_passbook_loan_disbursement ON loans;
CREATE TRIGGER trg_passbook_loan_disbursement
  AFTER UPDATE ON loans
  FOR EACH ROW EXECUTE FUNCTION fn_passbook_loan_disbursement();

CREATE OR REPLACE FUNCTION fn_passbook_loan_repayment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  last_bal   NUMERIC;
  v_member   UUID;
  v_loan_ref TEXT;
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    SELECT member_id, COALESCE(loan_id, loan_no)
      INTO v_member, v_loan_ref
      FROM loans WHERE id = NEW.loan_id;
    last_bal := get_member_last_balance(v_member);
    INSERT INTO passbook (
      member_id, transaction_date, type,
      reference_id, reference_type,
      narration, credit, debit, balance
    ) VALUES (
      v_member,
      COALESCE(NEW.paid_date, CURRENT_DATE),
      'loan_repayment',
      NEW.loan_id, 'loan',
      'EMI repayment #' || COALESCE(NEW.installment_no::TEXT, '?') || ' — ' || v_loan_ref,
      0,
      COALESCE(NEW.paid_amount, NEW.total_amount),
      last_bal - COALESCE(NEW.paid_amount, NEW.total_amount)
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_passbook_loan_repayment ON loan_repayments;
CREATE TRIGGER trg_passbook_loan_repayment
  AFTER UPDATE ON loan_repayments
  FOR EACH ROW EXECUTE FUNCTION fn_passbook_loan_repayment();

CREATE OR REPLACE FUNCTION fn_passbook_deposit_created()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  last_bal NUMERIC;
  dep_type TEXT;
BEGIN
  dep_type := UPPER(COALESCE(NEW.deposit_type, NEW.type, 'deposit'));
  last_bal := get_member_last_balance(NEW.member_id);
  INSERT INTO passbook (
    member_id, transaction_date, type,
    reference_id, reference_type,
    narration, credit, debit, balance
  ) VALUES (
    NEW.member_id,
    COALESCE(NEW.open_date, CURRENT_DATE),
    'deposit_credit',
    NEW.id, 'deposit',
    dep_type || ' deposit opened — ' || COALESCE(NEW.deposit_id, NEW.deposit_no),
    NEW.amount,
    0,
    last_bal + NEW.amount
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_passbook_deposit_created ON deposits;
CREATE TRIGGER trg_passbook_deposit_created
  AFTER INSERT ON deposits
  FOR EACH ROW EXECUTE FUNCTION fn_passbook_deposit_created();

-- ------------------------------------------------------------
-- 6. Tell PostgREST to reload its schema cache
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
