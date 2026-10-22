# Grihsevak Nidhi — Update v1.2 (22 Oct 2026)

## Kya naya hai

### 1. Deposit edit
- Har deposit par **Edit** button: deposit page, deposit list card, member profile.
- Member, deposit type, amount, rate, tenure, deposit date, nominee sab badal sakte ho.
- Amount / member / date badalne par passbook ki opening entry aur balance apne aap sahi ho jaata hai.
- Maturity date aur maturity amount naye values se dobara calculate hote hain.

### 2. Loan edit
- Har loan par **Edit** button: loan page, loans list, member profile.
- Jab tak pehli EMI paid na ho, amount / rate / tenure / EMI type badal sakte ho.
  Disbursed loan ka EMI schedule dobara ban jaata hai.
- EMI paid hone ke baad terms lock, baaki details (purpose, guarantor, date) edit ho sakti hain.

### 3. Maturity payment system
- **Maturity** page par har FD / RD / DRD / MIS ke saath **Pay Maturity** button (deposit page par bhi).
- Payout mein: principal, interest (badal sakte ho), deduction / TDS, payment mode (cash, UPI, NEFT, cheque), date, remarks.
- Confirm karne par interest credit, payout debit passbook mein jaata hai aur account close ho jaata hai.
- Maturity date se pehle payment = premature closure, alag se mark hota hai.
- **Paid out** tab mein dikhta hai kis member ko kab, kitna, kaise diya.

### 4. Double entry fix
- Member register karte waqt ek ki jagah do member ban jaate the. Form ab save chalte waqt doosra tap ignore karta hai.
- Same guard deposit, loan, EMI collection, withdrawal aur payout par.
- Database side se bhi rok: same Aadhaar wala doosra member refuse hoga (SQL neeche).
- Passbook mein entries do baar likhi ja rahi thi (database mein do trigger set the). Cleanup + rok ka SQL neeche.

## APK
- File: `GrihsevakNidhi-v1.2.apk` (version 1.2, versionCode 3).
- Purani app ke upar seedha install ho jaayega.
- App live website kholta hai; website update ho chuki hai, isliye naye features turant dikhenge.

## Ek baar karna hai (Supabase Dashboard → SQL Editor)
1. `supabase/migrations/prevent_duplicate_members.sql` chalao.
   Agar duplicate Aadhaar wale members ki list aaye, extra wale delete karke dobara chalao.
2. `supabase/migrations/fix_double_passbook_entries.sql` chalao.
   Aakhri mein 4 trigger dikhne chahiye: `trg_deposit_opening_passbook`, `trg_deposit_txn_passbook`,
   `trg_loan_disbursement_passbook`, `trg_loan_repayment_passbook`.

## Permissions
- Pay Maturity ke liye staff ko **Withdrawals** permission chahiye.
- Deposit / loan edit ke liye **Open new deposits** / **New loan application** permission.
- Admin ko sab milta hai.
