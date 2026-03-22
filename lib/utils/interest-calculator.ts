export interface InterestResult {
  maturityAmount: number;
  interestEarned: number;
  effectiveRate: number;
}

export function calculateFDInterest(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  compoundingFrequency: "monthly" | "quarterly" | "yearly" = "quarterly"
): InterestResult {
  const n =
    compoundingFrequency === "monthly"
      ? 12
      : compoundingFrequency === "quarterly"
      ? 4
      : 1;
  const t = tenureMonths / 12;
  const r = annualRate / 100;

  const maturityAmount = principal * Math.pow(1 + r / n, n * t);
  const interestEarned = maturityAmount - principal;
  const effectiveRate = (Math.pow(1 + r / n, n) - 1) * 100;

  return {
    maturityAmount: Math.round(maturityAmount * 100) / 100,
    interestEarned: Math.round(interestEarned * 100) / 100,
    effectiveRate: Math.round(effectiveRate * 100) / 100,
  };
}

export function calculateRDMaturity(
  monthlyInstallment: number,
  annualRate: number,
  tenureMonths: number
): InterestResult {
  const r = annualRate / (4 * 100);
  let maturityAmount = 0;

  for (let i = 1; i <= tenureMonths; i++) {
    const quartersRemaining = (tenureMonths - i + 1) / 3;
    maturityAmount += monthlyInstallment * Math.pow(1 + r, quartersRemaining);
  }

  const totalDeposited = monthlyInstallment * tenureMonths;
  const interestEarned = maturityAmount - totalDeposited;

  return {
    maturityAmount: Math.round(maturityAmount * 100) / 100,
    interestEarned: Math.round(interestEarned * 100) / 100,
    effectiveRate: annualRate,
  };
}

export function calculateSimpleInterest(
  principal: number,
  annualRate: number,
  tenureMonths: number
): InterestResult {
  const interest = (principal * annualRate * tenureMonths) / (12 * 100);
  return {
    maturityAmount: Math.round((principal + interest) * 100) / 100,
    interestEarned: Math.round(interest * 100) / 100,
    effectiveRate: annualRate,
  };
}
