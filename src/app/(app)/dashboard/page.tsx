"use client";

import { Header } from "@/components/layout";
import {
    TrendingUp,
    CheckCircle,
    Receipt,
    AlertTriangle,
    DollarSign,
    FileText,
    BookOpen,
    Plus,
    Calendar,
    ArrowRight,
    Users,
    Loader2,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import PatientQuickSelectModal from "@/components/notes/PatientQuickSelectModal";
import { createClient } from "@/lib/supabase/client";

const quickTools = [
    {
        title: "Billing Advisor",
        description: "Check ICD-10 codes and CPT compliance instantly.",
        icon: DollarSign,
        href: "/billing",
        iconBg: "bg-blue-50 dark:bg-blue-900/20",
        iconColor: "text-primary",
    },
    {
        title: "Smart Templates",
        description: "Access your saved SOAP note templates.",
        icon: FileText,
        href: "/templates",
        iconBg: "bg-purple-50 dark:bg-purple-900/20",
        iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
        title: "Clinical References",
        description: "Look up drug interactions and guidelines.",
        icon: BookOpen,
        href: "/references",
        iconBg: "bg-teal-50 dark:bg-teal-900/20",
        iconColor: "text-teal-600 dark:text-teal-400",
    },
];

const statusStyles = {
    Draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    Signed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    "Pending Review": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function DashboardPage() {
    const [stats, setStats] = useState<any>(null);
    const [recentNotes, setRecentNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                // Fetch statistics
                const statsResponse = await fetch('/api/dashboard/stats');
                if (statsResponse.ok) {
                    const statsData = await statsResponse.json();
                    setStats(statsData.stats);
                }

                // Fetch recent notes
                const notesResponse = await fetch('/api/notes?limit=3');
                if (notesResponse.ok) {
                    const notesData = await notesResponse.json();
                    setRecentNotes(notesData.notes || []);
                }
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const statCards = stats ? [
        {
            label: "Active Patients",
            value: stats.activePatients.toString(),
            change: "In your organization",
            changeType: "neutral" as const,
            icon: Users,
            iconBg: "bg-blue-100 dark:bg-blue-900/30",
            iconColor: "text-blue-600 dark:text-blue-400",
            href: "/patients",
        },
        {
            label: "Today's Notes",
            value: stats.todayNotes.toString(),
            change: "Completed today",
            changeType: "positive" as const,
            icon: CheckCircle,
            iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
            iconColor: "text-emerald-600 dark:text-emerald-400",
            href: "/notes?status=completed",
        },
        {
            label: "Pending Encounters",
            value: stats.pendingEncounters.toString(),
            change: "Needs attention",
            changeType: stats.pendingEncounters > 0 ? "warning" as const : "neutral" as const,
            icon: Receipt,
            iconBg: "bg-amber-100 dark:bg-amber-900/30",
            iconColor: "text-amber-600 dark:text-amber-400",
            href: "/encounters",
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

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return "Good morning";
        if (hour >= 12 && hour < 17) return "Good afternoon";
        if (hour >= 17 && hour < 21) return "Good evening";
        return "Good night";
    }, []);

    return (
        <>
            <Header
                title={`${greeting}${userName ? `, ${userName}` : ''} 👋`}
                description={
                    loading
                        ? "Loading your activity..."
                        : stats
                            ? `You have ${stats.pendingEncounters ?? 0} pending encounter${stats.pendingEncounters === 1 ? '' : 's'} and ${stats.todayNotes ?? 0} note${stats.todayNotes === 1 ? '' : 's'} completed today.`
                            : "Welcome back — start a new note or review your schedule."
                }
                breadcrumbs={[{ label: "Dashboard" }]}
            />

            {/* OPTIMIZATION: Reduced animation duration and use GPU-accelerated transforms */}
            <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in duration-300">
                {/* Hero Section with Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Welcome Card */}
                    <div className="lg:col-span-2 bg-card rounded-xl p-8 border border-border relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex flex-wrap gap-4">
                                <button
                                    onClick={() => setIsPatientModalOpen(true)}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-semibold shadow-lg shadow-primary/30 flex items-center gap-2 transition-all active:scale-95"
                                >
                                    <Plus className="h-5 w-5" />
                                    Start New Note
                                </button>
                                <Link
                                    href="/calendar"
                                    className="bg-card text-foreground border border-border px-6 py-3 rounded-xl font-medium hover:bg-muted/50 flex items-center gap-2 transition-colors"
                                >
                                    <Calendar className="h-5 w-5 text-muted-foreground" />
                                    View Schedule
                                </Link>
                            </div>
                        </div>
                        {/* Decorative background */}
                        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-rows-2 gap-4">
                        {statCards.map((stat: any) => {
                            const Icon = stat.icon;
                            return (
                                <Link
                                    key={stat.label}
                                    href={stat.href}
                                    className="bg-card rounded-xl p-5 border border-border flex items-center justify-between hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer group"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                                            {stat.label}
                                        </p>
                                        <p className="text-3xl font-bold text-foreground mt-1">
                                            {stat.value}
                                        </p>
                                        <p
                                            className={`text-xs mt-1 flex items-center gap-1 ${stat.changeType === "positive"
                                                ? "text-emerald-600"
                                                : "text-amber-600"
                                                }`}
                                        >
                                            {stat.changeType === "positive" ? (
                                                <TrendingUp className="h-3 w-3" />
                                            ) : (
                                                <AlertTriangle className="h-3 w-3" />
                                            )}
                                            {stat.change}
                                        </p>
                                    </div>
                                    <div className={`p-3 rounded-full ${stat.iconBg} group-hover:scale-110 transition-transform`}>
                                        <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Quick Tools */}
                <section>
                    <h2 className="text-lg font-semibold text-foreground mb-4">
                        Quick Tools
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {quickTools.map((tool) => {
                            const Icon = tool.icon;
                            return (
                                <Link
                                    key={tool.title}
                                    href={tool.href}
                                    className="group bg-card rounded-xl p-6 border border-border hover:shadow-md hover:border-primary/30 transition-all"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div
                                            className={`p-3 rounded-lg ${tool.iconBg} group-hover:bg-primary/10 transition-colors`}
                                        >
                                            <Icon className={`h-6 w-6 ${tool.iconColor}`} />
                                        </div>
                                        <ArrowRight className="h-5 w-5 text-border group-hover:text-primary transition-colors" />
                                    </div>
                                    <h3 className="font-bold text-foreground mb-1">{tool.title}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {tool.description}
                                    </p>
                                </Link>
                            );
                        })}
                    </div>
                </section>

                {/* Recent Notes - OPTIMIZATION: Simplified animation, removed layout-thrashing slide */}
                <section className="bg-card rounded-xl border border-border overflow-hidden animate-in fade-in duration-300">
                    <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30">
                        <h2 className="text-lg font-semibold text-foreground">
                            Recent Notes
                        </h2>
                        <Link
                            href="/notes"
                            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                        >
                            View all history
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Patient
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Diagnosis
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Last Edited
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="relative px-6 py-3">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {recentNotes.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                            No notes yet. Click "Start New Note" to create one.
                                        </td>
                                    </tr>
                                ) : recentNotes.map((note) => (
                                    <tr
                                        key={note.id}
                                        className="hover:bg-muted/30 transition-colors"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                                                    {note.patient?.first_name?.[0]}{note.patient?.last_name?.[0] || '?'}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-foreground">
                                                        {note.patient ? `${note.patient.first_name} ${note.patient.last_name}` : 'Unknown Patient'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-foreground">
                                                Clinical Note
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-muted-foreground">
                                                {new Date(note.updated_at || note.created_at).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: 'numeric',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${note.status === 'signed' ? statusStyles["Signed"] :
                                                    note.status === 'completed' ? statusStyles["Pending Review"] :
                                                        statusStyles["Draft"]
                                                    }`}
                                            >
                                                {note.status === 'signed' ? "Signed" : note.status === 'completed' ? "Complete" : "Draft"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Link
                                                href={`/notes/${note.id}`}
                                                className={`px-3 py-1 rounded transition-colors ${note.status === "signed"
                                                    ? "text-muted-foreground hover:text-foreground"
                                                    : "text-primary bg-primary/10 hover:bg-primary/20"
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
                </section>
            </div>

            {/* Patient Quick Select Modal */}
            <PatientQuickSelectModal
                isOpen={isPatientModalOpen}
                onClose={() => setIsPatientModalOpen(false)}
            />
        </>
    );
}
