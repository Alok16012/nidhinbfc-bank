"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Search } from "lucide-react";
import { useMembers } from "@/lib/hooks/useMembers";
import { PageHeader } from "@/components/shared/PageHeader";
import { getInitials } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";

export default function PassbookIndexPage() {
  const router = useRouter();
  const { members, loading } = useMembers();
  const [search, setSearch] = useState("");

  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.member_id.toLowerCase().includes(search.toLowerCase()) ||
    m.phone.includes(search)
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Passbook" description="Select a member to view their passbook" />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white shadow-sm"
          placeholder="Search by name, member ID, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Loading members...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">No members found</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map((member) => (
              <button
                key={member.id}
                onClick={() => router.push(`/passbook/${member.id}`)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold flex-shrink-0">
                    {getInitials(member.name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{member.name}</p>
                    <p className="text-xs text-slate-400">{member.member_id} · {member.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={member.status} />
                  <BookOpen className="h-4 w-4 text-slate-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
