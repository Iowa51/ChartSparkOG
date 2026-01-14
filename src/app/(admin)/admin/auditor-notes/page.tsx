"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    MessageSquare,
    Search,
    AlertTriangle,
    Flag,
    CheckCircle,
    Clock,
    User,
} from "lucide-react";

interface AuditFlag {
    id: string;
    submission_id: string;
    flag_type: string;
    severity: string;
    description: string;
    created_at: string;
    resolved_at: string | null;
    users: { first_name: string; last_name: string } | null;
    submissions: {
        cpt_code: string;
        patients: { first_name: string; last_name: string } | null;
    } | null;
}

export default function AdminAuditorNotesPage() {
    const supabase = createClient();
    const [flags, setFlags] = useState<AuditFlag[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [severityFilter, setSeverityFilter] = useState<string>("ALL");
    const [organizationId, setOrganizationId] = useState<string | null>(null);

    useEffect(() => {
        fetchCurrentUserOrg();
    }, []);

    const fetchCurrentUserOrg = async () => {
        if (!supabase) {
            // Demo mode - use demo data
            setLoading(false);
            return;
        }
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('users')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (profile?.organization_id) {
                setOrganizationId(profile.organization_id);
                fetchFlags(profile.organization_id);
            }
        }
    };

    const fetchFlags = async (orgId: string) => {
        if (!supabase) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('audit_flags')
                .select(`
                    *,
                    users(first_name, last_name),
                    submissions(
                        cpt_code,
                        patients(first_name, last_name)
                    )
                `)
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setFlags(data || []);
        } catch (error) {
            console.error("Error fetching flags:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (flagId: string) => {
        if (!supabase) return;
        try {
            const { error } = await supabase
                .from('audit_flags')
                .update({ resolved_at: new Date().toISOString() })
                .eq('id', flagId);

            if (error) throw error;
            if (organizationId) fetchFlags(organizationId);
        } catch (error) {
            console.error("Error resolving flag:", error);
        }
    };

    const filteredFlags = flags.filter(flag => {
        const matchesSearch =
            flag.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            flag.flag_type.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSeverity = severityFilter === "ALL" || flag.severity === severityFilter;
        return matchesSearch && matchesSeverity;
    });

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'critical':
                return <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700"><AlertTriangle className="h-3 w-3" /> Critical</span>;
            case 'high':
                return <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700"><Flag className="h-3 w-3" /> High</span>;
            case 'medium':
                return <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700"><Flag className="h-3 w-3" /> Medium</span>;
            case 'low':
                return <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600"><Flag className="h-3 w-3" /> Low</span>;
            default:
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">{severity}</span>;
        }
    };

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Auditor Notes & Flags
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Review compliance issues flagged by auditors
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {flags.length}
                    </p>
                    <p className="text-sm text-slate-500">Total Flags</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-2xl font-bold text-red-600">
                        {flags.filter(f => f.severity === 'critical' && !f.resolved_at).length}
                    </p>
                    <p className="text-sm text-slate-500">Critical Unresolved</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-2xl font-bold text-amber-600">
                        {flags.filter(f => !f.resolved_at).length}
                    </p>
                    <p className="text-sm text-slate-500">Pending Review</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-2xl font-bold text-emerald-600">
                        {flags.filter(f => f.resolved_at).length}
                    </p>
                    <p className="text-sm text-slate-500">Resolved</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search flags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                </div>
                <div className="flex gap-2">
                    {['ALL', 'critical', 'high', 'medium', 'low'].map((sev) => (
                        <button
                            key={sev}
                            onClick={() => setSeverityFilter(sev)}
                            className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${severityFilter === sev
                                ? sev === 'critical' ? 'bg-red-600 text-white' :
                                    sev === 'high' ? 'bg-orange-600 text-white' :
                                        sev === 'medium' ? 'bg-amber-600 text-white' :
                                            'bg-slate-900 text-white'
                                : 'bg-white dark:bg-slate-900 text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            {sev === 'ALL' ? 'All' : sev.charAt(0).toUpperCase() + sev.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Flags List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-12 text-slate-500">Loading flags...</div>
                ) : filteredFlags.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
                        <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No auditor flags found</p>
                        <p className="text-sm text-slate-400 mt-1">
                            Flags from auditors will appear here when they review submissions
                        </p>
                    </div>
                ) : (
                    filteredFlags.map((flag) => (
                        <div
                            key={flag.id}
                            className={`bg-white dark:bg-slate-900 rounded-2xl border p-6 ${flag.resolved_at
                                ? 'border-slate-200 dark:border-slate-800 opacity-60'
                                : flag.severity === 'critical'
                                    ? 'border-red-200 dark:border-red-900'
                                    : 'border-amber-200 dark:border-amber-900'
                                }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        {getSeverityBadge(flag.severity)}
                                        <span className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded">
                                            {flag.flag_type}
                                        </span>
                                        {flag.resolved_at && (
                                            <span className="flex items-center gap-1 px-2 py-1 text-xs text-emerald-600">
                                                <CheckCircle className="h-3 w-3" /> Resolved
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-slate-900 dark:text-white font-medium mb-2">
                                        {flag.description}
                                    </p>
                                    <div className="flex items-center gap-4 text-sm text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <User className="h-4 w-4" />
                                            {flag.users?.first_name} {flag.users?.last_name}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            {new Date(flag.created_at).toLocaleDateString()}
                                        </span>
                                        {flag.submissions && (
                                            <span>
                                                CPT: {flag.submissions.cpt_code} •
                                                Patient: {flag.submissions.patients?.first_name} {flag.submissions.patients?.last_name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {!flag.resolved_at && (
                                    <button
                                        onClick={() => handleResolve(flag.id)}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-xl font-medium transition-colors"
                                    >
                                        Mark Resolved
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
