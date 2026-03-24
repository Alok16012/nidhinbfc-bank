-- ============================================================
-- PASSBOOK AUTO-POPULATE TRIGGERS
-- Run this in Supabase SQL Editor
-- ============================================================

-- Helper: get last running balance for a member
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

-- ============================================================
-- TRIGGER 1: Loan Disbursement → passbook credit entry
-- ============================================================
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

-- ============================================================
-- TRIGGER 2: Loan Repayment (EMI paid) → passbook debit entry
-- ============================================================
CREATE OR REPLACE FUNCTION fn_passbook_loan_repayment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  last_bal   NUMERIC;
  v_member   UUID;
  v_loan_ref TEXT;
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Get member_id and loan reference
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

-- ============================================================
-- TRIGGER 3: New Deposit → passbook credit entry
-- ============================================================
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
