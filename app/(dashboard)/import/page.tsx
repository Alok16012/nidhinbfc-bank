"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { useRole } from "@/lib/hooks/useRole";
import { formatINR } from "@/lib/utils";
import { readXlsxSheets } from "@/lib/import/xlsx";
import {
  DEPOSITOR_SHEET,
  RECOVERY_SHEET,
  parseDepositorSheet,
  parseRecoverySheet,
  type LedgerRecord,
  type MatchableMember,
} from "@/lib/import/ledger-sheet";
import {
  buildDepositPlan,
  buildRecoveryPlan,
  IMPORT_TAG,
  type ExistingDeposit,
  type ExistingLoan,
  type ImportPlan,
  type SkippedRecord,
} from "@/lib/import/plan";
import { fetchAll, runDepositImport, runRecoveryImport, type Progress, type RunResult } from "@/lib/import/execute";

const SKIP_LABELS: Record<SkippedRecord["reason"], string> = {
  matched: "Matched",
  "no-phone": "No mobile number in the sheet",
  "not-found": "No member with this name and mobile",
  ambiguous: "More than one member with this name and mobile",
  "no-entries": "No collection entries in the row",
};

export default function ImportPage() {
  const supabase = createClient();
  const { isAdmin, loading: roleLoading } = useRole();
  const fileInput = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [deposits, setDeposits] = useState<ImportPlan | null>(null);
  const [recovery, setRecovery] = useState<ImportPlan | null>(null);
  const [sheetTotals, setSheetTotals] = useState<{ dep: number; rec: number } | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<{ dep: RunResult; rec: RunResult } | null>(null);
  const [confirming, setConfirming] = useState(false);

  const reset = () => {
    setDeposits(null);
    setRecovery(null);
    setResult(null);
    setProgress(null);
    setError("");
    setSheetTotals(null);
  };

  const analyse = useCallback(
    async (file: File) => {
      reset();
      setFileName(file.name);
      try {
        setBusy("Reading the spreadsheet…");
        const sheets = await readXlsxSheets(await file.arrayBuffer(), [DEPOSITOR_SHEET, RECOVERY_SHEET]);
        const depSheet = sheets.find((s) => s.name === DEPOSITOR_SHEET);
        const recSheet = sheets.find((s) => s.name === RECOVERY_SHEET);
        if (!depSheet || !recSheet) {
          throw new Error(
            `The file must contain both "${DEPOSITOR_SHEET}" and "${RECOVERY_SHEET}" sheets.`
          );
        }
        const depRecords = parseDepositorSheet(depSheet);
        const recRecords = parseRecoverySheet(recSheet);
        const sum = (rows: LedgerRecord[]) => rows.reduce((t, r) => t + r.total, 0);
        setSheetTotals({ dep: sum(depRecords), rec: sum(recRecords) });

        setBusy("Matching members…");
        const members = await fetchAll<MatchableMember>((from, to) =>
          supabase.from("members").select("id, name, phone, member_id").range(from, to)
        );
        const existingDeposits = await fetchAll<ExistingDeposit>((from, to) =>
          supabase
            .from("deposits")
            .select("id, member_id, type, deposit_type, current_balance, deposit_no, open_date")
            .range(from, to)
        );
        const existingLoans = await fetchAll<ExistingLoan>((from, to) =>
          supabase
            .from("loans")
            .select("id, member_id, status, amount, total_paid, outstanding_balance, loan_id, loan_no")
            .range(from, to)
        );

        setBusy("Checking what has already been imported…");
        const depRefs = await fetchAll<{ reference_no: string }>((from, to) =>
          supabase
            .from("deposit_transactions")
            .select("reference_no")
            .like("reference_no", `${IMPORT_TAG}/%`)
            .range(from, to)
        );
        const recRefs = await fetchAll<{ reference_no: string }>((from, to) =>
          supabase
            .from("loan_repayments")
            .select("reference_no")
            .like("reference_no", `${IMPORT_TAG}/%`)
            .range(from, to)
        );

        setDeposits(
          buildDepositPlan({
            records: depRecords,
            members,
            accounts: existingDeposits,
            existingReferences: new Set(depRefs.map((r) => r.reference_no)),
          })
        );
        setRecovery(
          buildRecoveryPlan({
            records: recRecords,
            members,
            accounts: existingLoans,
            existingReferences: new Set(recRefs.map((r) => r.reference_no)),
          })
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not read the file.");
      } finally {
        setBusy("");
      }
    },
    [supabase]
  );

  const runImport = async () => {
    if (!deposits || !recovery) return;
    setConfirming(false);
    setError("");
    setBusy("Importing…");
    try {
      const dep = await runDepositImport(supabase, deposits, setProgress);
      const rec = await runRecoveryImport(supabase, recovery, setProgress);
      setResult({ dep, rec });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy("");
      setProgress(null);
    }
  };

  const pending = useMemo(
    () => (deposits?.totals.entries ?? 0) + (recovery?.totals.entries ?? 0),
    [deposits, recovery]
  );

  if (roleLoading) return <div className="text-center py-20 text-slate-400">Loading…</div>;
  if (!isAdmin) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
        <p className="text-slate-600 font-medium">Import is restricted to Admin users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ledger Import"
        description="Load the DEPOSITOR and RECOVER sheets from the Excel ledger book"
      />

      {/* File picker */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <input
          ref={fileInput}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) analyse(file);
          }}
        />
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={() => fileInput.current?.click()}
            disabled={!!busy}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            Choose Excel file
          </button>
          {fileName && (
            <span className="flex items-center gap-2 text-sm text-slate-600">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              {fileName}
            </span>
          )}
          {busy && (
            <span className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              {busy}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-3">
          The file is read in this browser only — it is never uploaded anywhere. Members are matched
          on name <strong>and</strong> mobile number; nobody new is created.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
      )}

      {progress && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-slate-700">{progress.phase}</span>
            <span className="text-slate-500">
              {progress.done.toLocaleString("en-IN")} / {progress.total.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {deposits && recovery && !result && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <PlanCard title="Deposits" subtitle={DEPOSITOR_SHEET} plan={deposits} sheetTotal={sheetTotals?.dep} />
            <PlanCard title="Recovery" subtitle={RECOVERY_SHEET} plan={recovery} sheetTotal={sheetTotals?.rec} />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            {pending === 0 ? (
              <p className="text-sm text-slate-600">
                Nothing left to import — every matched entry from this file is already in the system.
              </p>
            ) : (
              <>
                <p className="text-sm text-slate-600 mb-4">
                  This will add <strong>{pending.toLocaleString("en-IN")}</strong> collection entries
                  worth{" "}
                  <strong>{formatINR(deposits.totals.amount + recovery.totals.amount)}</strong>, and
                  open{" "}
                  <strong>{deposits.totals.newAccounts + recovery.totals.newAccounts}</strong> new
                  accounts for matched members who have none. Passbook entries are created
                  automatically by the database.
                </p>
                {confirming ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium text-amber-700">
                      This writes to the live database. Continue?
                    </span>
                    <button
                      onClick={runImport}
                      className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                    >
                      Yes, import now
                    </button>
                    <button
                      onClick={() => setConfirming(false)}
                      className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirming(true)}
                    disabled={!!busy}
                    className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                  >
                    Import {pending.toLocaleString("en-IN")} entries
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}

      {result && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h3 className="text-sm font-semibold text-slate-800">Import finished</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              ["Deposit entries", result.dep.entriesInserted.toLocaleString("en-IN")],
              ["Deposit amount", formatINR(result.dep.amount)],
              ["Recovery entries", result.rec.entriesInserted.toLocaleString("en-IN")],
              ["Recovery amount", formatINR(result.rec.amount)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-slate-50 p-3">
                <p className="text-lg font-bold text-slate-800">{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            {result.dep.accountsCreated + result.rec.accountsCreated} new accounts opened.
          </p>
          {[...result.dep.errors, ...result.rec.errors].length > 0 && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm font-semibold text-red-700 mb-1">
                {[...result.dep.errors, ...result.rec.errors].length} problem(s) — re-running the
                import will retry only what is missing
              </p>
              <ul className="text-xs text-red-600 space-y-0.5 max-h-40 overflow-auto">
                {[...result.dep.errors, ...result.rec.errors].map((message, i) => (
                  <li key={i}>{message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlanCard({
  title,
  subtitle,
  plan,
  sheetTotal,
}: {
  title: string;
  subtitle: string;
  plan: ImportPlan;
  sheetTotal?: number;
}) {
  const [showSkipped, setShowSkipped] = useState(false);
  const grouped = useMemo(() => {
    const map = new Map<string, SkippedRecord[]>();
    for (const item of plan.skipped) {
      const list = map.get(item.reason);
      if (list) list.push(item);
      else map.set(item.reason, [item]);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [plan.skipped]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-baseline justify-between mb-4 pb-2 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <span className="text-xs text-slate-400">{subtitle}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          ["Rows in sheet", plan.totals.records.toLocaleString("en-IN")],
          ["Matched members", plan.totals.members.toLocaleString("en-IN")],
          ["Entries to import", plan.totals.entries.toLocaleString("en-IN")],
          ["Amount", formatINR(plan.totals.amount)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="font-bold text-slate-800">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <dl className="mt-4 space-y-1.5 text-xs">
        {plan.totals.newAccounts > 0 && (
          <Row label="New accounts to open" value={plan.totals.newAccounts.toLocaleString("en-IN")} />
        )}
        {plan.totals.duplicateEntries > 0 && (
          <Row
            label="Already imported (skipped)"
            value={plan.totals.duplicateEntries.toLocaleString("en-IN")}
          />
        )}
        {sheetTotal !== undefined && (
          <Row label="Sheet total for all rows" value={formatINR(sheetTotal)} />
        )}
      </dl>

      {plan.skipped.length > 0 && (
        <div className="mt-4 rounded-lg bg-amber-50 border border-amber-100 p-3">
          <button
            onClick={() => setShowSkipped((open) => !open)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-xs font-semibold text-amber-800">
              {plan.skipped.length} row(s) will be left out
            </span>
            <span className="text-xs text-amber-600">{showSkipped ? "Hide" : "Show"}</span>
          </button>
          <ul className="mt-2 space-y-0.5 text-xs text-amber-700">
            {grouped.map(([reason, items]) => (
              <li key={reason}>
                {items.length} — {SKIP_LABELS[reason as SkippedRecord["reason"]] ?? reason}
              </li>
            ))}
          </ul>
          {showSkipped && (
            <div className="mt-3 max-h-60 overflow-auto rounded border border-amber-200 bg-white">
              <table className="w-full text-xs">
                <thead className="bg-amber-100/60 text-amber-900">
                  <tr>
                    <th className="px-2 py-1.5 text-left">Row</th>
                    <th className="px-2 py-1.5 text-left">Name</th>
                    <th className="px-2 py-1.5 text-left">Mobile</th>
                    <th className="px-2 py-1.5 text-right">Amount</th>
                    <th className="px-2 py-1.5 text-left">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-50">
                  {plan.skipped.map((item) => (
                    <tr key={item.record.row}>
                      <td className="px-2 py-1 text-slate-400">{item.record.row}</td>
                      <td className="px-2 py-1 text-slate-700">{item.record.name}</td>
                      <td className="px-2 py-1 text-slate-500">{item.record.rawPhone || "—"}</td>
                      <td className="px-2 py-1 text-right text-slate-600">
                        {formatINR(item.record.total)}
                      </td>
                      <td className="px-2 py-1 text-slate-500">
                        {SKIP_LABELS[item.reason]}
                        {item.hint ? ` — ${item.hint}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-700">{value}</dd>
    </div>
  );
}
