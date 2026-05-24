"use client";

import { CSCard, CSPageHeader, CSBadge, CSButton } from "@/components/cs";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    Search,
    Plus,
    Eye,
    ChevronLeft,
    ChevronRight,
    X,
    Loader2
} from "lucide-react";
import TriageBadge from "@/components/smart-triage/TriageBadge";

interface Patient {
    id: string;
    first_name: string;
    last_name: string;
    preferred_name?: string;
    mrn?: string;
    date_of_birth?: string;
    gender?: string;
    status: 'active' | 'inactive' | 'archived';
    avatar_color?: string;
    email?: string;
    phone?: string;
    created_at: string;
}

const statusBadgeVariant: Record<Patient['status'], 'success' | 'muted' | 'warning'> = {
    active: 'success',
    inactive: 'muted',
    archived: 'warning',
};

export default function PatientsPage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("active");
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({
        total: 0,
        totalPages: 0,
        page: 1,
        limit: 50,
    });

    // Fetch patients from API
    const fetchPatients = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '50',
                status: statusFilter,
            });

            if (searchQuery.trim()) {
                params.append('search', searchQuery.trim());
            }

            const response = await fetch(`/api/patients?${params}`);
            if (!response.ok) {
                throw new Error('Failed to fetch patients');
            }

            const data = await response.json();
            setPatients(data.patients || []);
            setPagination(data.pagination || {
                total: 0,
                totalPages: 0,
                page: 1,
                limit: 50,
            });
        } catch (error) {
            console.error('Error fetching patients:', error);
            setPatients([]);
        } finally {
            setLoading(false);
        }
    }, [page, searchQuery, statusFilter]);

    // Fetch patients on mount and when dependencies change
    useEffect(() => {
        fetchPatients();
    }, [fetchPatients]);

    // Debounced search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (page !== 1) {
                setPage(1); // Reset to first page on new search
            } else {
                fetchPatients();
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const getPatientInitials = (patient: Patient) => {
        return `${patient.first_name[0] || ''}${patient.last_name[0] || ''}`.toUpperCase();
    };

    const getPatientName = (patient: Patient) => {
        if (patient.preferred_name) {
            return `${patient.preferred_name} ${patient.last_name}`;
        }
        return `${patient.first_name} ${patient.last_name}`;
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Not set';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const calculateAge = (dob?: string) => {
        if (!dob) return null;
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    return (
        <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto w-full">
            <CSPageHeader
                title="Patients"
                subtitle="Manage your patient panel"
                actions={
                    <Link href="/patients/new">
                        <CSButton variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                            Add Patient
                        </CSButton>
                    </Link>
                }
            />

            {/* Controls Toolbar */}
            <CSCard className="mb-4">
                <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
                    {/* Search */}
                    <div className="relative flex-1 max-w-lg">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-[var(--cs-text-muted)]" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by Name, MRN, Email, Phone..."
                            className="block w-full pl-10 pr-3 py-2 rounded-md bg-white text-[var(--cs-text-primary)] border border-[var(--cs-border)] placeholder:text-[var(--cs-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--cs-teal)] text-sm transition-colors"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center bg-[var(--cs-teal-xlight)] rounded-md p-0.5 border border-[var(--cs-border)]">
                            {[
                                { value: "active", label: "Active" },
                                { value: "all", label: "All" },
                                { value: "archived", label: "Archived" }
                            ].map((s) => (
                                <button
                                    key={s.value}
                                    onClick={() => setStatusFilter(s.value)}
                                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${statusFilter === s.value
                                        ? "bg-white text-[var(--cs-teal)]"
                                        : "text-[var(--cs-text-muted)] hover:text-[var(--cs-text-primary)]"
                                        }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>

                        {(searchQuery || statusFilter !== 'active') && (
                            <CSButton
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSearchQuery("");
                                    setStatusFilter("active");
                                    setPage(1);
                                }}
                                leftIcon={<X className="h-3 w-3" />}
                            >
                                Clear
                            </CSButton>
                        )}
                    </div>
                </div>
            </CSCard>

            {/* Patient Table Card */}
            <CSCard padding="none">
                <div className="overflow-x-auto">
                    <table className="min-w-full whitespace-nowrap text-left">
                        <thead>
                            <tr className="bg-[var(--cs-teal-xlight)] border-b border-[var(--cs-card-border)]">
                                <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--cs-text-muted)] uppercase tracking-wider">
                                    Patient Name
                                </th>
                                <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--cs-text-muted)] uppercase tracking-wider">
                                    Triage
                                </th>
                                <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--cs-text-muted)] uppercase tracking-wider">
                                    MRN
                                </th>
                                <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--cs-text-muted)] uppercase tracking-wider">
                                    DOB / Age
                                </th>
                                <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--cs-text-muted)] uppercase tracking-wider">
                                    Contact
                                </th>
                                <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--cs-text-muted)] uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--cs-text-muted)] uppercase tracking-wider text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--cs-card-border)]">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="h-7 w-7 text-[var(--cs-teal)] animate-spin" />
                                            <p className="text-sm text-[var(--cs-text-muted)]">Loading patients...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : patients.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center">
                                        <p className="text-sm text-[var(--cs-text-muted)]">No patients found</p>
                                        {searchQuery && (
                                            <p className="text-xs text-[var(--cs-text-muted)] mt-1">
                                                Try adjusting your search or filters
                                            </p>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                patients.map((patient) => (
                                    <tr
                                        key={patient.id}
                                        className="group hover:bg-[var(--cs-teal-xlight)] transition-colors cursor-pointer"
                                    >
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-[var(--cs-teal-light)] text-[var(--cs-teal)] flex items-center justify-center text-sm font-semibold">
                                                    {getPatientInitials(patient)}
                                                </div>
                                                <div>
                                                    <Link
                                                        href={`/patients/${patient.id}`}
                                                        className="text-sm font-medium text-[var(--cs-text-primary)] group-hover:text-[var(--cs-teal)] transition-colors"
                                                    >
                                                        {getPatientName(patient)}
                                                    </Link>
                                                    <p className="text-xs text-[var(--cs-text-muted)]">
                                                        {patient.gender || 'Not specified'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            {(() => {
                                                const levels: Array<'green' | 'yellow' | 'red' | 'black'> = ['green', 'green', 'yellow', 'red', 'black'];
                                                const idx = patient.first_name.length % levels.length;
                                                const level = levels[idx];
                                                const counts: Record<string, number> = { green: 0, yellow: 1, red: 2, black: 3 };
                                                return <TriageBadge level={level} showLabel alertsCount={counts[level]} />;
                                            })()}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="text-sm font-mono text-[var(--cs-text-muted)]">
                                                {patient.mrn || 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div>
                                                <span className="text-sm text-[var(--cs-text-primary)]">
                                                    {formatDate(patient.date_of_birth)}
                                                </span>
                                                {patient.date_of_birth && (
                                                    <p className="text-xs text-[var(--cs-text-muted)]">
                                                        Age: {calculateAge(patient.date_of_birth)}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="text-sm">
                                                {patient.email && (
                                                    <p className="text-[var(--cs-text-primary)] truncate max-w-[200px]">
                                                        {patient.email}
                                                    </p>
                                                )}
                                                {patient.phone && (
                                                    <p className="text-[var(--cs-text-muted)]">
                                                        {patient.phone}
                                                    </p>
                                                )}
                                                {!patient.email && !patient.phone && (
                                                    <span className="text-[var(--cs-text-muted)]">No contact</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <CSBadge variant={statusBadgeVariant[patient.status]}>
                                                {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                                            </CSBadge>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link
                                                    href={`/patients/${patient.id}`}
                                                    className="p-2 text-[var(--cs-text-muted)] hover:text-[var(--cs-teal)] hover:bg-[var(--cs-teal-light)] rounded-md transition-colors"
                                                    title="View Chart"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="px-5 py-3 border-t border-[var(--cs-card-border)] flex items-center justify-between">
                    <p className="text-sm text-[var(--cs-text-muted)]">
                        Showing <span className="font-medium text-[var(--cs-text-primary)]">{patients.length}</span> of{" "}
                        <span className="font-medium text-[var(--cs-text-primary)]">{pagination.total}</span> patients
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                            className="p-1.5 rounded-md border border-[var(--cs-border)] text-[var(--cs-text-muted)] hover:bg-[var(--cs-teal-xlight)] hover:text-[var(--cs-teal)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-sm text-[var(--cs-text-muted)] px-2">
                            Page {pagination.page} of {pagination.totalPages || 1}
                        </span>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={page >= pagination.totalPages || loading}
                            className="p-1.5 rounded-md border border-[var(--cs-border)] text-[var(--cs-text-muted)] hover:bg-[var(--cs-teal-xlight)] hover:text-[var(--cs-teal)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </CSCard>
        </div>
    );
}
