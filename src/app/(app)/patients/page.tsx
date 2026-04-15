"use client";

import { Header } from "@/components/layout";
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

const statusStyles = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
    inactive: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
    archived: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
};

const statusDots = {
    active: "bg-emerald-500",
    inactive: "bg-gray-400",
    archived: "bg-amber-500",
};

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
        <>
            <Header
                title="Patients"
                description="Manage, search, and update patient records."
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Patients" },
                ]}
            />

            <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
                {/* Controls Toolbar */}
                <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-stretch md:items-center bg-card/40 p-4 rounded-2xl border border-border/50 backdrop-blur-sm shadow-sm ring-1 ring-border/5">
                    {/* Search */}
                    <div className="relative flex-1 max-w-lg">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by Name, MRN, Email, Phone..."
                            className="block w-full pl-10 pr-3 py-2.5 border-none rounded-xl bg-card text-foreground shadow-sm ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-inset focus:ring-primary text-sm transition-all focus:shadow-md"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center bg-muted/50 rounded-xl p-1 border border-border/50">
                            {[
                                { value: "active", label: "Active" },
                                { value: "all", label: "All" },
                                { value: "archived", label: "Archived" }
                            ].map((s) => (
                                <button
                                    key={s.value}
                                    onClick={() => setStatusFilter(s.value)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === s.value
                                        ? "bg-white dark:bg-slate-800 text-primary shadow-sm ring-1 ring-border/10"
                                        : "text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>

                        {(searchQuery || statusFilter !== 'active') && (
                            <button
                                onClick={() => {
                                    setSearchQuery("");
                                    setStatusFilter("active");
                                    setPage(1);
                                }}
                                className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-red-500 transition-colors bg-muted/30 rounded-xl border border-border/50"
                            >
                                <X className="h-3 w-3" />
                                Clear
                            </button>
                        )}

                        <Link
                            href="/patients/new"
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-bold shadow-md shadow-primary/20 transition-all hover:shadow-lg whitespace-nowrap"
                        >
                            <Plus className="h-5 w-5" />
                            <span>Add Patient</span>
                        </Link>
                    </div>
                </div>

                {/* Patient Table Card */}
                <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full whitespace-nowrap text-left">
                            <thead>
                                <tr className="bg-muted/50 border-b border-border">
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Patient Name
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Triage
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        MRN
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        DOB / Age
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Contact
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                                <p className="text-sm text-muted-foreground">Loading patients...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : patients.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <p className="text-sm text-muted-foreground">No patients found</p>
                                            {searchQuery && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Try adjusting your search or filters
                                                </p>
                                            )}
                                        </td>
                                    </tr>
                                ) : (
                                    patients.map((patient) => (
                                        <tr
                                            key={patient.id}
                                            className="group hover:bg-accent/50 transition-colors cursor-pointer"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${patient.avatar_color || 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                            }`}
                                                    >
                                                        {getPatientInitials(patient)}
                                                    </div>
                                                    <div>
                                                        <Link
                                                            href={`/patients/${patient.id}`}
                                                            className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors"
                                                        >
                                                            {getPatientName(patient)}
                                                        </Link>
                                                        <p className="text-xs text-muted-foreground">
                                                            {patient.gender || 'Not specified'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {(() => {
                                                    const levels: Array<'green' | 'yellow' | 'red' | 'black'> = ['green', 'green', 'yellow', 'red', 'black'];
                                                    const idx = patient.first_name.length % levels.length;
                                                    const level = levels[idx];
                                                    const counts: Record<string, number> = { green: 0, yellow: 1, red: 2, black: 3 };
                                                    return <TriageBadge level={level} showLabel alertsCount={counts[level]} />;
                                                })()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-mono text-muted-foreground">
                                                    {patient.mrn || 'Pending'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <span className="text-sm text-foreground">
                                                        {formatDate(patient.date_of_birth)}
                                                    </span>
                                                    {patient.date_of_birth && (
                                                        <p className="text-xs text-muted-foreground">
                                                            Age: {calculateAge(patient.date_of_birth)}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm">
                                                    {patient.email && (
                                                        <p className="text-foreground truncate max-w-[200px]">
                                                            {patient.email}
                                                        </p>
                                                    )}
                                                    {patient.phone && (
                                                        <p className="text-muted-foreground">
                                                            {patient.phone}
                                                        </p>
                                                    )}
                                                    {!patient.email && !patient.phone && (
                                                        <span className="text-muted-foreground">No contact</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyles[patient.status]
                                                        }`}
                                                >
                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full ${statusDots[patient.status]}`}
                                                    />
                                                    {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link
                                                        href={`/patients/${patient.id}`}
                                                        className="p-2 text-muted-foreground hover:text-primary hover:bg-accent rounded-lg transition-colors"
                                                        title="View Chart"
                                                    >
                                                        <Eye className="h-5 w-5" />
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
                    <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-card">
                        <p className="text-sm text-muted-foreground">
                            Showing <span className="font-medium text-foreground">{patients.length}</span> of{" "}
                            <span className="font-medium text-foreground">{pagination.total}</span> patients
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                                className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-sm text-muted-foreground px-2">
                                Page {pagination.page} of {pagination.totalPages || 1}
                            </span>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={page >= pagination.totalPages || loading}
                                className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
