"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    FileText,
    Search,
    CheckCircle,
    XCircle,
    Clock,
    Eye,
    X,
    AlertTriangle,
} from "lucide-react";

interface Submission {
    id: string;
    cpt_code: string;
    icd10_codes: string[] | null;
    billing_amount: number;
    status: string;
    created_at: string;
    audited_at: string | null;
    auditor_comments: string | null;
    patients: { first_name: string; last_name: string } | null;
    users: { first_name: string; last_name: string } | null;
}

// Demo submissions for fallback when database unavailable
const demoSubmissions: Submission[] = [
    {
        id: "demo-sub-1",
        cpt_code: "99214",
        icd10_codes: ["F41.1", "F32.1"],
        billing_amount: 165.00,
        status: "pending_approval",
        created_at: new Date().toISOString(),
        audited_at: new Date().toISOString(),
        auditor_comments: "Documentation reviewed - ready for approval",
        patients: { first_name: "Sarah", last_name: "Johnson" },
        users: { first_name: "Dr. Sarah", last_name: "K." }
    },
    {
        id: "demo-sub-2",
        cpt_code: "99205",
        icd10_codes: ["F41.9"],
        billing_amount: 285.00,
        status: "pending_audit",
        created_at: new Date(Date.now() - 86400000).toISOString(),
        audited_at: null,
        auditor_comments: null,
        patients: { first_name: "Michael", last_name: "Chen" },
        users: { first_name: "Dr. Sarah", last_name: "K." }
    },
    {
        id: "demo-sub-3",
        cpt_code: "90837",
        icd10_codes: ["F33.1"],
        billing_amount: 165.00,
        status: "flagged",
        created_at: new Date(Date.now() - 172800000).toISOString(),
        audited_at: new Date(Date.now() - 86400000).toISOString(),
        auditor_comments: "Missing documentation for medical necessity",
        patients: { first_name: "Emily", last_name: "Rodriguez" },
        users: { first_name: "Dr. Michael", last_name: "R." }
    },
    {
        id: "demo-sub-4",
        cpt_code: "99213",
        icd10_codes: ["F31.9"],
        billing_amount: 110.00,
        status: "approved",
        created_at: new Date(Date.now() - 259200000).toISOString(),
        audited_at: new Date(Date.now() - 172800000).toISOString(),
        auditor_comments: null,
        patients: { first_name: "James", last_name: "Wilson" },
        users: { first_name: "Dr. Sarah", last_name: "K." }
    },
    {
        id: "demo-sub-5",
        cpt_code: "99214",
        icd10_codes: ["F41.1", "F42.2"],
        billing_amount: 165.00,
        status: "rejected",
        created_at: new Date(Date.now() - 345600000).toISOString(),
        audited_at: new Date(Date.now() - 259200000).toISOString(),
        auditor_comments: "CPT code does not match documentation level",
        patients: { first_name: "Lisa", last_name: "Anderson" },
        users: { first_name: "Dr. Lisa", last_name: "T." }
    },
];

