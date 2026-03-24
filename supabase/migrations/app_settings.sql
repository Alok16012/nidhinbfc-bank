-- Master settings table for admin-configurable interest rates and app config
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

-- Ensure only one row exists
INSERT INTO app_settings DEFAULT VALUES ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read/update
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_read_settings" ON app_settings FOR SELECT USING (true);
CREATE POLICY "allow_update_settings" ON app_settings FOR UPDATE USING (auth.role() = 'authenticated');
