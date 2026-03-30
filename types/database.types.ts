export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      members: {
        Row: {
          id: string;
          member_id: string;
          member_no: string;
          form_no: string | null;
          name: string;
          father_name: string | null;
          phone: string;
          alt_phone: string | null;
          email: string | null;
          dob: string;
          gender: "male" | "female" | "other" | null;
          occupation: string | null;
          education: string | null;
          address: string;
          city: string | null;
          state: string | null;
          pincode: string | null;
          current_address: string | null;
          current_pincode: string | null;
          current_state: string | null;
          current_district: string | null;
          nominee_name: string;
          nominee_relation: string;
          nominee_phone: string | null;
          nominee_age: number | null;
          bank_account_no: string | null;
          bank_ifsc: string | null;
          bank_name: string | null;
          id_type: string | null;
          id_number: string | null;
          aadhar: string | null;
          pan: string | null;
          aadhar_url: string | null;
          aadhar_back_url: string | null;
          pan_url: string | null;
          photo_url: string | null;
          signature_url: string | null;
          fingerprint_url: string | null;
          share_capital: number;
          status: "active" | "inactive" | "suspended";
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["members"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["members"]["Insert"]>;
      };
      loans: {
        Row: {
          id: string;
          loan_id: string;
          member_id: string;
          loan_type: "personal" | "business" | "agriculture" | "housing" | "education" | "vehicle" | "gold";
          amount: number;
          disbursed_amount: number;
          interest_rate: number;
          tenure_months: number;
          repayment_type: "emi" | "flat" | "bullet";
          purpose: string;
          status: "pending" | "approved" | "disbursed" | "closed" | "npa";
          emi_amount: number;
          outstanding_balance: number;
          next_due_date: string | null;
          guarantor_name: string | null;
          guarantor_phone: string | null;
          collateral: string | null;
          approved_by: string | null;
          disbursed_at: string | null;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["loans"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["loans"]["Insert"]>;
      };
      loan_repayments: {
        Row: {
          id: string;
          loan_id: string;
          installment_no: number;
          due_date: string;
          paid_date: string | null;
          principal_due: number;
          interest_due: number;
          emi_amount: number;
          paid_amount: number;
          penalty: number;
          status: "pending" | "paid" | "overdue" | "partial";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["loan_repayments"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["loan_repayments"]["Insert"]>;
      };
      deposits: {
        Row: {
          id: string;
          deposit_id: string;
          member_id: string;
          deposit_type: "savings" | "fd" | "rd" | "mis";
          amount: number;
          current_balance: number;
          interest_rate: number;
          tenure_months: number | null;
          maturity_date: string | null;
          maturity_amount: number | null;
          nominee_name: string;
          nominee_relation: string;
          status: "active" | "matured" | "closed" | "premature_closed";
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["deposits"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["deposits"]["Insert"]>;
      };
      deposit_transactions: {
        Row: {
          id: string;
          deposit_id: string;
          transaction_type: "credit" | "debit" | "interest";
          amount: number;
          balance_after: number;
          narration: string;
          date: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["deposit_transactions"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["deposit_transactions"]["Insert"]>;
      };
      passbook: {
        Row: {
          id: string;
          member_id: string;
          date: string;
          transaction_type: "loan_disbursement" | "loan_repayment" | "deposit" | "withdrawal" | "interest" | "dividend" | "fee" | "other";
          reference_id: string | null;
          reference_type: string | null;
          debit: number;
          credit: number;
          balance: number;
          narration: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["passbook"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["passbook"]["Insert"]>;
      };
      accounts: {
        Row: {
          id: string;
          code: string;
          name: string;
          type: "asset" | "liability" | "income" | "expense" | "equity";
          parent_id: string | null;
          opening_balance: number;
          current_balance: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["accounts"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["accounts"]["Insert"]>;
      };
      vouchers: {
        Row: {
          id: string;
          voucher_no: string;
          voucher_type: "receipt" | "payment" | "journal" | "contra";
          date: string;
          amount: number;
          narration: string;
          debit_account_id: string;
          credit_account_id: string;
          reference_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["vouchers"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["vouchers"]["Insert"]>;
      };
      staff: {
        Row: {
          id: string;
          employee_id: string;
          name: string;
          phone: string;
          email: string | null;
          role: "manager" | "accountant" | "loan_officer" | "cashier" | "clerk";
          department: string | null;
          salary: number;
          join_date: string;
          status: "active" | "inactive";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["staff"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["staff"]["Insert"]>;
      };
      expenses: {
        Row: {
          id: string;
          date: string;
          category: string;
          description: string;
          amount: number;
          paid_to: string | null;
          payment_mode: "cash" | "bank" | "upi";
          voucher_no: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["expenses"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["expenses"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
