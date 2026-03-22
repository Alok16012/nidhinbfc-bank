-- ============================================================
-- SEED DATA — Sample data for testing
-- Run AFTER schema.sql
-- ============================================================

-- Sample Members
INSERT INTO members (name, father_name, dob, gender, phone, email, address, city, state, pincode, occupation, id_type, id_number, aadhar, pan, share_amount, share_count, share_capital, status, join_date)
VALUES
  ('Ramesh Kumar Sharma', 'Suresh Sharma', '1985-06-15', 'male', '9876543210', 'ramesh@email.com', 'Village Rampur, Near Temple', 'Lucknow', 'Uttar Pradesh', '226001', 'Farmer', 'aadhar', '1234 5678 9012', '123456789012', '', 'M0001', 1000, 10, 1000, 'active', '2023-01-15'),
  ('Sunita Devi', 'Ram Prasad', '1990-03-22', 'female', '9876543211', 'sunita@email.com', 'Mohalla Shivpuri', 'Kanpur', 'Uttar Pradesh', '208001', 'Self Employed', 'aadhar', '2345 6789 0123', '234567890123', '', 'M0002', 500, 5, 500, 'active', '2023-02-10'),
  ('Mohan Lal Gupta', 'Shyam Lal', '1978-11-08', 'male', '9876543212', 'mohan@email.com', 'Gandhi Nagar', 'Varanasi', 'Uttar Pradesh', '221001', 'Shopkeeper', 'pan', 'ABCPG1234D', '', 'ABCPG1234D', 'M0003', 2000, 20, 2000, 'active', '2023-01-20'),
  ('Anita Singh', 'Vijay Singh', '1992-07-30', 'female', '9876543213', NULL, 'Civil Lines', 'Allahabad', 'Uttar Pradesh', '211001', 'Teacher', 'aadhar', '3456 7890 1234', '345678901234', '', 'M0004', 1000, 10, 1000, 'active', '2023-03-05'),
  ('Rajendra Prasad', 'Bhola Prasad', '1975-12-01', 'male', '9876543214', NULL, 'Hazratganj', 'Lucknow', 'Uttar Pradesh', '226001', 'Business', 'voter', 'VTR123456', '', '', 'M0005', 3000, 30, 3000, 'active', '2022-12-01'),
  ('Kavita Yadav', 'Surendra Yadav', '1988-04-18', 'female', '9876543215', NULL, 'Vishwanath Ganj', 'Gorakhpur', 'Uttar Pradesh', '273001', 'Farmer', 'aadhar', '4567 8901 2345', '456789012345', '', 'M0006', 500, 5, 500, 'active', '2023-04-12'),
  ('Suresh Tiwari', 'Ramesh Tiwari', '1982-09-25', 'male', '9876543216', NULL, 'Lal Bagh', 'Lucknow', 'Uttar Pradesh', '226001', 'Service', 'pan', 'BCDPT5678E', '', 'BCDPT5678E', 'M0007', 1500, 15, 1500, 'active', '2023-01-08'),
  ('Priya Verma', 'Anil Verma', '1995-02-14', 'female', '9876543217', NULL, 'Indira Nagar', 'Lucknow', 'Uttar Pradesh', '226016', 'Student', 'aadhar', '5678 9012 3456', '567890123456', '', 'M0008', 500, 5, 500, 'active', '2023-05-20');

-- Sample Savings Deposits
INSERT INTO deposits (member_id, type, deposit_type, amount, interest_rate, balance, current_balance, status, open_date, deposit_id)
SELECT
  m.id,
  'savings',
  'savings',
  1000,
  4.0,
  CASE m.name
    WHEN 'Ramesh Kumar Sharma' THEN 15000
    WHEN 'Sunita Devi'         THEN 8500
    WHEN 'Mohan Lal Gupta'     THEN 25000
    WHEN 'Anita Singh'         THEN 12000
    WHEN 'Rajendra Prasad'     THEN 45000
    ELSE 5000
  END,
  CASE m.name
    WHEN 'Ramesh Kumar Sharma' THEN 15000
    WHEN 'Sunita Devi'         THEN 8500
    WHEN 'Mohan Lal Gupta'     THEN 25000
    WHEN 'Anita Singh'         THEN 12000
    WHEN 'Rajendra Prasad'     THEN 45000
    ELSE 5000
  END,
  'active',
  m.join_date,
  'DEP-S-' || LPAD(ROW_NUMBER() OVER ()::TEXT, 4, '0')
FROM members m
WHERE m.status = 'active';

-- Sample FD
INSERT INTO deposits (member_id, type, amount, interest_rate, balance, tenure_months, maturity_date, maturity_amount, status, open_date)
SELECT
  m.id,
  'fd',
  50000,
  8.5,
  50000,
  12,
  CURRENT_DATE + INTERVAL '6 months',
  54250,
  'active',
  CURRENT_DATE - INTERVAL '6 months'
FROM members m
WHERE m.name IN ('Mohan Lal Gupta','Rajendra Prasad');

