"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    UserCheck,
    Search,
    Building2,
    CheckCircle2,
    X,
    Plus,
} from "lucide-react";

interface Auditor {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    is_active: boolean;
    assigned_orgs: { id: string; name: string }[];
}

interface Organization {
    id: string;
    name: string;
}

export default function AuditorsPage() {
    const supabase = createClient();
    const [auditors, setAuditors] = useState<Auditor[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedAuditor, setSelectedAuditor] = useState<Auditor | null>(null);
    const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Get all auditors
            const { data: auditorsData, error: auditorsError } = await supabase
                .from('users')
                .select('id, email, first_name, last_name, is_active')
                .eq('role', 'AUDITOR')
                .order('created_at', { ascending: false });

            if (auditorsError) throw auditorsError;

            // Get all organizations
            const { data: orgsData, error: orgsError } = await supabase
                .from('organizations')
                .select('id, name')
                .eq('is_active', true)
                .order('name');

            if (orgsError) throw orgsError;
            setOrganizations(orgsData || []);

            // Get auditor assignments
            const { data: assignmentsData, error: assignmentsError } = await supabase
                .from('auditor_organizations')
                .select('auditor_id, organization_id, organizations(id, name)')
                .eq('is_active', true);

            if (assignmentsError) throw assignmentsError;

            // Map assignments to auditors
            const auditorsWithOrgs = (auditorsData || []).map((auditor) => {
                const assignments = (assignmentsData || []).filter((a: any) => a.auditor_id === auditor.id);
                return {
                    ...auditor,
                    assigned_orgs: assignments.map((a: any) => ({
                        id: a.organizations?.id,
                        name: a.organizations?.name,
                    })).filter((o: any) => o.id),
                };
            });

            setAuditors(auditorsWithOrgs);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAssignModal = (auditor: Auditor) => {
        setSelectedAuditor(auditor);
        setSelectedOrgs(auditor.assigned_orgs.map(o => o.id));
        setShowAssignModal(true);
    };

    const handleToggleOrg = (orgId: string) => {
        setSelectedOrgs(prev =>
            prev.includes(orgId)
                ? prev.filter(id => id !== orgId)
                : [...prev, orgId]
        );
    };

    const handleSaveAssignments = async () => {
        if (!selectedAuditor) return;

        try {
            // Get current user for assigned_by
            const { data: { user } } = await supabase.auth.getUser();

            // Delete existing assignments for this auditor
            await supabase
                .from('auditor_organizations')
                .delete()
                .eq('auditor_id', selectedAuditor.id);

            // Insert new assignments
            if (selectedOrgs.length > 0) {
                const { error } = await supabase
                    .from('auditor_organizations')
                    .insert(
                        selectedOrgs.map(orgId => ({
                            auditor_id: selectedAuditor.id,
                            organization_id: orgId,
                            assigned_by: user?.id,
                            is_active: true,
                        }))
                    );

                if (error) throw error;
            }

            setShowAssignModal(false);
            setSelectedAuditor(null);
            fetchData();
        } catch (error) {
            console.error("Error saving assignments:", error);
            alert("Failed to save assignments");
        }
    };

    const filteredAuditors = auditors.filter(auditor =>
        auditor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (auditor.first_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (auditor.last_name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                        Auditors
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Manage auditor assignments to organizations
                    </p>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 mb-6">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Note:</strong> Auditors are created with the AUDITOR role from the Users page.
                    Use this page to assign auditors to organizations they can review.
                </p>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search auditors..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                </div>
            </div>

            {/* Auditors Grid */}
            {loading ? (
                <div className="text-center py-12 text-slate-500">Loading auditors...</div>
            ) : filteredAuditors.length === 0 ? (
                <div className="text-center py-12">
                    <UserCheck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No auditors found</p>
                    <p className="text-sm text-slate-400 mt-1">
                        Create users with AUDITOR role from the Users page
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAuditors.map((auditor) => (
                        <div
                            key={auditor.id}
                            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                                        <UserCheck className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white">
                                            {auditor.first_name || auditor.last_name
                                                ? `${auditor.first_name || ''} ${auditor.last_name || ''}`.trim()
                                                : 'No Name'}
                                        </p>
                                        <p className="text-xs text-slate-500">{auditor.email}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${auditor.is_active
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                                    }`}>
                                    {auditor.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            <div className="mb-4">
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                                    Assigned Organizations ({auditor.assigned_orgs.length})
                                </p>
                                {auditor.assigned_orgs.length === 0 ? (
                                    <p className="text-sm text-slate-400 italic">No organizations assigned</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {auditor.assigned_orgs.map((org) => (
                                            <span
                                                key={org.id}
                                                className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg"
                                            >
                                                {org.name}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => handleOpenAssignModal(auditor)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-400 rounded-xl font-medium transition-colors"
                            >
                                <Building2 className="h-4 w-4" />
                                Manage Assignments
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Assign Modal */}
            {showAssignModal && selectedAuditor && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    Assign Organizations
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    {selectedAuditor.first_name} {selectedAuditor.last_name}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                Select the organizations this auditor can review:
                            </p>
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                                {organizations.map((org) => (
                                    <label
                                        key={org.id}
                                        className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${selectedOrgs.includes(org.id)
                                                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                                                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedOrgs.includes(org.id)}
                                            onChange={() => handleToggleOrg(org.id)}
                                            className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500"
                                        />
                                        <Building2 className="h-5 w-5 text-slate-400" />
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {org.name}
                                        </span>
                                        {selectedOrgs.includes(org.id) && (
                                            <CheckCircle2 className="h-5 w-5 text-amber-600 ml-auto" />
                                        )}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setShowAssignModal(false)}
                                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveAssignments}
                                className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium transition-colors"
                            >
                                Save Assignments
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
