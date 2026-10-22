"use client";

import Link from "next/link";
import { UserPlus, Download } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { MemberTable } from "@/components/members/MemberTable";
import { ExportButton } from "@/components/shared/ExportButton";
import { useMembers } from "@/lib/hooks/useMembers";
import { Can } from "@/components/shared/Can";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { MemberCards } from "@/components/mobile/lists";
import { SkeletonList, StatStrip } from "@/components/mobile/ui";

export default function MembersPage() {
  // Render only the layout for this screen; both at once doubled the DOM on long lists
  const mobile = useIsMobile();
  const { members, loading, refetch } = useMembers();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Members"
        description={`${members.length} registered members`}
      >
        <ExportButton
          onExportCSV={() => { }}
          onExportExcel={() => { }}
        />
        <Can permission="members.manage">
          <Link
            href="/members/new"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm"
          >
            <UserPlus className="h-4 w-4" />
            <span className="lg:hidden">Add</span><span className="hidden lg:inline">New Member</span>
          </Link>
        </Can>
      </PageHeader>

      {/* Phones: snapshot strip + member cards */}
      {mobile !== false && (
<div className="lg:hidden space-y-3">
        <StatStrip items={[
          { value: members.length, label: "Members" },
          { value: members.filter((m) => m.status === "active").length, label: "Active", color: "var(--success-text)" },
          { value: members.filter((m) => m.status !== "active").length, label: "Inactive", color: "var(--error-text)" },
        ]} />
        {loading ? <SkeletonList /> : <MemberCards members={members} />}
      </div>
)}

      {/* Stats row */}
      {mobile !== true && (
<div className="hidden lg:grid grid-cols-3 gap-4">
        {[
          { label: "Total Members", value: members.length, color: "text-blue-600" },
          { label: "Active", value: members.filter((m) => m.status === "active").length, color: "text-emerald-600" },
          { label: "Inactive/Suspended", value: members.filter((m) => m.status !== "active").length, color: "text-red-500" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>
)}

      {mobile !== true && (
<div className="hidden lg:block">
        <MemberTable members={members} loading={loading} onDeleteSuccess={refetch} />
      </div>
)}
    </div>
  );
}
