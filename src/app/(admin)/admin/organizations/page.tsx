"use client";

import { Building2, Users, Activity, Plus, Search } from "lucide-react";
import { useState } from "react";

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}>{children}</div>
);
const CardHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`p-6 pb-2 ${className}`}>{children}</div>
);
const CardTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 className={`font-semibold leading-none tracking-tight text-slate-900 dark:text-white ${className}`}>{children}</h3>
);
const CardContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`p-6 pt-4 ${className}`}>{children}</div>
);

const organizations = [
    { id: 1, name: "Mountain View Clinic", users: 24, status: "active", plan: "Enterprise", joined: "Aug 2023" },
    { id: 2, name: "Coastal Mental Health", users: 18, status: "active", plan: "Professional", joined: "Sep 2023" },
    { id: 3, name: "Valley Wellness Center", users: 32, status: "active", plan: "Enterprise", joined: "Jul 2023" },
    { id: 4, name: "Harbor Psychiatry", users: 12, status: "pending", plan: "Starter", joined: "Jan 2024" },
];

export default function AdminOrganizationsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);

    const filteredOrgs = organizations.filter(org =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
            <header className="flex-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Organizations</h1>
                        <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest opacity-70">
                            Manage clinic organizations
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-primary/20 flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add Organization
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search organizations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                        />
                    </div>

                    {/* Organizations Table */}
                    <Card>
                        <CardContent>
                            <div className="overflow-hidden rounded-xl border border-border">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted/50 text-muted-foreground font-bold uppercase text-[10px]">
                                        <tr>
                                            <th className="px-6 py-3">Organization</th>
                                            <th className="px-6 py-3">Users</th>
                                            <th className="px-6 py-3">Plan</th>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3">Joined</th>
                                            <th className="px-6 py-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filteredOrgs.map(org => (
                                            <tr key={org.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                            <Building2 className="h-5 w-5 text-primary" />
                                                        </div>
                                                        <span className="font-bold">{org.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">{org.users}</td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase">
                                                        {org.plan}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${org.status === "active"
                                                            ? "bg-emerald-50 text-emerald-600"
                                                            : "bg-amber-50 text-amber-600"
                                                        }`}>
                                                        {org.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-muted-foreground">{org.joined}</td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => alert(`Viewing ${org.name}`)}
                                                        className="text-xs font-bold text-primary hover:underline"
                                                    >
                                                        View Details
                                                    </button>
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

            {/* Add Organization Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-4">Add New Organization</h2>
                        <form onSubmit={(e) => { e.preventDefault(); alert("Organization added!"); setShowAddModal(false); }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Organization Name</label>
                                <input type="text" required className="w-full px-3 py-2 border rounded-lg" placeholder="Clinic Name" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Plan</label>
                                <select className="w-full px-3 py-2 border rounded-lg">
                                    <option>Starter</option>
                                    <option>Professional</option>
                                    <option>Enterprise</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Primary Contact Email</label>
                                <input type="email" required className="w-full px-3 py-2 border rounded-lg" placeholder="admin@clinic.com" />
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border rounded-lg font-medium">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-bold">Add Organization</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
