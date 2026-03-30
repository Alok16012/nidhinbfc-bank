"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Phone, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate, getInitials } from "@/lib/utils";
import type { Member } from "@/lib/hooks/useMembers";

interface MemberTableProps {
  members: Member[];
  loading?: boolean;
}

export function MemberTable({ members, loading }: MemberTableProps) {
  const [search, setSearch] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete member: ${name}?`)) return;

    try {
      const { error } = await supabase
        .from("members")
        .update({ status: "deleted", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) {
        alert(`Error deleting member: ${error.message}`);
        return;
      }
      router.refresh();
    } catch (err: any) {
      alert(`Unexpected error: ${err.message}`);
    }
  };

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.member_id.toLowerCase().includes(search.toLowerCase()) ||
      m.phone.includes(search)
  );

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
        <p className="text-sm text-slate-400">Loading members...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Search bar */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, member ID or phone..."
          className="flex-1 text-sm outline-none text-slate-700 placeholder:text-slate-400"
        />
        <span className="text-xs text-slate-400">{filtered.length} records</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Member</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">ID</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Phone</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden md:table-cell">Joined</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden lg:table-cell">Share Capital</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Status</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                  No members found
                </td>
              </tr>
            ) : (
              filtered.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                        {getInitials(member.name)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{member.name}</p>
                        <p className="text-xs text-slate-400">{member.email || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{member.member_id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <a href={`tel:${member.phone}`} className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600">
                      <Phone className="h-3.5 w-3.5" />
                      {member.phone}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                    {formatDate(member.created_at)}
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium hidden lg:table-cell">
                    ₹{member.share_capital.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={member.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/members/${member.id}`}
                        className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/members/${member.id}?edit=1`}
                        className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(member.id, member.name)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
