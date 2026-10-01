-- ============================================================
-- BRANCHES — multi-branch support with a database-level lock
-- Run this whole file once in the Supabase SQL Editor.
-- It is safe to run again if it fails part-way.
--
-- What it does
--   1. Creates the `branches` table and a "Main Branch" (head office).
--   2. Adds `branch_id` to every business table and puts all existing
--      rows in the Main Branch.
--   3. Fills `branch_id` automatically on insert (from the member,
--      deposit, loan or voucher it belongs to, else the user's branch).
--   4. Replaces the old "allow_all" policies with branch policies:
--        * admin  → every branch, or only the branch chosen in the app's
--                   branch switcher (sent as the `x-branch-id` header)
--        * others → only the branch on their staff record
--   5. Marks existing admin logins as admin in app_metadata, which users
--      cannot edit themselves (user_metadata they can).
--
-- After running it, every user must sign out and sign in again so their
-- login token picks up the admin flag.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Branches
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS branches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  address         TEXT,
  city            TEXT,
  phone           TEXT,
  email           TEXT,
  manager_name    TEXT,
  is_head_office  BOOLEAN NOT NULL DEFAULT FALSE,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO branches (code, name, is_head_office)
SELECT 'HO', 'Main Branch', TRUE
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE is_head_office);

CREATE OR REPLACE FUNCTION public.head_office_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM branches WHERE is_head_office ORDER BY created_at LIMIT 1
$$;

-- ------------------------------------------------------------
-- 2. branch_id on every business table (skips tables that don't exist)
-- ------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  ho UUID := public.head_office_id();
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'staff','members','deposits','deposit_transactions','loans','loan_repayments',
    'passbook','vouchers','voucher_entries','expenses','collection_sheet','sms_log','audit_log'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    -- Some tables have the set_updated_at trigger but no updated_at column,
    -- which makes every UPDATE on them fail. Add the column it expects.
    IF EXISTS (SELECT 1 FROM pg_trigger tg JOIN pg_proc pr ON pr.oid = tg.tgfoid
               WHERE tg.tgrelid = ('public.' || t)::regclass AND pr.proname = 'set_updated_at') THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()', t);
    END IF;
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT', t);
    EXECUTE format('UPDATE %I SET branch_id = $1 WHERE branch_id IS NULL', t) USING ho;
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (branch_id)', t || '_branch_id_idx', t);
  END LOOP;
END $$;

-- The branch lookup below matches staff to their login by user_id or email;
-- older databases may not have these columns on staff yet.
ALTER TABLE staff ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS status  TEXT DEFAULT 'active';

-- ------------------------------------------------------------
-- 3. Who is asking?
-- ------------------------------------------------------------
-- Admin flag lives in app_metadata, which only the service role can set.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
$$;

-- Branch on the signed-in user's staff record (matched by login id, or email
-- for staff rows created before the login was linked).
CREATE OR REPLACE FUNCTION public.my_branch_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT branch_id FROM staff
  WHERE (user_id = auth.uid() OR lower(email) = lower(auth.jwt() ->> 'email'))
    AND coalesce(status, 'active') = 'active'
  ORDER BY (user_id = auth.uid()) DESC NULLS LAST
  LIMIT 1
$$;

-- Branch picked in the admin's branch switcher; NULL means "All branches".
CREATE OR REPLACE FUNCTION public.selected_branch_id()
RETURNS UUID LANGUAGE plpgsql STABLE AS $$
DECLARE h TEXT;
BEGIN
  h := nullif(current_setting('request.headers', true), '')::json ->> 'x-branch-id';
  IF h ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN h::uuid;
  END IF;
  RETURN NULL;
END $$;

-- Branch new rows should go to when nothing else decides it.
CREATE OR REPLACE FUNCTION public.current_branch_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN public.is_admin() THEN public.selected_branch_id() ELSE public.my_branch_id() END
$$;

-- ------------------------------------------------------------
-- 4. Fill branch_id automatically
-- ------------------------------------------------------------
-- Fill branch_id on insert: parent record first, then the user's branch,
-- then the head office (e.g. an admin adding a voucher in "All branches").
CREATE OR REPLACE FUNCTION public.set_branch_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r JSONB := to_jsonb(NEW);
  b UUID;
BEGIN
  IF NEW.branch_id IS NOT NULL THEN RETURN NEW; END IF;

  IF TG_TABLE_NAME <> 'members' AND r ? 'member_id' AND r ->> 'member_id' IS NOT NULL THEN
    SELECT branch_id INTO b FROM members WHERE id::text = r ->> 'member_id';
  END IF;
  IF b IS NULL AND TG_TABLE_NAME <> 'deposits' AND r ? 'deposit_id' AND r ->> 'deposit_id' IS NOT NULL THEN
    SELECT branch_id INTO b FROM deposits WHERE id::text = r ->> 'deposit_id';
  END IF;
  IF b IS NULL AND TG_TABLE_NAME <> 'loans' AND r ? 'loan_id' AND r ->> 'loan_id' IS NOT NULL THEN
    SELECT branch_id INTO b FROM loans WHERE id::text = r ->> 'loan_id';
  END IF;
  IF b IS NULL AND r ? 'voucher_id' AND r ->> 'voucher_id' IS NOT NULL THEN
    SELECT branch_id INTO b FROM vouchers WHERE id::text = r ->> 'voucher_id';
  END IF;

  NEW.branch_id := coalesce(b, public.current_branch_id(), public.head_office_id());
  RETURN NEW;
END $$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'staff','members','deposits','deposit_transactions','loans','loan_repayments',
    'passbook','vouchers','voucher_entries','expenses','collection_sheet','sms_log','audit_log'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS aa_set_branch_id ON %I', t);
    EXECUTE format('CREATE TRIGGER aa_set_branch_id BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION public.set_branch_id()', t);
  END LOOP;
