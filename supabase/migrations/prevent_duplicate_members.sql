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
