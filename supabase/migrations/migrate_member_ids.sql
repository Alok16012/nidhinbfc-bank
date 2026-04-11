-- ============================================================
-- MIGRATION: Sequential Member IDs
-- Run this in Supabase SQL Editor to fix existing records
-- ============================================================

-- 1. Ensure sequence exists and reset it to start from 1
CREATE SEQUENCE IF NOT EXISTS member_id_seq START 1;
SELECT setval('member_id_seq', 1, false);

-- 2. Update existing members with sequential IDs based on their creation date
WITH numbered_members AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
  FROM members
)
UPDATE members m
SET member_id = 'MEM' || LPAD(nm.row_num::TEXT, 7, '0')
FROM numbered_members nm
WHERE m.id = nm.id;

-- 3. Sync the sequence to the next available number
SELECT setval('member_id_seq', (SELECT COUNT(*) FROM members));