END $$;

-- Moving a member to another branch moves their accounts with them.
CREATE OR REPLACE FUNCTION public.move_member_records()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t TEXT;
BEGIN
  IF NEW.branch_id IS DISTINCT FROM OLD.branch_id THEN
    FOREACH t IN ARRAY ARRAY['deposits','loans','passbook','collection_sheet'] LOOP
      IF to_regclass('public.' || t) IS NOT NULL THEN
        EXECUTE format('UPDATE %I SET branch_id = $1 WHERE member_id = $2', t) USING NEW.branch_id, NEW.id;
      END IF;
    END LOOP;
    IF to_regclass('public.deposit_transactions') IS NOT NULL THEN
      UPDATE deposit_transactions SET branch_id = NEW.branch_id
      WHERE deposit_id IN (SELECT id FROM deposits WHERE member_id = NEW.id);
    END IF;
    IF to_regclass('public.loan_repayments') IS NOT NULL THEN
      UPDATE loan_repayments SET branch_id = NEW.branch_id
      WHERE loan_id IN (SELECT id FROM loans WHERE member_id = NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_move_member_records ON members;
CREATE TRIGGER trg_move_member_records
  AFTER UPDATE OF branch_id ON members
  FOR EACH ROW EXECUTE FUNCTION public.move_member_records();

-- ------------------------------------------------------------
-- 5. Row level security
-- ------------------------------------------------------------
-- Drop every existing policy on these tables: one leftover permissive
-- policy would let every branch see everything again.
DO $$
DECLARE
  p RECORD;
  t TEXT;
  rule TEXT := '(CASE WHEN (SELECT public.is_admin())
                      THEN (SELECT public.selected_branch_id()) IS NULL
                           OR branch_id = (SELECT public.selected_branch_id())
                      ELSE branch_id = (SELECT public.my_branch_id())
                 END)';
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'staff','members','deposits','deposit_transactions','loans','loan_repayments',
    'passbook','vouchers','voucher_entries','expenses','collection_sheet','sms_log','audit_log'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY %I ON %I', p.policyname, t);
    END LOOP;
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY branch_access ON %I FOR ALL TO authenticated USING %s WITH CHECK %s', t, rule, rule);
  END LOOP;
END $$;

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS branches_read  ON branches;
DROP POLICY IF EXISTS branches_write ON branches;
CREATE POLICY branches_read ON branches FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()) OR id = (SELECT public.my_branch_id()));
CREATE POLICY branches_write ON branches FOR ALL TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

-- ------------------------------------------------------------
-- 6. Helpers the app calls that must look across branches
-- ------------------------------------------------------------
-- Per-branch totals for the Branches page (admin only).
CREATE OR REPLACE FUNCTION public.branch_stats()
RETURNS TABLE (bid UUID, member_count BIGINT, staff_count BIGINT, deposit_count BIGINT,
               deposit_total NUMERIC, loan_count BIGINT, loan_outstanding NUMERIC)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RETURN; END IF;
  RETURN QUERY
  SELECT b.id,
    (SELECT count(*) FROM members m  WHERE m.branch_id = b.id AND coalesce(m.status, '') <> 'deleted'),
    (SELECT count(*) FROM staff s    WHERE s.branch_id = b.id),
    (SELECT count(*) FROM deposits d WHERE d.branch_id = b.id AND d.status = 'active'),
    (SELECT coalesce(sum(d.amount), 0)::numeric FROM deposits d WHERE d.branch_id = b.id AND d.status = 'active'),
    (SELECT count(*) FROM loans l    WHERE l.branch_id = b.id AND l.status IN ('disbursed', 'npa')),
    (SELECT coalesce(sum(l.outstanding_balance), 0)::numeric FROM loans l WHERE l.branch_id = b.id AND l.status IN ('disbursed', 'npa'))
  FROM branches b;
END $$;

-- Aadhaar must be unique across the whole company, not just one branch.
CREATE OR REPLACE FUNCTION public.find_member_by_aadhar(p_aadhar TEXT)
RETURNS TABLE (name TEXT, member_id TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.name, m.member_id FROM members m WHERE m.aadhar = p_aadhar LIMIT 1
$$;

-- Employee ids are numbered company-wide, so count every branch.
CREATE OR REPLACE FUNCTION public.next_employee_id()
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE n INT;
BEGIN
  SELECT coalesce(max(nullif(regexp_replace(employee_id, '\D', '', 'g'), '')::int), 0)
    INTO n FROM staff;
  RETURN 'EMP' || lpad((n + 1)::text, 5, '0');
END $$;

REVOKE EXECUTE ON FUNCTION public.branch_stats(), public.find_member_by_aadhar(TEXT), public.next_employee_id() FROM anon;

-- ------------------------------------------------------------
-- 7. Existing admin logins → admin in app_metadata
-- ------------------------------------------------------------
UPDATE auth.users
SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
WHERE raw_user_meta_data ->> 'role' = 'admin';

NOTIFY pgrst, 'reload schema';

-- Check the result: every login, whether it is admin, and its branch.
-- A non-admin with no branch will see no data until you assign one.
SELECT u.email,
       u.raw_app_meta_data ->> 'role'  AS admin_flag,
       u.raw_user_meta_data ->> 'role' AS role,
       b.name                          AS branch
FROM auth.users u
LEFT JOIN staff s    ON s.user_id = u.id OR lower(s.email) = lower(u.email)
LEFT JOIN branches b ON b.id = s.branch_id
ORDER BY admin_flag NULLS LAST, u.email;