-- Sample RD
INSERT INTO deposits (member_id, type, amount, interest_rate, monthly_amount, balance, tenure_months, maturity_date, status, open_date)
SELECT
  m.id,
  'rd',
  0,
  7.0,
  2000,
  CASE m.name
    WHEN 'Ramesh Kumar Sharma' THEN 6000
    WHEN 'Anita Singh'         THEN 4000
    ELSE 2000
  END,
  12,
  CURRENT_DATE + INTERVAL '8 months',
  'active',
  CURRENT_DATE - INTERVAL '4 months'
FROM members m
WHERE m.name IN ('Ramesh Kumar Sharma','Anita Singh','Kavita Yadav');

-- Sample Loans (disbursed)
INSERT INTO loans (member_id, loan_type, amount, disbursed_amount, interest_rate, tenure_months, emi_amount, calculation_type, repayment_type, status, applied_date, approved_date, disbursed_date, disbursed_at, principal_outstanding, outstanding_balance, interest_outstanding, purpose, loan_id)
SELECT
  m.id,
  'personal',
  CASE m.name
    WHEN 'Ramesh Kumar Sharma' THEN 50000
    WHEN 'Mohan Lal Gupta'     THEN 100000
    WHEN 'Rajendra Prasad'     THEN 200000
    ELSE 30000
  END,
  CASE m.name
    WHEN 'Ramesh Kumar Sharma' THEN 50000
    WHEN 'Mohan Lal Gupta'     THEN 100000
    WHEN 'Rajendra Prasad'     THEN 200000
    ELSE 30000
  END,
  12.0,
  24,
  CASE m.name
    WHEN 'Ramesh Kumar Sharma' THEN 2350
    WHEN 'Mohan Lal Gupta'     THEN 4700
    WHEN 'Rajendra Prasad'     THEN 9400
    ELSE 1410
  END,
  'reducing',
  'emi',
  'disbursed',
  CURRENT_DATE - INTERVAL '3 months',
  CURRENT_DATE - INTERVAL '2 months 20 days',
  CURRENT_DATE - INTERVAL '2 months 15 days',
  CURRENT_DATE - INTERVAL '2 months 15 days',
  CASE m.name
    WHEN 'Ramesh Kumar Sharma' THEN 44500
    WHEN 'Mohan Lal Gupta'     THEN 91000
    WHEN 'Rajendra Prasad'     THEN 185000
    ELSE 27000
  END,
  CASE m.name
    WHEN 'Ramesh Kumar Sharma' THEN 44500
    WHEN 'Mohan Lal Gupta'     THEN 91000
    WHEN 'Rajendra Prasad'     THEN 185000
    ELSE 27000
  END,
  0,
  'Personal / Business need',
  'LN-' || LPAD(ROW_NUMBER() OVER ()::TEXT, 4, '0')
FROM members m
WHERE m.name IN ('Ramesh Kumar Sharma','Mohan Lal Gupta','Rajendra Prasad','Sunita Devi');

-- Sample Pending Loan (applied)
INSERT INTO loans (member_id, loan_type, amount, interest_rate, tenure_months, calculation_type, status, applied_date, purpose, loan_id)
SELECT
  m.id, 'agriculture', 75000, 10.0, 18, 'flat', 'pending',
  CURRENT_DATE - INTERVAL '5 days',
  'Crop purchase and equipment',
  'LN-0009'
FROM members m
WHERE m.name = 'Suresh Tiwari';

-- Sample Expenses
INSERT INTO expenses (category, amount, expense_date, payment_mode, paid_to, description, status)
VALUES
  ('salary',      25000, CURRENT_DATE - INTERVAL '5 days',  'online', 'Staff Salaries',      'Monthly salary March 2025', 'paid'),
  ('rent',        8000,  CURRENT_DATE - INTERVAL '3 days',  'cash',   'Building Owner',      'Office rent March 2025',    'paid'),
  ('utilities',   1200,  CURRENT_DATE - INTERVAL '2 days',  'cash',   'Electricity Board',   'Electricity bill',          'paid'),
  ('office',      3500,  CURRENT_DATE - INTERVAL '1 day',   'cash',   'Stationery Shop',     'Stationery & printing',     'paid'),
  ('maintenance', 5000,  CURRENT_DATE,                      'cash',   'Computer Service',    'PC repair & maintenance',   'pending');

-- Sample Vouchers
INSERT INTO vouchers (voucher_type, voucher_date, narration, total_amount, status)
VALUES
  ('receipt',  CURRENT_DATE - INTERVAL '2 days', 'Loan repayment received from Ramesh Kumar', 2350, 'posted'),
  ('payment',  CURRENT_DATE - INTERVAL '3 days', 'Office rent paid for March',                8000, 'posted'),
  ('receipt',  CURRENT_DATE - INTERVAL '1 day',  'FD deposit received from Mohan Lal',        50000,'posted'),
  ('journal',  CURRENT_DATE,                     'Interest accrual for savings accounts',      1250, 'posted');

-- ============================================================
-- DONE ✓
-- ============================================================
