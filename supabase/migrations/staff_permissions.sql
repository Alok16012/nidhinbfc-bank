-- ============================================================
-- STAFF PERMISSIONS — custom role names and per-module access
-- Run once in the Supabase SQL Editor, after branches.sql.
-- Safe to run again.
--
--   * staff.role becomes free text (e.g. "Cashier", "Field Agent").
--   * staff.permissions holds what the admin ticked on the Staff page,
--     e.g. ["loans.view","loans.approve"]. NULL means "not set yet": the app
--     then gives the access the old role had, so existing staff keep working.
--   * Only admins can add, change or remove staff records, so nobody can
--     give themselves more access. Everyone still sees their branch's staff.
-- ============================================================

ALTER TABLE staff ADD COLUMN IF NOT EXISTS permissions JSONB;

-- Drop the old fixed list of roles (admin/manager/staff/accountant), if any.
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT con.conname FROM pg_constraint con
    WHERE con.conrelid = 'public.staff'::regclass
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE staff DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

-- Reading staff: same branch rule as before. Writing staff: admins only.
DROP POLICY IF EXISTS branch_access      ON staff;
DROP POLICY IF EXISTS staff_read         ON staff;
DROP POLICY IF EXISTS staff_admin_insert ON staff;
DROP POLICY IF EXISTS staff_admin_update ON staff;
DROP POLICY IF EXISTS staff_admin_delete ON staff;

CREATE POLICY staff_read ON staff FOR SELECT TO authenticated USING (
  CASE WHEN (SELECT public.is_admin())
       THEN (SELECT public.selected_branch_id()) IS NULL
            OR branch_id = (SELECT public.selected_branch_id())
       ELSE branch_id = (SELECT public.my_branch_id())
  END
);
CREATE POLICY staff_admin_insert ON staff FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY staff_admin_update ON staff FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY staff_admin_delete ON staff FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));

NOTIFY pgrst, 'reload schema';
