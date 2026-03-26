-- Add Aadhar back-side URL to members
ALTER TABLE members ADD COLUMN IF NOT EXISTS aadhar_back_url TEXT;

-- Add guarantor KYC + document fields to loans
ALTER TABLE loans ADD COLUMN IF NOT EXISTS guarantor_aadhar      TEXT;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS guarantor_pan         TEXT;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS guarantor_relation    TEXT;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS guarantor_dob         DATE;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS guarantor_aadhar_url      TEXT;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS guarantor_aadhar_back_url TEXT;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS guarantor_pan_url         TEXT;
