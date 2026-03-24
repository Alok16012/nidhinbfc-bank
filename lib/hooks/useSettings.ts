import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface AppSettings {
  savings_rate: number;
  fd_rate: number;
  rd_rate: number;
  drd_rate: number;
  mis_rate: number;
  personal_loan_rate: number;
  business_loan_rate: number;
  gold_loan_rate: number;
  penalty_rate: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  savings_rate: 4.0,
  fd_rate: 7.5,
  rd_rate: 7.0,
  drd_rate: 7.0,
  mis_rate: 7.25,
  personal_loan_rate: 12.0,
  business_loan_rate: 14.0,
  gold_loan_rate: 10.0,
  penalty_rate: 2.0,
};

export function useSettings() {
  const supabase = createClient();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data) {
          setSettings({
            savings_rate: Number(data.savings_rate),
            fd_rate: Number(data.fd_rate),
            rd_rate: Number(data.rd_rate),
            drd_rate: Number(data.drd_rate),
            mis_rate: Number(data.mis_rate),
            personal_loan_rate: Number(data.personal_loan_rate),
            business_loan_rate: Number(data.business_loan_rate),
            gold_loan_rate: Number(data.gold_loan_rate),
            penalty_rate: Number(data.penalty_rate),
          });
        }
        setLoading(false);
      });
  }, []);

  const saveSettings = async (updated: AppSettings) => {
    setSaving(true);
    setError("");
    setSuccess(false);

    const { error: err } = await supabase
      .from("app_settings")
      .upsert({ id: 1, ...updated, updated_at: new Date().toISOString() });

    if (err) {
      setError(err.message);
    } else {
      setSettings(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  };

  // Returns default rate for a deposit type
  const getDepositRate = (depositType: string): number => {
    switch (depositType) {
      case "savings": return settings.savings_rate;
      case "fd": return settings.fd_rate;
      case "rd": return settings.rd_rate;
      case "drd": return settings.drd_rate;
      case "mis": return settings.mis_rate;
      default: return settings.fd_rate;
    }
  };

  return { settings, loading, saving, error, success, saveSettings, getDepositRate };
}
