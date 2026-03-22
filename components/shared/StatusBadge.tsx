"use client";

import { cn } from "@/lib/utils";

type Status =
  | "active"
  | "inactive"
  | "suspended"
  | "pending"
  | "approved"
  | "disbursed"
  | "closed"
  | "npa"
  | "matured"
  | "premature_closed"
  | "paid"
  | "overdue"
  | "partial"
  | "open"
  | string;

const statusConfig: Record<string, { label: string; className: string }> = {
  active:          { label: "Active",           className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  inactive:        { label: "Inactive",         className: "bg-gray-100 text-gray-600 border-gray-200" },
  suspended:       { label: "Suspended",        className: "bg-red-100 text-red-700 border-red-200" },
  pending:         { label: "Pending",          className: "bg-amber-100 text-amber-700 border-amber-200" },
  approved:        { label: "Approved",         className: "bg-blue-100 text-blue-700 border-blue-200" },
  disbursed:       { label: "Disbursed",        className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  closed:          { label: "Closed",           className: "bg-gray-100 text-gray-600 border-gray-200" },
  npa:             { label: "NPA",              className: "bg-red-100 text-red-700 border-red-200" },
  matured:         { label: "Matured",          className: "bg-purple-100 text-purple-700 border-purple-200" },
  premature_closed:{ label: "Premature Closed", className: "bg-orange-100 text-orange-700 border-orange-200" },
  paid:            { label: "Paid",             className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  overdue:         { label: "Overdue",          className: "bg-red-100 text-red-700 border-red-200" },
  partial:         { label: "Partial",          className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  open:            { label: "Open",             className: "bg-blue-100 text-blue-700 border-blue-200" },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status.replace(/_/g, " "),
    className: "bg-gray-100 text-gray-600 border-gray-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
