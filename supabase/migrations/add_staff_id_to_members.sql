-- Migration: Add staff_id to members table
-- Description: Adds a column to store the human-readable Employee ID of the staff member who created the member.

ALTER TABLE members ADD COLUMN IF NOT EXISTS staff_id TEXT;
