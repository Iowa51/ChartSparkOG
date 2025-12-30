"use client";

import { useState } from "react";
import Link from "next/link";
import {
    Search,
    Plus,
    Edit,
    Eye,
    Trash2,
    Users,
    FileText,
    Shield,
    ShieldCheck,
    ShieldAlert,
    Mail,
    Building2,
    MoreVertical,
    Clock,
    ArrowLeft,
} from "lucide-react";
import { demoUsers } from "@/lib/demo-data/users";

const roleConfig = {
    USER: { label: "User", icon: Users, color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
    ADMIN: { label: "Admin", icon: ShieldCheck, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    SUPER_ADMIN: { label: "Super Admin", icon: ShieldAlert, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
};

export default function SuperAdminUsersPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [users, setUsers] = useState(demoUsers);

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = !roleFilter || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const handleAddUser = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newUser = {
            id: `user-${Date.now()}`,
            first_name: formData.get("firstName") as string,
            last_name: formData.get("lastName") as string,
            email: formData.get("email") as string,
            role: formData.get("role") as any,
            organization_id: "org-1",
            organization_name: "General Hospital",
            notes_count: 0,
            last_active: "Just now",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        } as any;
        setUsers([newUser, ...users]);
        setIsAddModalOpen(false);
    };

    const handleUpdateUser = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        setUsers(users.map(u => u.id === editingUser.id ? {
            ...u,
            first_name: formData.get("firstName") as string,
            last_name: formData.get("lastName") as string,
            email: formData.get("email") as string,
            role: formData.get("role") as any,
        } : u));
        setEditingUser(null);
    };

    const handleDeleteUser = (id: string) => {
        if (confirm("Are you sure you want to delete this user?")) {
            setUsers(users.filter(u => u.id !== id));
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/super-admin" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                            <ArrowLeft className="h-5 w-5 text-slate-500" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                User Governance
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Global Permission & RBAC Controls
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold transition-colors"
                    >
                        <Plus className="h-5 w-5" />
                        Add User
                    </button>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-lg bg-primary/10">
                                    <Users className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{users.length}</p>
                                    <p className="text-[10px] font-black uppercase text-slate-500">Total Users</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                                    <Users className="h-5 w-5 text-slate-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                        {users.filter((u) => u.role === "USER").length}
                                    </p>
                                    <p className="text-[10px] font-black uppercase text-slate-500">Practitioners</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                        {users.filter((u) => u.role === "ADMIN").length}
                                    </p>
                                    <p className="text-[10px] font-black uppercase text-slate-500">Org Admins</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                    <ShieldAlert className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                        {users.filter((u) => u.role === "SUPER_ADMIN").length}
                                    </p>
                                    <p className="text-[10px] font-black uppercase text-slate-500">Platform Admins</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search & Filters */}
                    <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name, email, or role..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                            />
                        </div>
                        <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            {(["USER", "ADMIN", "SUPER_ADMIN"] as const).map((role) => {
                                const config = roleConfig[role];
                                return (
                                    <button
                                        key={role}
                                        onClick={() => setRoleFilter(roleFilter === role ? null : role)}
                                        className={`px-4 py-2 rounded-lg text-xs font-black transition-all uppercase tracking-wider ${roleFilter === role
                                            ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                                            }`}
                                    >
                                        {config.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Users Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <table className="min-w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Organization</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Notes</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Last Active</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredUsers.map((user) => {
                                    const role = roleConfig[user.role as keyof typeof roleConfig];
                                    const RoleIcon = role.icon;

                                    return (
                                        <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 group transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                                                        {user.first_name[0]}{user.last_name[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white text-sm">
                                                            {user.first_name} {user.last_name}
                                                        </p>
                                                        <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                                            <Mail className="h-3 w-3" />
                                                            {user.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                                    <Building2 className="h-3.5 w-3.5" />
                                                    <span className="text-xs font-bold truncate max-w-[120px]">{user.organization_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${role.color}`}>
                                                    <RoleIcon className="h-3 w-3" />
                                                    {role.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                                    <FileText className="h-3.5 w-3.5" />
                                                    <span className="font-bold text-xs">{user.notes_count}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {user.last_active}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button
                                                        onClick={() => setEditingUser(user)}
                                                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add/Edit User Modal */}
            {(isAddModalOpen || editingUser) && (
                <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-8">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight">
                                {isAddModalOpen ? "New Identity" : "Edit Profile"}
                            </h2>
                            <form
                                onSubmit={isAddModalOpen ? handleAddUser : handleUpdateUser}
                                className="space-y-4"
                            >
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">First Name</label>
                                        <input
                                            name="firstName"
                                            required
                                            defaultValue={editingUser?.first_name || ""}
                                            className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Last Name</label>
                                        <input
                                            name="lastName"
                                            required
                                            defaultValue={editingUser?.last_name || ""}
                                            className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Email Address</label>
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        defaultValue={editingUser?.email || ""}
                                        className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                                        placeholder="user@example.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Platform Role</label>
                                    <select
                                        name="role"
                                        defaultValue={editingUser?.role || "USER"}
                                        className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold appearance-none"
                                    >
                                        <option value="USER">User (Practitioner)</option>
                                        <option value="ADMIN">Admin (Org Manager)</option>
                                        <option value="SUPER_ADMIN">Super Admin (Platform)</option>
                                    </select>
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => { setIsAddModalOpen(false); setEditingUser(null); }}
                                        className="flex-1 px-6 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-3.5 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                                    >
                                        {isAddModalOpen ? "Register" : "Update"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
