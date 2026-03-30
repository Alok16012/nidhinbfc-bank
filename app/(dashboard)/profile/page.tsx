"use client";

import { useRole } from "@/lib/hooks/useRole";
import { PageHeader } from "@/components/shared/PageHeader";
import {
    User, Mail, Phone, ShieldCheck, Calendar,
    Building2, Wallet, UserCheck, CreditCard
} from "lucide-react";
import { formatINR, formatDate, getInitials } from "@/lib/utils";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
    const { role, name, email, userId, isAdmin, loading: roleLoading } = useRole();
    const [staffData, setStaffData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        if (!userId) return;

        supabase
            .from("staff")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle()
            .then(({ data }) => {
                setStaffData(data);
                setLoading(false);
            });
    }, [userId, supabase]);

    if (roleLoading || loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const roleLabels: Record<string, string> = {
        admin: "Administrator",
        manager: "Manager",
        staff: "Staff Member",
    };

    return (
        <div className="space-y-6 pb-10">
            <PageHeader
                title="My Profile"
                description="View and manage your personal professional information"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Avatar & Basic Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="h-24 bg-gradient-to-r from-blue-600 to-blue-800"></div>
                        <div className="px-6 pb-6">
                            <div className="relative -mt-12 mb-4">
                                <div className="h-24 w-24 rounded-2xl bg-white p-1 shadow-md">
                                    <div className="h-full w-full rounded-xl bg-slate-800 flex items-center justify-center text-white text-3xl font-bold">
                                        {getInitials(name || "User")}
                                    </div>
                                </div>
                                <div className="absolute bottom-1 right-[-4px] h-6 w-6 rounded-full bg-emerald-500 border-4 border-white"></div>
                            </div>

                            <h2 className="text-xl font-bold text-slate-800">{name || "Staff Member"}</h2>
                            <p className="text-sm text-slate-500 mb-4">{email}</p>

                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isAdmin ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                                }`}>
                                <ShieldCheck className="h-3.5 w-3.5" />
                                {roleLabels[role] || role}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider opacity-60">Contact Details</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                    <Mail className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Email Address</p>
                                    <p className="text-sm font-medium text-slate-700">{email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                    <Phone className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Phone Number</p>
                                    <p className="text-sm font-medium text-slate-700">{staffData?.phone || "Not Set"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Professional Details */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-800">Professional Information</h3>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Employee ID: {staffData?.employee_id || "N/A"}</span>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Building2 className="h-4 w-4 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Department</span>
                                    </div>
                                    <p className="text-lg font-bold text-slate-800">{staffData?.department || "General Operations"}</p>
                                </div>

                                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Calendar className="h-4 w-4 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date Joined</span>
                                    </div>
                                    <p className="text-lg font-bold text-slate-800">{staffData?.join_date ? formatDate(staffData.join_date) : "N/A"}</p>
                                </div>

                                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Wallet className="h-4 w-4 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Salary</span>
                                    </div>
                                    <p className="text-lg font-bold text-slate-800">{formatINR(staffData?.salary || 0)}</p>
                                </div>

                                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                                    <div className="flex items-center gap-3 mb-2">
                                        <UserCheck className="h-4 w-4 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Employment Status</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <p className="text-lg font-bold text-slate-800">Active</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 p-6 rounded-2xl bg-blue-900 text-white relative overflow-hidden">
                                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h4 className="text-lg font-bold">Role Permissions</h4>
                                        <p className="text-blue-200 text-xs">Based on your current role as {roleLabels[role] || role}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {isAdmin && <span className="px-2.5 py-1 bg-white/20 rounded-lg text-[10px] font-bold uppercase backdrop-blur-sm">Full Access</span>}
                                        <span className="px-2.5 py-1 bg-white/20 rounded-lg text-[10px] font-bold uppercase backdrop-blur-sm">Loan Records</span>
                                        <span className="px-2.5 py-1 bg-white/20 rounded-lg text-[10px] font-bold uppercase backdrop-blur-sm">Member Profiles</span>
                                        <span className="px-2.5 py-1 bg-white/20 rounded-lg text-[10px] font-bold uppercase backdrop-blur-sm">Collections</span>
                                    </div>
                                </div>
                                <div className="absolute -right-4 -bottom-10 opacity-10">
                                    <ShieldCheck className="h-32 w-32" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Account Security Preview */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                <CreditCard className="h-6 w-6" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-800">Account Security</h4>
                                <p className="text-xs text-slate-500">Manage your login credentials and security preferences</p>
                            </div>
                        </div>
                        <button
                            className="px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                            onClick={() => alert("Security settings are managed in the main Settings panel.")}
                        >
                            Security Settings
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
