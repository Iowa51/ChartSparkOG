"use client";

import { CSCard, CSPageHeader, CSBadge, CSButton } from "@/components/cs";
import {
    TrendingUp,
    CheckCircle,
    AlertTriangle,
    DollarSign,
    FileText,
    BookOpen,
    Plus,
    Calendar,
    ArrowRight,
    Minus,
    Users,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import PatientQuickSelectModal from "@/components/notes/PatientQuickSelectModal";
import { createClient } from "@/lib/supabase/client";

const quickTools = [
    {
        title: "Billing Advisor",
        description: "Check ICD-10 codes and CPT compliance instantly.",
        icon: DollarSign,
        href: "/billing",
    },
    {
        title: "Smart Templates",
        description: "Access your saved SOAP note templates.",
        icon: FileText,
        href: "/templates",
    },
    {
        title: "Clinical References",
        description: "Look up drug interactions and guidelines.",
        icon: BookOpen,
        href: "/references",
    },
];

export default function DashboardPage() {
    const [stats, setStats] = useState<any>(null);
    const [recentNotes, setRecentNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchDashboardData = useCallback(async (opts: { showLoading?: boolean } = {}) => {
        const { showLoading = true } = opts;
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            if (showLoading) setLoading(true);
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const statsResponse = await fetch(
                `/api/dashboard/stats?tz=${encodeURIComponent(tz)}`,
                { signal: controller.signal },
            );
            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                setStats(statsData.stats);
            }

            const notesResponse = await fetch('/api/notes?limit=3', {
                signal: controller.signal,
            });
            if (notesResponse.ok) {
                const notesData = await notesResponse.json();
                setRecentNotes(notesData.notes || []);
            }
        } catch (error) {
            if ((error as Error)?.name === 'AbortError') return;
            console.error('Error fetching dashboard data:', error);
        } finally {
            if (showLoading && !controller.signal.aborted) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
        return () => {
            abortControllerRef.current?.abort();
        };
    }, [fetchDashboardData]);

    useEffect(() => {
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchDashboardData({ showLoading: false });
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }, [fetchDashboardData]);

    const statCards = stats ? [
        {
            label: "Active Patients",
            value: stats.activePatients.toString(),
            change: "In your organization",
            changeType: "neutral" as const,
            icon: Users,
            href: "/patients",
        },
        {
            label: "Signed Today",
            value: stats.signedToday.toString(),
            change: "Notes you signed today",
            changeType: "positive" as const,
            icon: CheckCircle,
            href: "/notes",
        },
        {
            label: "Unfinished Notes",
            value: stats.unfinishedNotes.toString(),
            change: "Drafts to complete",
            changeType: stats.unfinishedNotes > 0 ? "warning" as const : "neutral" as const,
            icon: FileText,
            href: "/notes",
        },
    ] : [];
    const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
    const [userName, setUserName] = useState("");

    useEffect(() => {
        const fetchUserName = async () => {
            const supabase = createClient();
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
                const { data } = await supabase
                    .from('users')
                    .select('first_name, last_name')
                    .eq('id', authUser.id)
                    .single();
                if (data) {
                    setUserName(`${data.first_name || ''} ${data.last_name || ''}`.trim());
                }
            }
        };
        fetchUserName();
    }, []);

    // Greeting/userName retained per Phase 3 rule "keep all data fetching as-is".
    // Currently consumed only by the void below; safe to remove in a follow-up.
    void useMemo(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return "Good morning";
        if (hour >= 12 && hour < 17) return "Good afternoon";
        if (hour >= 17 && hour < 21) return "Good evening";
        return "Good night";
    }, []);
    void userName;
    void loading;

    return (
        <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto w-full">
            <CSPageHeader title="Dashboard" subtitle="Welcome back" />

            <div className="space-y-6">
                {/* Hero Section with Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Welcome / Actions Card */}
                    <CSCard className="lg:col-span-2" padding="lg">
                        <div className="flex flex-wrap gap-3">
                            <CSButton
                                variant="primary"
                                onClick={() => setIsPatientModalOpen(true)}
                                leftIcon={<Plus className="h-4 w-4" />}
                            >
                                Start New Note
                            </CSButton>
                            <Link href="/calendar">
                                <CSButton variant="secondary" leftIcon={<Calendar className="h-4 w-4" />}>
                                    View Schedule
                                </CSButton>
                            </Link>
                        </div>
                    </CSCard>

                    {/* Stats Cards */}
                    <div className="grid grid-rows-2 gap-4">
                        {statCards.map((stat: any) => {
                            const Icon = stat.icon;
                            return (
                                <Link key={stat.label} href={stat.href} className="group">
                                    <CSCard className="flex items-center justify-between hover:border-[var(--cs-teal)] transition-colors">
                                        <div>
                                            <p className="text-sm font-medium text-[var(--cs-text-muted)] group-hover:text-[var(--cs-teal)] transition-colors">
                                                {stat.label}
                                            </p>
                                            <p className="text-2xl font-semibold text-[var(--cs-text-primary)] mt-1">
                                                {stat.value}
                                            </p>
                                            <p
                                                className={`text-xs mt-1 flex items-center gap-1 ${
                                                    stat.changeType === "positive"
                                                        ? "text-[var(--cs-success)]"
                                                        : stat.changeType === "neutral"
                                                            ? "text-[var(--cs-text-muted)]"
                                                            : "text-[var(--cs-warning)]"
                                                    }`}
                                            >
                                                {stat.changeType === "positive" ? (
                                                    <TrendingUp className="h-3 w-3" />
                                                ) : stat.changeType === "neutral" ? (
                                                    <Minus className="h-3 w-3" />
                                                ) : (
                                                    <AlertTriangle className="h-3 w-3" />
                                                )}
                                                {stat.change}
                                            </p>
                                        </div>
                                        <div className="h-9 w-9 rounded-md bg-[var(--cs-teal-light)] flex items-center justify-center">
                                            <Icon className="h-4 w-4 text-[var(--cs-teal)]" />
                                        </div>
                                    </CSCard>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Quick Tools */}
                <section>
                    <h2 className="text-base font-semibold text-[var(--cs-text-primary)] mb-3">
                        Quick Tools
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {quickTools.map((tool) => {
                            const Icon = tool.icon;
                            return (
                                <Link key={tool.title} href={tool.href} className="group">
                                    <CSCard className="hover:border-[var(--cs-teal)] transition-colors">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="h-9 w-9 rounded-md bg-[var(--cs-teal-light)] flex items-center justify-center">
                                                <Icon className="h-4 w-4 text-[var(--cs-teal)]" />
                                            </div>
                                            <ArrowRight className="h-4 w-4 text-[var(--cs-text-muted)] group-hover:text-[var(--cs-teal)] transition-colors" />
                                        </div>
                                        <h3 className="font-semibold text-[var(--cs-text-primary)] mb-1 text-sm">{tool.title}</h3>
                                        <p className="text-xs text-[var(--cs-text-muted)]">
                                            {tool.description}
                                        </p>
                                    </CSCard>
                                </Link>
                            );
                        })}
                    </div>
                </section>

                {/* Recent Notes */}
                <section>
                    <CSCard padding="none">
                        <div className="px-5 py-4 border-b border-[var(--cs-card-border)] flex items-center justify-between bg-[var(--cs-teal-xlight)]">
                            <h2 className="text-base font-semibold text-[var(--cs-text-primary)]">
                                Recent Notes
                            </h2>
                            <Link
                                href="/notes"
                                className="text-sm text-[var(--cs-teal)] hover:text-[var(--cs-teal-mid)] font-medium flex items-center gap-1"
                            >
                                View all history
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-[var(--cs-card-border)]">
                                <thead className="bg-[var(--cs-teal-xlight)]">
                                    <tr>
                                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-[var(--cs-text-muted)] uppercase tracking-wider">
                                            Patient
                                        </th>
                                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-[var(--cs-text-muted)] uppercase tracking-wider">
                                            Diagnosis
                                        </th>
                                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-[var(--cs-text-muted)] uppercase tracking-wider">
                                            Last Edited
                                        </th>
                                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-[var(--cs-text-muted)] uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="relative px-5 py-2.5">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--cs-card-border)]">
                                    {recentNotes.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-5 py-8 text-center text-[var(--cs-text-muted)]">
                                                No notes yet. Click &quot;Start New Note&quot; to create one.
                                            </td>
                                        </tr>
                                    ) : recentNotes.map((note) => (
                                        <tr
                                            key={note.id}
                                            className="hover:bg-[var(--cs-teal-xlight)] transition-colors"
                                        >
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[var(--cs-teal-light)] flex items-center justify-center text-xs font-semibold text-[var(--cs-teal)]">
                                                        {note.patient?.first_name?.[0]}{note.patient?.last_name?.[0] || '?'}
                                                    </div>
                                                    <div className="ml-3">
                                                        <div className="text-sm font-medium text-[var(--cs-text-primary)]">
                                                            {note.patient ? `${note.patient.first_name} ${note.patient.last_name}` : 'Unknown Patient'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <div className="text-sm text-[var(--cs-text-secondary)]">
                                                    Clinical Note
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <div className="text-sm text-[var(--cs-text-muted)]">
                                                    {new Date(note.updated_at || note.created_at).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: 'numeric',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                {note.status === 'signed' ? (
                                                    <CSBadge variant="success">Signed</CSBadge>
                                                ) : note.status === 'completed' ? (
                                                    <CSBadge variant="warning">Complete</CSBadge>
                                                ) : (
                                                    <CSBadge variant="warning">Draft</CSBadge>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap text-right text-sm font-medium">
                                                <Link
                                                    href={`/notes/${note.id}`}
                                                    className={`px-3 py-1 rounded transition-colors ${note.status === "signed"
                                                        ? "text-[var(--cs-text-muted)] hover:text-[var(--cs-text-primary)]"
                                                        : "text-[var(--cs-teal)] bg-[var(--cs-teal-light)] hover:bg-[var(--cs-card-border)]"
                                                        }`}
                                                >
                                                    {note.status === "signed" ? "View" : "Edit"}
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CSCard>
                </section>
            </div>

            {/* Patient Quick Select Modal */}
            <PatientQuickSelectModal
                isOpen={isPatientModalOpen}
                onClose={() => setIsPatientModalOpen(false)}
            />
        </div>
    );
}
