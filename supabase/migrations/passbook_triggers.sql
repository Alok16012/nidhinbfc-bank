-- ============================================================
-- PASSBOOK TRIGGERS — SUPERSEDED
-- ============================================================
-- The triggers this file used to create (trg_passbook_*) duplicated the
-- unified ones in schema.sql (trg_*_passbook). With both installed every
-- deposit opening, loan disbursal and EMI appeared twice in the passbook.
--
-- Run migrations/fix_double_passbook_entries.sql instead: it removes the
-- old triggers, cleans up the duplicate rows and installs the unified
-- triggers with a unique source_key so it cannot happen again.
--
-- Running this file now only removes the old triggers.
-- ============================================================
DROP TRIGGER IF EXISTS trg_passbook_deposit_created   ON deposits;
DROP TRIGGER IF EXISTS trg_passbook_loan_repayment    ON loan_repayments;
DROP TRIGGER IF EXISTS trg_passbook_loan_disbursement ON loans;
DROP FUNCTION IF EXISTS fn_passbook_deposit_created();
DROP FUNCTION IF EXISTS fn_passbook_loan_repayment();
DROP FUNCTION IF EXISTS fn_passbook_loan_disbursement();
