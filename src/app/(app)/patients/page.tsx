import { Header } from "@/components/layout";
import Link from "next/link";
import {
    Search,
    Filter,
    Plus,
    Eye,
    Edit,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { patients } from "@/lib/demo-data/patients";


const statusStyles = {
    Active: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
    Inactive: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
    Pending: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
};

const statusDots = {
    Active: "bg-emerald-500",
    Inactive: "bg-gray-400",
    Pending: "bg-amber-500",
};

export default function PatientsPage() {
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

            <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Controls Toolbar */}
                <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-stretch md:items-center bg-card/40 p-4 rounded-2xl border border-border/50 backdrop-blur-sm shadow-sm ring-1 ring-border/5">
                    {/* Search */}
                    <div className="relative flex-1 max-w-lg">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by Name, MRN, or DOB..."
                            className="block w-full pl-10 pr-3 py-2.5 border-none rounded-xl bg-card text-foreground shadow-sm ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-inset focus:ring-primary text-sm transition-all focus:shadow-md"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors shadow-sm">
                            <Filter className="h-4 w-4" />
                            <span>Filter</span>
                        </button>

                        <Link
                            href="/patients/new"
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-bold shadow-md shadow-primary/20 transition-all hover:shadow-lg"
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
                                        MRN / ID
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Date of Birth
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Last Visit
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {patients.map((patient) => (
                                    <tr
                                        key={patient.id}
                                        className="group hover:bg-accent/50 transition-colors cursor-pointer"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${patient.avatarColor}`}
                                                >
                                                    {patient.initials}
                                                </div>
                                                <div>
                                                    <Link
                                                        href={`/patients/${patient.id}`}
                                                        className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors"
                                                    >
                                                        {patient.name}
                                                    </Link>
                                                    <p className="text-xs text-muted-foreground">
                                                        {patient.gender}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-mono text-muted-foreground">
                                                {patient.mrn}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-foreground">
                                                {patient.dob}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyles[patient.status]}`}
                                            >
                                                <span
                                                    className={`h-1.5 w-1.5 rounded-full ${statusDots[patient.status]}`}
                                                />
                                                {patient.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-muted-foreground">
                                                {patient.lastVisit}
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
                                                <Link
                                                    href={`/patients/${patient.id}/edit`}
                                                    className="p-2 text-muted-foreground hover:text-primary hover:bg-accent rounded-lg transition-colors"
                                                    title="Edit Patient"
                                                >
                                                    <Edit className="h-5 w-5" />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-card">
                        <p className="text-sm text-muted-foreground">
                            Showing <span className="font-medium text-foreground">1</span> to{" "}
                            <span className="font-medium text-foreground">5</span> of{" "}
                            <span className="font-medium text-foreground">50</span> patients
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
