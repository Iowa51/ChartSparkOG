"use client";

import {
    Building2,
    Users,
    FileText,
    Activity,
    Plus,
    Search,
    MoreHorizontal,
    UserCircle,
} from "lucide-react";
import { useState } from "react";

// Local Component Definitions
const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}>{children}</div>
);
const CardHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`p-6 pb-2 ${className}`}>{children}</div>
);
const CardTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 className={`font-semibold leading-none tracking-tight text-slate-900 dark:text-white ${className}`}>{children}</h3>
);
const CardDescription = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <p className={`text-sm text-slate-500 dark:text-slate-400 mt-2 ${className}`}>{children}</p>
);
const CardContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`p-6 pt-0 ${className}`}>{children}</div>
);

// Mock Data (Shared/Simplified)
const initialOrganizations = [
    { id: 1, name: "Mountain View Clinic", userCount: 24, status: "active", joined: "2023-08-15" },
    { id: 2, name: "Coastal Mental Health", userCount: 18, status: "active", joined: "2023-09-22" },
    { id: 3, name: "Valley Wellness Center", userCount: 32, status: "active", joined: "2023-07-10" },
];

const initialUsers = [
    { id: 1, name: "Dr. Sarah Johnson", email: "sarah.johnson@mountainview.com", organization: "Mountain View Clinic", role: "ADMIN", status: "active" },
    { id: 2, name: "Dr. Michael Chen", email: "m.chen@coastal.com", organization: "Coastal Mental Health", role: "USER", status: "active" },
];

export default function AdminDashboardPage() {
    const [organizations, setOrganizations] = useState(initialOrganizations);
    const [searchTerm, setSearchTerm] = useState("");
    const [userSearchTerm, setUserSearchTerm] = useState("");

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
            {/* Header */}
            <header className="flex-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">ADMIN CONSOLE</h1>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest opacity-70">
                        Organization & Staff Oversight
                    </p>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div className="max-w-7xl mx-auto space-y-8">

                    {/* Stats Overview */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">My Organizations</CardTitle>
                                <Building2 className="h-4 w-4 text-slate-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{organizations.length}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Active Staff</CardTitle>
                                <Users className="h-4 w-4 text-slate-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">42</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Reports</CardTitle>
                                <FileText className="h-4 w-4 text-slate-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">12</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Organizations Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Organization Oversight</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="mt-4 overflow-hidden rounded-xl border border-border">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted/50 text-muted-foreground font-bold uppercase text-[10px]">
                                        <tr>
                                            <th className="px-6 py-3">Organization</th>
                                            <th className="px-6 py-3">Users</th>
                                            <th className="px-6 py-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {organizations.map(org => (
                                            <tr key={org.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4 font-bold">{org.name}</td>
                                                <td className="px-6 py-4">{org.userCount}</td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                                        {org.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Staff Management */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Staff Management</CardTitle>
                                <button className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-primary/20">
                                    Add New Staff
                                </button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="mt-4 space-y-4">
                                {initialUsers.map(user => (
                                    <div key={user.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-border hover:border-primary/30 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                                                <UserCircle className="h-6 w-6 text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">{user.name}</p>
                                                <p className="text-xs text-muted-foreground">{user.organization} • {user.role}</p>
                                            </div>
                                        </div>
                                        <button className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors">
                                            Manage Access
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
