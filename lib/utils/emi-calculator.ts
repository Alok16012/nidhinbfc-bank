export interface EMIResult {
  emi: number;
  totalAmount: number;
  totalInterest: number;
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

export function calculateEMI(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  startDate: Date = new Date()
): EMIResult {
  const monthlyRate = annualRate / 12 / 100;

  let emi: number;
  if (monthlyRate === 0) {
    emi = principal / tenureMonths;
  } else {
    emi =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
      (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  }

  emi = Math.round(emi * 100) / 100;

  const schedule: EMIScheduleItem[] = [];
  let balance = principal;

  for (let i = 1; i <= tenureMonths; i++) {
    const interest = Math.round(balance * monthlyRate * 100) / 100;
    const principalPart = Math.round((emi - interest) * 100) / 100;
    balance = Math.round((balance - principalPart) * 100) / 100;

    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    schedule.push({
      installmentNo: i,
      dueDate: dueDate.toISOString().split("T")[0],
      principal: principalPart,
      interest,
      emi,
      balance: Math.max(0, balance),
    });
  }

  const totalAmount = emi * tenureMonths;
  const totalInterest = totalAmount - principal;

  return {
    emi,
    totalAmount: Math.round(totalAmount * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    schedule,
  };
}

export function calculateFlatEMI(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  startDate: Date = new Date()
): EMIResult {
  const totalInterest = (principal * annualRate * tenureMonths) / (12 * 100);
  const totalAmount = principal + totalInterest;
  const emi = Math.round((totalAmount / tenureMonths) * 100) / 100;
  const monthlyInterest = Math.round((totalInterest / tenureMonths) * 100) / 100;
  const monthlyPrincipal = Math.round((principal / tenureMonths) * 100) / 100;

  const schedule: EMIScheduleItem[] = [];
  let balance = principal;

  for (let i = 1; i <= tenureMonths; i++) {
    balance = Math.round((balance - monthlyPrincipal) * 100) / 100;
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    schedule.push({
      installmentNo: i,
      dueDate: dueDate.toISOString().split("T")[0],
      principal: monthlyPrincipal,
      interest: monthlyInterest,
      emi,
      balance: Math.max(0, balance),
    });
  }

  return {
    emi,
    totalAmount: Math.round(totalAmount * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    schedule,
  };
}
