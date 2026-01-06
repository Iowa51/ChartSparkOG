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
    X,
    Shield,
    CheckCircle2,
    Clock,
    AlertCircle,
} from "lucide-react";
import { useState } from "react";

// Local Component Definitions
const Card = ({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) => (
    <div id={id} className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}>{children}</div>
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
    const [showAddStaff, setShowAddStaff] = useState(false);
    const [showManageAccess, setShowManageAccess] = useState<number | null>(null);

    const selectedUser = initialUsers.find(u => u.id === showManageAccess);

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
                                <button
                                    onClick={() => setShowAddStaff(true)}
                                    className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-primary/20 flex items-center gap-2"
                                >
                                    <Plus className="h-4 w-4" />
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
                                        <button
                                            onClick={() => setShowManageAccess(user.id)}
                                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                                        >
                                            <Shield className="h-3 w-3" />
                                            Manage Access
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Insurance Submissions Oversight */}
                    <Card id="claims">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Insurance Submissions</CardTitle>
                                    <CardDescription>Review and approve claims before insurance submission.</CardDescription>
                                </div>
                                <a
                                    href="/submissions"
                                    className="text-primary text-xs font-bold hover:underline"
                                >
                                    View Full Dashboard →
                                </a>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800 flex items-center gap-4">
                                    <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-lg text-amber-600">
                                        <Clock className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Pending Review</p>
                                        <p className="text-xl font-black text-slate-900 dark:text-white">8</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center gap-4">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600">
                                        <FileText className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Ready to File</p>
                                        <p className="text-xl font-black text-slate-900 dark:text-white">14</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800 flex items-center gap-4">
                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-800 rounded-lg text-emerald-600">
                                        <CheckCircle2 className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Paid (MTD)</p>
                                        <p className="text-xl font-black text-slate-900 dark:text-white">$12,450</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 overflow-hidden rounded-xl border border-border">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted/50 text-muted-foreground font-bold uppercase text-[10px]">
                                        <tr>
                                            <th className="px-6 py-3">Claim ID</th>
                                            <th className="px-6 py-3">Patient</th>
                                            <th className="px-6 py-3">Amount</th>
                                            <th className="px-6 py-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {[
                                            { id: "CLM-882", patient: "Sarah Connor", amount: 245, status: "Pending Review" },
                                            { id: "CLM-881", patient: "Michael Reese", amount: 150, status: "Ready to Submit" },
                                        ].map(claim => (
                                            <tr key={claim.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4 font-mono text-[10px] font-bold">{claim.id}</td>
                                                <td className="px-6 py-4 font-bold">{claim.patient}</td>
                                                <td className="px-6 py-4 font-black">${claim.amount}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${claim.status === "Pending Review" ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-blue-50 text-blue-600 border-blue-100"
                                                        }`}>
                                                        {claim.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Add Staff Modal */}
            {showAddStaff && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddStaff(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">Add New Staff</h2>
                            <button onClick={() => setShowAddStaff(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); alert("Staff member added successfully!"); setShowAddStaff(false); }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Full Name</label>
                                <input type="text" required className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" placeholder="Dr. Jane Smith" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input type="email" required className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" placeholder="jane@clinic.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Role</label>
                                <select className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700">
                                    <option value="USER">User</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Organization</label>
                                <select className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700">
                                    {organizations.map(org => (
                                        <option key={org.id} value={org.id}>{org.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setShowAddStaff(false)} className="flex-1 px-4 py-2 border rounded-lg font-medium">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-bold">Add Staff</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Manage Access Modal */}
            {showManageAccess && selectedUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowManageAccess(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Shield className="h-5 w-5 text-primary" />
                                Manage Access
                            </h2>
                            <button onClick={() => setShowManageAccess(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <p className="font-bold">{selectedUser.name}</p>
                            <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Role</label>
                                <select defaultValue={selectedUser.role} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700">
                                    <option value="USER">User</option>
                                    <option value="ADMIN">Admin</option>
                                    <option value="SUPER_ADMIN">Super Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Permissions</label>
                                <div className="space-y-2">
                                    {["View Patients", "Edit Patients", "Create Notes", "View Billing", "Admin Access"].map(perm => (
                                        <label key={perm} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                            <input type="checkbox" defaultChecked={perm !== "Admin Access"} className="rounded" />
                                            <span className="text-sm">{perm}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button onClick={() => setShowManageAccess(null)} className="flex-1 px-4 py-2 border rounded-lg font-medium">Cancel</button>
                                <button onClick={() => { alert("Access updated successfully!"); setShowManageAccess(null); }} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-bold">Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
