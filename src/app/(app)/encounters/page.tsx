import { Header } from "@/components/layout";
import Link from "next/link";
import {
    Search,
    Filter,
    Plus,
    Eye,
    FileText,
    ChevronLeft,
    ChevronRight,
    Clock,
    CheckCircle,
    AlertCircle,
} from "lucide-react";

// Demo encounter data
const encounters = [
    {
        id: "e1",
        patient: { name: "Sarah Connor", initials: "SC", id: "p1" },
        type: "Follow-up Visit",
        date: "Oct 28, 2023",
        time: "10:30 AM",
        status: "In Progress" as const,
        provider: "Dr. Sarah K.",
        chiefComplaint: "Blood pressure review",
    },
    {
        id: "e2",
        patient: { name: "John Doe", initials: "JD", id: "p6" },
        type: "Initial Consultation",
        date: "Oct 28, 2023",
        time: "11:00 AM",
        status: "Scheduled" as const,
        provider: "Dr. Sarah K.",
        chiefComplaint: "New patient evaluation",
    },
    {
        id: "e3",
        patient: { name: "Elena Fisher", initials: "EF", id: "p3" },
        type: "Medication Review",
        date: "Oct 27, 2023",
        time: "2:30 PM",
        status: "Completed" as const,
        provider: "Dr. Sarah K.",
        chiefComplaint: "Anxiety medication adjustment",
    },
    {
        id: "e4",
        patient: { name: "Michael Reese", initials: "MR", id: "p2" },
        type: "Follow-up Visit",
        date: "Oct 27, 2023",
        time: "9:00 AM",
        status: "Completed" as const,
        provider: "Dr. Sarah K.",
        chiefComplaint: "Diabetes management",
    },
    {
        id: "e5",
        patient: { name: "Victor Jones", initials: "VJ", id: "p5" },
        type: "Initial Consultation",
        date: "Oct 29, 2023",
        time: "3:00 PM",
        status: "Scheduled" as const,
        provider: "Dr. Sarah K.",
        chiefComplaint: "Depression screening",
    },
];

const statusStyles = {
    "In Progress": {
        bg: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
        icon: Clock,
        dot: "bg-blue-500",
    },
    Scheduled: {
        bg: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
        icon: AlertCircle,
        dot: "bg-amber-500",
    },
    Completed: {
        bg: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
        icon: CheckCircle,
        dot: "bg-emerald-500",
    },
};

export default function EncountersPage() {
    return (
        <>
            <Header
                title="Encounters"
                description="View and manage patient encounters and visits."
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Encounters" },
                ]}
            />

            <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto w-full">
                {/* Controls Toolbar */}
                <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-stretch md:items-center">
                    {/* Search */}
                    <div className="relative flex-1 max-w-lg">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search encounters..."
                            className="block w-full pl-10 pr-3 py-2.5 border-none rounded-xl bg-card text-foreground shadow-sm ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-inset focus:ring-primary text-sm transition-shadow"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors shadow-sm">
                            <Filter className="h-4 w-4" />
                            <span>Filter</span>
                        </button>

                        <Link
                            href="/encounters/new"
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-bold shadow-md shadow-primary/20 transition-all hover:shadow-lg"
                        >
                            <Plus className="h-5 w-5" />
                            <span>New Encounter</span>
                        </Link>
                    </div>
                </div>

                {/* Encounters Table Card */}
                <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full whitespace-nowrap text-left">
                            <thead>
                                <tr className="bg-muted/50 border-b border-border">
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Patient
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Date & Time
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Chief Complaint
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
                                {encounters.map((encounter) => {
                                    const statusConfig = statusStyles[encounter.status];
                                    return (
                                        <tr
                                            key={encounter.id}
                                            className="group hover:bg-accent/50 transition-colors cursor-pointer"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                                                        {encounter.patient.initials}
                                                    </div>
                                                    <Link
                                                        href={`/patients/${encounter.patient.id}`}
                                                        className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors"
                                                    >
                                                        {encounter.patient.name}
                                                    </Link>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-foreground">
                                                    {encounter.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="text-sm text-foreground">{encounter.date}</p>
                                                    <p className="text-xs text-muted-foreground">{encounter.time}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-muted-foreground">
                                                    {encounter.chiefComplaint}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.bg}`}
                                                >
                                                    <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                                                    {encounter.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link
                                                        href={`/encounters/${encounter.id}`}
                                                        className="p-2 text-muted-foreground hover:text-primary hover:bg-accent rounded-lg transition-colors"
                                                        title="View Encounter"
                                                    >
                                                        <Eye className="h-5 w-5" />
                                                    </Link>
                                                    <Link
                                                        href={`/encounters/${encounter.id}/note`}
                                                        className="p-2 text-muted-foreground hover:text-primary hover:bg-accent rounded-lg transition-colors"
                                                        title="Edit Note"
                                                    >
                                                        <FileText className="h-5 w-5" />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-card">
                        <p className="text-sm text-muted-foreground">
                            Showing <span className="font-medium text-foreground">1</span> to{" "}
                            <span className="font-medium text-foreground">5</span> of{" "}
                            <span className="font-medium text-foreground">24</span> encounters
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                disabled
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 transition-colors">
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