export default function AdminSubmissionsPage() {
    const supabase = createClient();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [organizationId, setOrganizationId] = useState<string | null>(null);
    const [isDemo, setIsDemo] = useState(false);

    useEffect(() => {
        fetchCurrentUserOrg();
    }, []);

    const fetchCurrentUserOrg = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile, error } = await supabase
                    .from('users')
                    .select('organization_id')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;

                if (profile?.organization_id) {
                    setOrganizationId(profile.organization_id);
                    fetchSubmissions(profile.organization_id);
                } else {
                    console.log("[Admin Submissions] No organization found, using demo data");
                    setIsDemo(true);
                    setSubmissions(demoSubmissions);
                    setLoading(false);
                }
            } else {
                console.log("[Admin Submissions] No user session, using demo data");
                setIsDemo(true);
                setSubmissions(demoSubmissions);
                setLoading(false);
            }
        } catch (error) {
            console.error("[Admin Submissions] Error fetching org, using demo data:", error);
            setIsDemo(true);
            setSubmissions(demoSubmissions);
            setLoading(false);
        }
    };

    const fetchSubmissions = async (orgId: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('submissions')
                .select(`
                    *,
                    patients(first_name, last_name),
                    users(first_name, last_name)
                `)
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data && data.length > 0) {
                setSubmissions(data);
            } else {
                console.log("[Admin Submissions] No submissions in database, using demo data");
                setIsDemo(true);
                setSubmissions(demoSubmissions);
            }
        } catch (error) {
            console.error("[Admin Submissions] Error fetching submissions, using demo data:", error);
            setIsDemo(true);
            setSubmissions(demoSubmissions);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (submissionId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from('submissions')
                .update({
                    status: 'approved',
                    approved_by: user?.id,
                    approved_at: new Date().toISOString(),
                })
                .eq('id', submissionId);

            if (error) throw error;
            if (organizationId) fetchSubmissions(organizationId);
            setSelectedSubmission(null);
        } catch (error) {
            console.error("Error approving submission:", error);
            alert("Failed to approve submission");
        }
    };

    const handleReject = async (submissionId: string) => {
        const reason = prompt("Enter rejection reason:");
        if (!reason) return;

        try {
            const { error } = await supabase
                .from('submissions')
                .update({
                    status: 'rejected',
                    auditor_comments: reason,
                })
                .eq('id', submissionId);

            if (error) throw error;
            if (organizationId) fetchSubmissions(organizationId);
            setSelectedSubmission(null);
        } catch (error) {
            console.error("Error rejecting submission:", error);
            alert("Failed to reject submission");
        }
    };

    const filteredSubmissions = submissions.filter(sub => {
        const matchesSearch =
            (sub.patients?.first_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (sub.patients?.last_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            sub.cpt_code.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "ALL" || sub.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending_audit':
                return <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700"><Clock className="h-3 w-3" /> Pending Audit</span>;
            case 'pending_approval':
                return <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700"><Clock className="h-3 w-3" /> Pending Approval</span>;
            case 'approved':
                return <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700"><CheckCircle className="h-3 w-3" /> Approved</span>;
            case 'rejected':
                return <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700"><XCircle className="h-3 w-3" /> Rejected</span>;
            case 'flagged':
                return <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700"><AlertTriangle className="h-3 w-3" /> Flagged</span>;
            default:
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">{status}</span>;
        }
    };

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                        Submissions
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Review and approve billing submissions
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by patient or CPT..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div className="flex gap-2">
                    {['ALL', 'pending_audit', 'pending_approval', 'approved', 'rejected', 'flagged'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${statusFilter === status
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                : 'bg-white dark:bg-slate-900 text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            {status === 'ALL' ? 'All' : status.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Patient</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Provider</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">CPT</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                    Loading submissions...
                                </td>
                            </tr>
                        ) : filteredSubmissions.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                    No submissions found
                                </td>
                            </tr>
                        ) : (
                            filteredSubmissions.map((sub) => (
                                <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                        {sub.patients?.first_name} {sub.patients?.last_name}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                        {sub.users?.first_name} {sub.users?.last_name}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-400">
                                        {sub.cpt_code}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                        ${sub.billing_amount?.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(sub.status)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {new Date(sub.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => setSelectedSubmission(sub)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Detail Modal */}
            {selectedSubmission && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                Submission Details
                            </h2>
                            <button
                                onClick={() => setSelectedSubmission(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Patient</p>
                                    <p className="font-medium text-slate-900 dark:text-white">
                                        {selectedSubmission.patients?.first_name} {selectedSubmission.patients?.last_name}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Provider</p>
                                    <p className="font-medium text-slate-900 dark:text-white">
                                        {selectedSubmission.users?.first_name} {selectedSubmission.users?.last_name}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">CPT Code</p>
                                    <p className="font-mono font-medium text-slate-900 dark:text-white">
                                        {selectedSubmission.cpt_code}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Amount</p>
                                    <p className="font-medium text-slate-900 dark:text-white">
                                        ${selectedSubmission.billing_amount?.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase">ICD-10 Codes</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {(selectedSubmission.icd10_codes || []).map((code, idx) => (
                                        <span key={idx} className="px-2 py-1 text-xs bg-slate-100 rounded">
                                            {code}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            {selectedSubmission.auditor_comments && (
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Auditor Comments</p>
                                    <p className="text-slate-700 dark:text-slate-300 mt-1">
                                        {selectedSubmission.auditor_comments}
                                    </p>
                                </div>
                            )}
                            <div>
                                <p className="text-xs text-slate-500 uppercase">Status</p>
                                {getStatusBadge(selectedSubmission.status)}
                            </div>
                        </div>
                        {(selectedSubmission.status === 'pending_approval' || selectedSubmission.status === 'flagged') && (
                            <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
                                <button
                                    onClick={() => handleReject(selectedSubmission.id)}
                                    className="flex-1 px-4 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                                >
                                    Reject
                                </button>
                                <button
                                    onClick={() => handleApprove(selectedSubmission.id)}
                                    className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
                                >
                                    Approve
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
