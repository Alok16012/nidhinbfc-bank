"use client";

import { use, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { PassbookPrint } from "@/components/passbook/PassbookPrint";
import { PassbookPrinterProfile, getDefaultProfile } from "@/lib/passbook-print";
import { formatDateShort } from "@/lib/utils";

interface PrintPageProps {
  params: Promise<{ memberId: string }>;
  searchParams: Promise<{ tab?: string; size?: string }>;
}

export default function PrintPassbookPage({ params, searchParams }: PrintPageProps) {
  const resolvedParams = use(params);
  const resolvedSearch = use(searchParams);
  const memberId = resolvedParams.memberId;
  const activeTab = resolvedSearch.tab || "all";
  const printSize: "plq35" | "a5" =
    resolvedSearch.size === "a5" ? "a5" : "plq35";

  const [member, setMember] = useState<any>(null);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PassbookPrinterProfile>(() =>
    getDefaultProfile(printSize)
  );

  useEffect(() => {
    const supabase = createClient();

    supabase.from("members").select("*").eq("id", memberId).single().then(({ data }) => {
      setMember(data);
      if (data) {
        supabase
          .from("deposits")
          .select("id, deposit_type, deposit_no, amount, status, maturity_date, maturity_amount, interest_rate, tenure_months, type, monthly_amount, nominee_name")
          .eq("member_id", memberId)
          .then(({ data: deps }) => setDeposits(deps || []));
      }
    });

    supabase
      .from("passbook")
      .select("*")
      .eq("member_id", memberId)
      .order("transaction_date", { ascending: true })
      .then(({ data }) => {
        setEntries(data || []);
        setLoading(false);
      });
  }, [memberId]);

  // Load saved printer profile
  useEffect(() => {
    try {
      const saved = localStorage.getItem("passbook-printer-profile");
      if (saved) {
        setProfile((prev) => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch {}
  }, []);

  const handleSaveProfile = (newProfile: Partial<PassbookPrinterProfile>) => {
    const updated = { ...profile, ...newProfile };
    setProfile(updated);
    localStorage.setItem("passbook-printer-profile", JSON.stringify(updated));
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading passbook...</p>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-slate-600">Member not found</p>
      </div>
    );
  }

  // Transform entries to PassbookTransaction format
  const transactions = entries.map((e, idx) => ({
    serialNumber: idx + 1,
    branch: "HEADOFFICE",
    date: e.transaction_date || e.date || "",
    narration: e.narration || "--",
    credit: e.credit || null,
    debit: e.debit || null,
    balance: e.balance || 0,
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toolbar */}
      <div className="no-print bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-slate-700">
              Print Passbook: {member.name}
            </h1>
            <span className="text-xs text-slate-500">
              {member.member_id} | {activeTab.toUpperCase()} | {printSize.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/passbook/${memberId}/settings?tab=${activeTab}`}
              className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Printer Settings
            </a>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Print Preview */}
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <PassbookPrint
            member={{
              name: member.name,
              member_id: member.member_id,
              member_no: member.member_no,
              phone: member.phone,
              address: member.address,
              father_name: member.father_name,
              nominee_name: member.nominee_name,
              nominee_relation: member.nominee_relation,
              photo_url: member.photo_url,
              join_date: member.join_date,
            }}
            deposits={deposits}
            transactions={transactions}
            printSize={printSize}
            printerProfile={profile}
            onPrint={handlePrint}
          />
        </div>
      </div>
    </div>
  );
}
