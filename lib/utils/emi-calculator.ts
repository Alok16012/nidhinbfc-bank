export type EMIFrequency = "daily" | "weekly" | "monthly";

export interface EMIResult {
  emi: number;
  totalAmount: number;
  totalInterest: number;
  installments: number;
  schedule: EMIScheduleItem[];
}

export interface EMIScheduleItem {
  installmentNo: number;
  dueDate: string;
  principal: number;
  interest: number;
  emi: number;
  balance: number;
}

// Tenure months → installment count per frequency
function getInstallments(tenureMonths: number, frequency: EMIFrequency): number {
  switch (frequency) {
    case "daily":   return tenureMonths * 30;
    case "weekly":  return tenureMonths * 4;
    case "monthly": return tenureMonths;
  }
}

// Annual rate → periodic rate
function getPeriodicRate(annualRate: number, frequency: EMIFrequency): number {
  switch (frequency) {
    case "daily":   return annualRate / 365 / 100;
    case "weekly":  return annualRate / 52  / 100;
    case "monthly": return annualRate / 12  / 100;
  }
}

// Advance date by one period
function nextDate(date: Date, frequency: EMIFrequency): Date {
  const d = new Date(date);
  switch (frequency) {
    case "daily":   d.setDate(d.getDate() + 1);   break;
    case "weekly":  d.setDate(d.getDate() + 7);   break;
    case "monthly": d.setMonth(d.getMonth() + 1); break;
  }
  return d;
}

// ── Reducing balance ─────────────────────────────────────────────────────────
export function calculateEMI(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  startDate: Date = new Date(),
  frequency: EMIFrequency = "monthly"
): EMIResult {
  const n = getInstallments(tenureMonths, frequency);
  const r = getPeriodicRate(annualRate, frequency);

  let emi: number;
  if (r === 0) {
    emi = principal / n;
  } else {
    emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }
  emi = Math.round(emi * 100) / 100;

  const schedule: EMIScheduleItem[] = [];
  let balance = principal;
  let due = new Date(startDate);

  for (let i = 1; i <= n; i++) {
    due = nextDate(due, frequency);
    const interest      = Math.round(balance * r * 100) / 100;
    const principalPart = Math.round((emi - interest) * 100) / 100;
    balance             = Math.round((balance - principalPart) * 100) / 100;

    schedule.push({
      installmentNo: i,
      dueDate: due.toISOString().split("T")[0],
      principal: principalPart,
      interest,
      emi,
      balance: Math.max(0, balance),
    });
  }

  const totalAmount   = emi * n;
  const totalInterest = totalAmount - principal;

  return {
    emi,
    installments: n,
    totalAmount:   Math.round(totalAmount   * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    schedule,
  };
}

// ── Flat rate ────────────────────────────────────────────────────────────────
export function calculateFlatEMI(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  startDate: Date = new Date(),
  frequency: EMIFrequency = "monthly"
): EMIResult {
  const n             = getInstallments(tenureMonths, frequency);
  const totalInterest = (principal * annualRate * tenureMonths) / (12 * 100);
  const totalAmount   = principal + totalInterest;
  const emi           = Math.round((totalAmount / n) * 100) / 100;
  const periodInt     = Math.round((totalInterest / n) * 100) / 100;
  const periodPrin    = Math.round((principal     / n) * 100) / 100;

  const schedule: EMIScheduleItem[] = [];
  let balance = principal;
  let due = new Date(startDate);

  for (let i = 1; i <= n; i++) {
    due     = nextDate(due, frequency);
    balance = Math.round((balance - periodPrin) * 100) / 100;

    schedule.push({
      installmentNo: i,
      dueDate: due.toISOString().split("T")[0],
      principal: periodPrin,
      interest:  periodInt,
      emi,
      balance: Math.max(0, balance),
    });
  }

  return {
    emi,
    installments: n,
    totalAmount:   Math.round(totalAmount   * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    schedule,
  };
}
