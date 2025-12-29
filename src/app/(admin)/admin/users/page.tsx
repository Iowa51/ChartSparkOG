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
} from "lucide-react";
import { demoUsers } from "@/lib/demo-data/users";

const roleConfig = {
    USER: { label: "User", icon: Users, color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
    ADMIN: { label: "Admin", icon: ShieldCheck, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    SUPER_ADMIN: { label: "Super Admin", icon: ShieldAlert, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
};

export default function AdminUsersPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<string | null>(null);

    const filteredUsers = demoUsers.filter((user) => {
        const matchesSearch =
            user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = !roleFilter || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            User Management
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Manage platform users and their roles
                        </p>
                    </div>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold transition-colors">
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
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{demoUsers.length}</p>
                                    <p className="text-xs text-slate-500">Total Users</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                                    <Users className="h-5 w-5 text-slate-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                        {demoUsers.filter((u) => u.role === "USER").length}
                                    </p>
                                    <p className="text-xs text-slate-500">Standard Users</p>
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
                                        {demoUsers.filter((u) => u.role === "ADMIN").length}
                                    </p>
                                    <p className="text-xs text-slate-500">Org Admins</p>
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
                                        {demoUsers.filter((u) => u.role === "SUPER_ADMIN").length}
                                    </p>
                                    <p className="text-xs text-slate-500">Super Admins</p>
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
                                placeholder="Search users by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400"
                            />
                        </div>
                        <div className="flex gap-2">
                            {(["USER", "ADMIN", "SUPER_ADMIN"] as const).map((role) => {
                                const config = roleConfig[role];
                                return (
                                    <button
                                        key={role}
                                        onClick={() => setRoleFilter(roleFilter === role ? null : role)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${roleFilter === role
                                                ? "bg-primary text-white"
                                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                            }`}
                                    >
                                        {config.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Users Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <table className="min-w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Organization</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Notes</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Last Active</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {filteredUsers.map((user) => {
                                    const role = roleConfig[user.role];
                                    const RoleIcon = role.icon;

                                    return (
                                        <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                                        {user.first_name[0]}{user.last_name[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900 dark:text-white">
                                                            {user.first_name} {user.last_name}
                                                        </p>
                                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                                            <Mail className="h-3 w-3" />
                                                            {user.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                                    <Building2 className="h-4 w-4" />
                                                    <span className="text-sm">{user.organization_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${role.color}`}>
                                                    <RoleIcon className="h-3 w-3" />
                                                    {role.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                                    <FileText className="h-4 w-4" />
                                                    <span className="font-medium">{user.notes_count}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1 text-slate-500 text-sm">
                                                    <Clock className="h-4 w-4" />
                                                    {user.last_active}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    <button className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
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
        </div>
    );
}
