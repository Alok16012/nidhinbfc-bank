-- ============================================================
-- COOPERATIVE CRM — COMPLETE SUPABASE SCHEMA
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. SETTINGS / ORGANISATION
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key          TEXT UNIQUE NOT NULL,
  value        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Default org settings
INSERT INTO settings (key, value) VALUES
  ('org_name',           'My Cooperative'),
  ('org_address',        ''),
  ('org_phone',          ''),
  ('org_email',          ''),
  ('org_logo',           ''),
  ('org_registration',   ''),
  ('savings_rate',       '4'),
  ('fd_rate',            '8'),
  ('rd_rate',            '7'),
  ('loan_rate',          '12'),
  ('penalty_rate',       '2'),
  ('sms_api_key',        ''),
  ('sms_sender_id',      'COOP'),
  ('currency',           'INR'),
  ('financial_year_start', '04-01')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 2. STAFF / USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS staff (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  phone        TEXT,
  role         TEXT NOT NULL DEFAULT 'staff'
                 CHECK (role IN ('admin','manager','staff','accountant')),
  department   TEXT,
  salary       NUMERIC(12,2) DEFAULT 0,
  join_date    DATE DEFAULT CURRENT_DATE,
  address      TEXT,
  status       TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','inactive')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS members (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_no         TEXT UNIQUE NOT NULL,
  name              TEXT NOT NULL,
  father_name       TEXT,
  mother_name       TEXT,
  dob               DATE,
  gender            TEXT CHECK (gender IN ('male','female','other')),
  phone             TEXT,
  alt_phone         TEXT,
  email             TEXT,
  address           TEXT,
  city              TEXT,
  state             TEXT,
  pincode           TEXT,
  occupation        TEXT,
  education         TEXT,
  annual_income     NUMERIC(14,2),
  -- Current Address
  current_address   TEXT,
  current_pincode   TEXT,
  current_state     TEXT,
  current_district  TEXT,
  -- Nominee
  nominee_name      TEXT,
  nominee_relation  TEXT,
  nominee_phone     TEXT,
  nominee_age       INTEGER,
  -- Bank Details
  bank_account_no   TEXT,
  bank_ifsc         TEXT,
  bank_name         TEXT,
  -- Identification
  id_type           TEXT,   -- Aadhar / PAN / Voter
  id_number         TEXT,
  aadhar            TEXT,
  pan               TEXT,
  member_id         TEXT,
  form_no           TEXT,
  share_amount      NUMERIC(12,2) DEFAULT 0,
  share_count       INTEGER DEFAULT 0,
  share_capital     NUMERIC(14,2) DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','inactive','suspended','deleted')),
  -- Documents & Images
  aadhar_url        TEXT,
  aadhar_back_url   TEXT,
  pan_url           TEXT,
  photo_url         TEXT,
  signature_url     TEXT,
  fingerprint_url   TEXT,
  join_date         DATE DEFAULT CURRENT_DATE,
  created_by        UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generate member_no (M0001, M0002 …)
CREATE SEQUENCE IF NOT EXISTS member_no_seq START 1;
CREATE OR REPLACE FUNCTION generate_member_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.member_no IS NULL OR NEW.member_no = '' THEN
    NEW.member_no := 'M' || LPAD(nextval('member_no_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_member_no ON members;
CREATE TRIGGER trg_member_no
  BEFORE INSERT ON members
  FOR EACH ROW EXECUTE FUNCTION generate_member_no();

-- ============================================================
-- 4. ACCOUNTS  (Chart of Accounts)
-- ============================================================
CREATE TABLE IF NOT EXISTS accounts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code         TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL
                 CHECK (type IN ('asset','liability','equity','income','expense')),
  parent_id    UUID REFERENCES accounts(id) ON DELETE SET NULL,
  description  TEXT,
  is_system    BOOLEAN DEFAULT FALSE,
  balance      NUMERIC(16,2) DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Default Chart of Accounts
INSERT INTO accounts (code, name, type, is_system) VALUES
  ('1000', 'Cash in Hand',           'asset',     TRUE),
  ('1001', 'Bank Account',           'asset',     TRUE),
  ('1100', 'Loan Portfolio',         'asset',     TRUE),
  ('1200', 'Fixed Deposits (Asset)', 'asset',     TRUE),
  ('2000', 'Member Savings',         'liability', TRUE),
  ('2001', 'FD Deposits',            'liability', TRUE),
  ('2002', 'RD Deposits',            'liability', TRUE),
  ('2100', 'Share Capital',          'equity',    TRUE),
  ('3000', 'Loan Interest Income',   'income',    TRUE),
  ('3001', 'Penalty Income',         'income',    TRUE),
  ('3002', 'Processing Fee Income',  'income',    TRUE),
  ('3003', 'FD Interest Expense',    'expense',   TRUE),
  ('4000', 'Salary Expense',         'expense',   TRUE),
  ('4001', 'Rent Expense',           'expense',   TRUE),
  ('4002', 'Office Expense',         'expense',   TRUE),
  ('4003', 'Misc Expense',           'expense',   TRUE)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 5. DEPOSITS  (Savings / FD / RD)
-- ============================================================
CREATE TABLE IF NOT EXISTS deposits (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deposit_no       TEXT UNIQUE NOT NULL,
  deposit_id       TEXT,
  member_id        UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type             TEXT NOT NULL CHECK (type IN ('savings','fd','rd','drd')),
  deposit_type     TEXT,
  -- FD / RD specific
  amount           NUMERIC(14,2) NOT NULL DEFAULT 0,
  interest_rate    NUMERIC(6,3) NOT NULL DEFAULT 0,
  tenure_months    INTEGER,
  maturity_date    DATE,
  maturity_amount  NUMERIC(14,2),
  -- RD specific
  monthly_amount   NUMERIC(14,2),
  -- Savings specific
  min_balance      NUMERIC(14,2) DEFAULT 0,
  -- Shared
  balance          NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_balance  NUMERIC(14,2) NOT NULL DEFAULT 0,
  interest_earned  NUMERIC(14,2) DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','matured','closed','premature_closed')),
  open_date        DATE DEFAULT CURRENT_DATE,
  close_date       DATE,
  account_no       TEXT,
  nominee_name     TEXT,
  remarks          TEXT,
  created_by       UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS deposit_no_seq START 1;
CREATE OR REPLACE FUNCTION generate_deposit_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.deposit_no IS NULL OR NEW.deposit_no = '' THEN
    NEW.deposit_no := 'DEP' || LPAD(nextval('deposit_no_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_deposit_no ON deposits;
CREATE TRIGGER trg_deposit_no
  BEFORE INSERT ON deposits
  FOR EACH ROW EXECUTE FUNCTION generate_deposit_no();

-- ============================================================
-- 6. DEPOSIT TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS deposit_transactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deposit_id    UUID NOT NULL REFERENCES deposits(id) ON DELETE CASCADE,
  member_id     UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL
                  CHECK (transaction_type IN ('credit','debit','interest','penalty','maturity_payout','pending')),
  amount        NUMERIC(14,2) NOT NULL,
  balance_after NUMERIC(14,2),
  reference_no  TEXT,
  narration     TEXT,
  date          DATE DEFAULT CURRENT_DATE,
  payment_mode  TEXT DEFAULT 'cash'
                  CHECK (payment_mode IN ('cash','upi','neft','cheque','pending')),
  created_by    UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. LOANS
-- ============================================================
CREATE TABLE IF NOT EXISTS loans (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_no           TEXT UNIQUE NOT NULL,
  loan_id           TEXT,
  member_id         UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  loan_type         TEXT NOT NULL DEFAULT 'personal'
                      CHECK (loan_type IN ('personal','business','agriculture','housing','vehicle','gold','education','emergency','other')),
  amount            NUMERIC(14,2) NOT NULL,
  disbursed_amount  NUMERIC(14,2) DEFAULT 0,
  interest_rate     NUMERIC(6,3) NOT NULL,
  tenure_months     INTEGER NOT NULL,
  emi_amount        NUMERIC(12,2),
  repayment_type    TEXT,
  calculation_type  TEXT NOT NULL DEFAULT 'reducing'
                      CHECK (calculation_type IN ('reducing','flat')),
  -- Disbursement
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','applied','approved','rejected','disbursed','closed','npa')),
  applied_date      DATE DEFAULT CURRENT_DATE,
  approved_date     DATE,
  disbursed_date    DATE,
  disbursed_at      TIMESTAMPTZ,
  closed_date       DATE,
  closed_at         TIMESTAMPTZ,
  -- Outstanding
  principal_outstanding  NUMERIC(14,2) DEFAULT 0,
  interest_outstanding   NUMERIC(14,2) DEFAULT 0,
  penalty_outstanding    NUMERIC(14,2) DEFAULT 0,
  total_paid             NUMERIC(14,2) DEFAULT 0,
  outstanding_balance    NUMERIC(14,2) DEFAULT 0,
  next_due_date          DATE,
  -- Guarantor / Collateral
  guarantor_name    TEXT,
  guarantor_phone   TEXT,
  guarantor_address TEXT,
  collateral        TEXT,
  collateral_value  NUMERIC(14,2),
  -- Processing
  processing_fee    NUMERIC(10,2) DEFAULT 0,
  insurance_amount  NUMERIC(10,2) DEFAULT 0,
  purpose           TEXT,
  remarks           TEXT,
  -- Staff
  approved_by       UUID REFERENCES staff(id) ON DELETE SET NULL,
  disbursed_by      UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_by        UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS loan_no_seq START 1;
CREATE OR REPLACE FUNCTION generate_loan_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.loan_no IS NULL OR NEW.loan_no = '' THEN
    NEW.loan_no := 'LN' || LPAD(nextval('loan_no_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_loan_no ON loans;
CREATE TRIGGER trg_loan_no
  BEFORE INSERT ON loans
  FOR EACH ROW EXECUTE FUNCTION generate_loan_no();

-- ============================================================
-- 8. LOAN REPAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS loan_repayments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id           UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  member_id         UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  installment_no    INTEGER,
  due_date          DATE,
  paid_date         DATE DEFAULT CURRENT_DATE,
  principal_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  principal_due     NUMERIC(12,2) DEFAULT 0,
  interest_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  interest_due      NUMERIC(12,2) DEFAULT 0,
  penalty_amount    NUMERIC(12,2) DEFAULT 0,
  penalty           NUMERIC(12,2) DEFAULT 0,
  total_amount      NUMERIC(12,2) NOT NULL,
  paid_amount       NUMERIC(12,2) DEFAULT 0,
  emi_amount        NUMERIC(12,2) DEFAULT 0,
  payment_mode      TEXT DEFAULT 'cash'
                      CHECK (payment_mode IN ('cash','cheque','online','upi','neft')),
  reference_no      TEXT,
  narration         TEXT,
  status            TEXT DEFAULT 'pending'
                      CHECK (status IN ('pending','paid','overdue','partial','bounced')),
  collected_by      UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. PASSBOOK  (unified ledger per member)
-- ============================================================
CREATE TABLE IF NOT EXISTS passbook (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id        UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type             TEXT NOT NULL
                     CHECK (type IN (
                       'loan_disbursement','loan_repayment',
                       'deposit_credit','deposit_debit',
                       'interest_credit','penalty_debit',
                       'share_purchase','withdrawal','other'
                     )),
  reference_id     UUID,   -- loan_id or deposit_id
  reference_type   TEXT,   -- 'loan' | 'deposit'
  narration        TEXT,
  debit            NUMERIC(14,2) DEFAULT 0,
  credit           NUMERIC(14,2) DEFAULT 0,
  balance          NUMERIC(14,2) DEFAULT 0,
  created_by       UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. VOUCHERS  (Accounting)
-- ============================================================
CREATE TABLE IF NOT EXISTS vouchers (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voucher_no     TEXT UNIQUE NOT NULL,
  voucher_type   TEXT NOT NULL
                   CHECK (voucher_type IN ('receipt','payment','journal','contra','debit_note','credit_note')),
  voucher_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  narration      TEXT,
  total_amount   NUMERIC(14,2) NOT NULL DEFAULT 0,
  reference_no   TEXT,
  status         TEXT DEFAULT 'posted'
                   CHECK (status IN ('draft','posted','cancelled')),
  created_by     UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS voucher_no_seq START 1;
CREATE OR REPLACE FUNCTION generate_voucher_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.voucher_no IS NULL OR NEW.voucher_no = '' THEN
    NEW.voucher_no := 'VCH' || LPAD(nextval('voucher_no_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_voucher_no ON vouchers;
CREATE TRIGGER trg_voucher_no
  BEFORE INSERT ON vouchers
  FOR EACH ROW EXECUTE FUNCTION generate_voucher_no();

-- ============================================================
-- 11. VOUCHER ENTRIES  (Double Entry)
-- ============================================================
CREATE TABLE IF NOT EXISTS voucher_entries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voucher_id  UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  debit       NUMERIC(14,2) DEFAULT 0,
  credit      NUMERIC(14,2) DEFAULT 0,
  narration   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_no     TEXT UNIQUE NOT NULL,
  category       TEXT NOT NULL
                   CHECK (category IN ('salary','rent','utilities','office','travel','maintenance','misc','other')),
  sub_category   TEXT,
  amount         NUMERIC(12,2) NOT NULL,
  expense_date   DATE DEFAULT CURRENT_DATE,
  payment_mode   TEXT DEFAULT 'cash'
                   CHECK (payment_mode IN ('cash','cheque','online','upi','neft')),
  paid_to        TEXT,
  description    TEXT,
  receipt_url    TEXT,
  account_id     UUID REFERENCES accounts(id) ON DELETE SET NULL,
  approved_by    UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_by     UUID REFERENCES staff(id) ON DELETE SET NULL,
  status         TEXT DEFAULT 'paid'
                   CHECK (status IN ('pending','paid','cancelled')),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS expense_no_seq START 1;
CREATE OR REPLACE FUNCTION generate_expense_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.expense_no IS NULL OR NEW.expense_no = '' THEN
    NEW.expense_no := 'EXP' || LPAD(nextval('expense_no_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_expense_no ON expenses;
CREATE TRIGGER trg_expense_no
  BEFORE INSERT ON expenses
  FOR EACH ROW EXECUTE FUNCTION generate_expense_no();

-- ============================================================
-- 13. COLLECTION SHEET  (Daily field collections)
-- ============================================================
CREATE TABLE IF NOT EXISTS collection_sheet (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  member_id       UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  loan_id         UUID REFERENCES loans(id) ON DELETE SET NULL,
  deposit_id      UUID REFERENCES deposits(id) ON DELETE SET NULL,
  due_amount      NUMERIC(12,2) DEFAULT 0,
  collected_amount NUMERIC(12,2) DEFAULT 0,
  pending_amount  NUMERIC(12,2) DEFAULT 0,
  collection_type TEXT NOT NULL
                    CHECK (collection_type IN ('loan_emi','rd_installment','savings')),
  status          TEXT DEFAULT 'pending'
                    CHECK (status IN ('pending','collected','partial','missed')),
  collected_by    UUID REFERENCES staff(id) ON DELETE SET NULL,
  remarks         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. SMS LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id    UUID REFERENCES members(id) ON DELETE SET NULL,
  phone        TEXT NOT NULL,
  message      TEXT NOT NULL,
  type         TEXT,   -- 'loan_approved', 'emi_due', 'deposit_maturity', etc.
  status       TEXT DEFAULT 'pending'
                 CHECK (status IN ('pending','sent','failed')),
  response     TEXT,
  sent_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 15. AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name   TEXT NOT NULL,
  record_id    UUID,
  action       TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_data     JSONB,
  new_data     JSONB,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_members_status      ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_phone       ON members(phone);
CREATE INDEX IF NOT EXISTS idx_loans_member        ON loans(member_id);
CREATE INDEX IF NOT EXISTS idx_loans_status        ON loans(status);
CREATE INDEX IF NOT EXISTS idx_repayments_loan     ON loan_repayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_repayments_member   ON loan_repayments(member_id);
CREATE INDEX IF NOT EXISTS idx_repayments_due_date ON loan_repayments(due_date);
CREATE INDEX IF NOT EXISTS idx_deposits_member     ON deposits(member_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status     ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposit_txn_deposit ON deposit_transactions(deposit_id);
CREATE INDEX IF NOT EXISTS idx_passbook_member     ON passbook(member_id);
CREATE INDEX IF NOT EXISTS idx_passbook_date       ON passbook(transaction_date);
CREATE INDEX IF NOT EXISTS idx_vouchers_date       ON vouchers(voucher_date);
CREATE INDEX IF NOT EXISTS idx_collection_date     ON collection_sheet(collection_date);
CREATE INDEX IF NOT EXISTS idx_expenses_date       ON expenses(expense_date);

-- ============================================================
-- updated_at auto-update trigger
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$ DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'settings','staff','members','deposits','loans',
    'vouchers','expenses','collection_sheet'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_updated_at ON %I;
       CREATE TRIGGER trg_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE settings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff             ENABLE ROW LEVEL SECURITY;
ALTER TABLE members           ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits          ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans             ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_repayments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE passbook          ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_entries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_sheet  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_log           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log         ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (staff/admin)
-- In production, add role-based policies per table

CREATE POLICY "allow_all" ON settings
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all" ON staff
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all" ON members
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all" ON accounts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all" ON deposits
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all" ON deposit_transactions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all" ON loans
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all" ON loan_repayments
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all" ON passbook
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all" ON vouchers
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all" ON voucher_entries
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all" ON expenses
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all" ON collection_sheet
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all" ON sms_log
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all" ON audit_log
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- USEFUL VIEWS
-- ============================================================

-- Active loans with member info
CREATE OR REPLACE VIEW v_active_loans AS
SELECT
  l.id, l.loan_no, l.loan_type, l.amount, l.interest_rate,
  l.tenure_months, l.emi_amount, l.status,
  l.disbursed_date, l.principal_outstanding, l.interest_outstanding,
  l.penalty_outstanding,
  m.name AS member_name, m.phone AS member_phone, m.member_no
FROM loans l
JOIN members m ON m.id = l.member_id
WHERE l.status IN ('disbursed','npa');

-- Overdue EMIs
CREATE OR REPLACE VIEW v_overdue_emis AS
SELECT
  lr.id, lr.loan_id, lr.due_date, lr.total_amount,
  lr.principal_amount, lr.interest_amount, lr.penalty_amount,
  l.loan_no, l.interest_rate,
  m.name AS member_name, m.phone AS member_phone, m.member_no
FROM loan_repayments lr
JOIN loans l ON l.id = lr.loan_id
JOIN members m ON m.id = lr.member_id
WHERE lr.due_date < CURRENT_DATE
  AND lr.status = 'partial';

-- Matured deposits
CREATE OR REPLACE VIEW v_matured_deposits AS
SELECT
  d.id, d.deposit_no, d.type, d.amount, d.balance,
  d.maturity_date, d.maturity_amount, d.interest_rate, d.status,
  m.name AS member_name, m.phone AS member_phone, m.member_no
FROM deposits d
JOIN members m ON m.id = d.member_id
WHERE d.maturity_date <= CURRENT_DATE
  AND d.status = 'active';

-- Dashboard KPIs
CREATE OR REPLACE VIEW v_dashboard_kpi AS
SELECT
  (SELECT COUNT(*) FROM members WHERE status = 'active')::INT             AS total_members,
  (SELECT COUNT(*) FROM loans WHERE status IN ('disbursed','npa'))::INT    AS active_loans,
  (SELECT COALESCE(SUM(principal_outstanding),0) FROM loans
   WHERE status IN ('disbursed','npa'))                                    AS loan_outstanding,
  (SELECT COALESCE(SUM(balance),0) FROM deposits
   WHERE type = 'savings' AND status = 'active')                          AS total_savings,
  (SELECT COALESCE(SUM(amount),0) FROM deposits
   WHERE type = 'fd' AND status = 'active')                               AS total_fd,
  (SELECT COALESCE(SUM(amount),0) FROM deposits
   WHERE type = 'rd' AND status = 'active')                               AS total_rd,
  (SELECT COUNT(*) FROM loans WHERE status IN ('disbursed','npa')
   AND principal_outstanding > 0)::INT                                     AS overdue_loans,
  (SELECT COUNT(*) FROM deposits
   WHERE maturity_date <= CURRENT_DATE AND status = 'active')::INT        AS maturity_alerts;

-- Monthly collection summary
CREATE OR REPLACE VIEW v_monthly_collection AS
SELECT
  DATE_TRUNC('month', paid_date) AS month,
  COUNT(*)::INT                   AS total_repayments,
  SUM(total_amount)               AS total_collected,
  SUM(principal_amount)           AS principal_collected,
  SUM(interest_amount)            AS interest_collected,
  SUM(penalty_amount)             AS penalty_collected
FROM loan_repayments
WHERE status = 'paid'
GROUP BY 1
ORDER BY 1 DESC;

-- ============================================================
-- DONE ✓
-- ============================================================
