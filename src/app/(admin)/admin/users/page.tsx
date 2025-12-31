"use client";

import { Users, UserCircle, Plus, Search, Shield, Mail } from "lucide-react";
import { useState } from "react";

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}>{children}</div>
);
const CardContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`p-6 ${className}`}>{children}</div>
);

const users = [
    { id: 1, name: "Dr. Sarah Johnson", email: "sarah.johnson@mountainview.com", role: "ADMIN", org: "Mountain View Clinic", status: "active", lastActive: "2 hours ago" },
    { id: 2, name: "Dr. Michael Chen", email: "m.chen@coastal.com", role: "USER", org: "Coastal Mental Health", status: "active", lastActive: "5 min ago" },
    { id: 3, name: "Dr. Emily Rodriguez", email: "e.rodriguez@valley.com", role: "USER", org: "Valley Wellness Center", status: "active", lastActive: "1 day ago" },
    { id: 4, name: "Dr. James Wilson", email: "j.wilson@harbor.com", role: "ADMIN", org: "Harbor Psychiatry", status: "pending", lastActive: "Never" },
];

export default function AdminUsersPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAccessModal, setShowAccessModal] = useState<number | null>(null);

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
            <header className="flex-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">User Management</h1>
                        <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest opacity-70">
                            Manage staff and permissions
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-primary/20 flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add User
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
                            placeholder="Search users by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                        />
                    </div>

                    {/* Users List */}
                    <Card>
                        <CardContent className="space-y-4">
                            {filteredUsers.map(user => (
                                <div key={user.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-primary/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                            <UserCircle className="h-7 w-7 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">{user.name}</p>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Mail className="h-3 w-3" /> {user.email}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{user.org} • Last active: {user.lastActive}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${user.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                                            }`}>
                                            {user.role}
                                        </span>
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${user.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                            }`}>
                                            {user.status}
                                        </span>
                                        <button
                                            onClick={() => setShowAccessModal(user.id)}
                                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                                        >
                                            <Shield className="h-3 w-3" />
                                            Manage Access
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-4">Add New User</h2>
                        <form onSubmit={(e) => { e.preventDefault(); alert("User added!"); setShowAddModal(false); }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Full Name</label>
                                <input type="text" required className="w-full px-3 py-2 border rounded-lg" placeholder="Dr. John Smith" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input type="email" required className="w-full px-3 py-2 border rounded-lg" placeholder="john@clinic.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Role</label>
                                <select className="w-full px-3 py-2 border rounded-lg">
                                    <option value="USER">User</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Organization</label>
                                <select className="w-full px-3 py-2 border rounded-lg">
                                    <option>Mountain View Clinic</option>
                                    <option>Coastal Mental Health</option>
                                    <option>Valley Wellness Center</option>
                                </select>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border rounded-lg font-medium">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-bold">Add User</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Manage Access Modal */}
            {showAccessModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAccessModal(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            Manage Access
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Role</label>
                                <select className="w-full px-3 py-2 border rounded-lg">
                                    <option value="USER">User</option>
                                    <option value="ADMIN">Admin</option>
                                    <option value="SUPER_ADMIN">Super Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Permissions</label>
                                <div className="space-y-2">
                                    {["View Patients", "Edit Patients", "Create Notes", "View Billing", "Admin Access"].map(perm => (
                                        <label key={perm} className="flex items-center gap-2">
                                            <input type="checkbox" defaultChecked={perm !== "Admin Access"} className="rounded" />
                                            <span className="text-sm">{perm}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button onClick={() => setShowAccessModal(null)} className="flex-1 px-4 py-2 border rounded-lg font-medium">Cancel</button>
                                <button onClick={() => { alert("Access updated!"); setShowAccessModal(null); }} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-bold">Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
