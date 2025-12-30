"use client";

import { Header } from "@/components/layout";
import { useState } from "react";
import Link from "next/link";
import {
    Search,
    Filter,
    Plus,
    Eye,
    Edit,
    ChevronLeft,
    ChevronRight,
    X,
    CheckCircle2
} from "lucide-react";
import { patients as initialPatients, Patient } from "@/lib/demo-data/patients";


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
    const [localPatients, setLocalPatients] = useState<Patient[]>(initialPatients);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);

    const filteredPatients = localPatients.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.mrn.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = !statusFilter || p.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleUpdatePatient = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        if (!editingPatient) return;

        const updatedPatient = {
            ...editingPatient,
            name: formData.get("name") as string,
            email: formData.get("email") as string,
            phone: formData.get("phone") as string,
            dob: formData.get("dob") as string,
        };

        setLocalPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));

        setEditingPatient(null);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
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
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by Name, MRN, or DOB..."
                            className="block w-full pl-10 pr-3 py-2.5 border-none rounded-xl bg-card text-foreground shadow-sm ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-inset focus:ring-primary text-sm transition-all focus:shadow-md"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center bg-muted/50 rounded-xl p-1 border border-border/50">
                            {["Active", "Pending", "Inactive"].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(statusFilter === s ? null : s)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === s
                                        ? "bg-white dark:bg-slate-800 text-primary shadow-sm ring-1 ring-border/10"
                                        : "text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>

                        {(searchQuery || statusFilter) && (
                            <button
                                onClick={() => {
                                    setSearchQuery("");
                                    setStatusFilter(null);
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
                                {filteredPatients.map((patient) => (
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
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingPatient(patient);
                                                    }}
                                                    className="p-2 text-muted-foreground hover:text-primary hover:bg-accent rounded-lg transition-colors"
                                                    title="Edit Patient"
                                                >
                                                    <Edit className="h-5 w-5" />
                                                </button>
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
                            Showing <span className="font-medium text-foreground">{filteredPatients.length}</span> of{" "}
                            <span className="font-medium text-foreground">{localPatients.length}</span> patients
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

            {/* Edit Patient Modal */}
            {editingPatient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-card w-full max-w-lg rounded-3xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-border flex items-center justify-between bg-muted/30">
                            <div>
                                <h2 className="text-xl font-bold text-foreground">Edit Patient Profile</h2>
                                <p className="text-sm text-muted-foreground mt-1">Update demographic and contact information.</p>
                            </div>
                            <button
                                onClick={() => setEditingPatient(null)}
                                className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleUpdatePatient} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
                                    <input
                                        name="name"
                                        defaultValue={editingPatient.name}
                                        required
                                        className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Date of Birth</label>
                                        <input
                                            name="dob"
                                            type="text"
                                            defaultValue={editingPatient.dob}
                                            required
                                            className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">MRN</label>
                                        <input
                                            value={editingPatient.mrn}
                                            disabled
                                            className="w-full px-4 py-3 bg-muted/10 border border-border rounded-xl text-muted-foreground cursor-not-allowed font-mono text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Address</label>
                                    <input
                                        name="email"
                                        type="email"
                                        defaultValue={editingPatient.email}
                                        className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number</label>
                                    <input
                                        name="phone"
                                        defaultValue={editingPatient.phone}
                                        className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                    />
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingPatient(null)}
                                    className="flex-1 px-6 py-3 border border-border hover:bg-muted text-foreground rounded-xl font-bold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Success Toast */}
            {showSuccess && (
                <div className="fixed bottom-8 right-8 z-[60] animate-in slide-in-from-right-10 fade-in duration-500">
                    <div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-bold">Patient updated successfully!</span>
                    </div>
                </div>
            )}
        </>
    );
}
