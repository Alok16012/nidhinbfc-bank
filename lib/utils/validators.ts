import { z } from "zod";

export const memberSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  dob: z.string().min(1, "Date of birth is required"),
  address: z.string().min(5, "Address is required"),
  nominee_name: z.string().min(2, "Nominee name is required"),
  nominee_relation: z.string().min(1, "Nominee relation is required"),
  aadhar: z.string().regex(/^\d{12}$/, "Aadhar must be 12 digits").optional().or(z.literal("")),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format").optional().or(z.literal("")),
  share_capital: z.number().min(0).optional(),
});

export const loanSchema = z.object({
  member_id: z.string().uuid("Select a valid member"),
  loan_type: z.enum(["personal", "business", "agriculture", "housing", "education", "vehicle", "gold"]),
  amount: z.number().min(1000, "Minimum loan amount is ₹1,000"),
  interest_rate: z.number().min(0).max(36),
  tenure_months: z.number().int().min(1).max(360),
  repayment_type: z.enum(["emi", "flat", "bullet"]),
  purpose: z.string().min(3, "Loan purpose is required"),
  guarantor_name: z.string().optional(),
  guarantor_phone: z.string().optional(),
  collateral: z.string().optional(),
});

export const depositSchema = z.object({
  member_id: z.string().uuid("Select a valid member"),
  deposit_type: z.enum(["savings", "fd", "rd", "mis"]),
  amount: z.number().min(100, "Minimum deposit is ₹100"),
  interest_rate: z.number().min(0).max(20),
  tenure_months: z.number().int().min(1).optional(),
  nominee_name: z.string().min(2, "Nominee name required"),
  nominee_relation: z.string().min(1, "Nominee relation required"),
});

export const voucherSchema = z.object({
  voucher_type: z.enum(["receipt", "payment", "journal", "contra"]),
  date: z.string().min(1, "Date is required"),
  amount: z.number().min(1, "Amount must be positive"),
  narration: z.string().min(3, "Narration is required"),
  debit_account: z.string().min(1, "Debit account is required"),
  credit_account: z.string().min(1, "Credit account is required"),
});

export type MemberFormData = z.infer<typeof memberSchema>;
export type LoanFormData = z.infer<typeof loanSchema>;
export type DepositFormData = z.infer<typeof depositSchema>;
export type VoucherFormData = z.infer<typeof voucherSchema>;
