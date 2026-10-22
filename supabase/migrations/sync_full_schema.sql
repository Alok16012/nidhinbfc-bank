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
-- 5. PASSBOOK triggers
--    This section used to install a second set of passbook triggers
--    (trg_passbook_*) next to the unified ones from schema.sql, which
--    made every entry appear twice. It now only removes that old set.
--    Run migrations/fix_double_passbook_entries.sql for the full fix
--    (clean-up of duplicate rows + unique source_key).
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_passbook_deposit_created   ON deposits;
DROP TRIGGER IF EXISTS trg_passbook_loan_repayment    ON loan_repayments;
DROP TRIGGER IF EXISTS trg_passbook_loan_disbursement ON loans;
DROP FUNCTION IF EXISTS fn_passbook_deposit_created();
DROP FUNCTION IF EXISTS fn_passbook_loan_repayment();
DROP FUNCTION IF EXISTS fn_passbook_loan_disbursement();

-- ------------------------------------------------------------
-- 6. VOUCHERS / ACCOUNTS — columns the app actually uses
--    (app uses a single-entry voucher model)
-- ------------------------------------------------------------
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS date              DATE DEFAULT CURRENT_DATE;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS amount            NUMERIC(14,2) DEFAULT 0;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS debit_account_id  UUID REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS credit_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ------------------------------------------------------------
-- 7. Tell PostgREST to reload its schema cache
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
