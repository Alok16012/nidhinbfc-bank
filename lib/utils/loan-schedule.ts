import { calculateEMI, calculateFlatEMI } from "@/lib/utils/emi-calculator";
import type { EMIFrequency } from "@/lib/utils/emi-calculator";

/** The loan fields the EMI schedule is built from. */
export interface ScheduleLoan {
  id: string;
  member_id: string;
  amount: number;
  interest_rate: number;
  tenure_months: number;
  calculation_type?: string | null;
  repayment_type?: string | null;
  emi_frequency?: string | null;
}

/** "YYYY-MM-DD" → local Date at noon, so dates never shift a day in toISOString(). */
export function parseLocalDate(value: string): Date | null {
  const [y, m, d] = String(value).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12);
}

export function isFlatLoan(loan: ScheduleLoan): boolean {
  return loan.calculation_type === "flat" || loan.repayment_type === "flat";
}

/** Pending `loan_repayments` rows for every installment, starting from `startDate`. */
export function buildRepaymentRows(loan: ScheduleLoan, startDate: Date) {
  const freq = (loan.emi_frequency ?? "monthly") as EMIFrequency;
  const result = isFlatLoan(loan)
    ? calculateFlatEMI(loan.amount, loan.interest_rate, loan.tenure_months, startDate, freq)
    : calculateEMI(loan.amount, loan.interest_rate, loan.tenure_months, startDate, freq);

  return result.schedule.map((s) => ({
    loan_id:          loan.id,
    member_id:        loan.member_id,
    installment_no:   s.installmentNo,
    due_date:         s.dueDate,
    emi_amount:       s.emi,
    principal_amount: s.principal,
    interest_amount:  s.interest,
    principal_due:    s.principal,
    interest_due:     s.interest,
    total_amount:     s.emi,
    status:           "pending",
  }));
}
