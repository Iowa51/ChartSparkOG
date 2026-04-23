"use client";

import { useState, useEffect } from "react";
import {
    Search,
    UserCheck,
    UserX,
    ArrowLeft,
    Shield,
} from "lucide-react";
import Link from "next/link";

interface User {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
    is_active: boolean;
    created_at: string;
    organization_id: string | null;
}

interface CurrentUser {
    id: string;
    role: string;
    organization_id: string | null;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [error, setError] = useState<string | null>(null);

    // Change-role modal selection state. The modal itself is built in Session 8C;
    // Session 8B wires the button so it sets these three values on click.
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [selectedUserName, setSelectedUserName] = useState<string>("");
    const [selectedCurrentRole, setSelectedCurrentRole] = useState<string>("");

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/users");
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to load users");
            }
            const payload = await res.json();
            setUsers(payload.users ?? []);
            setCurrentUser(payload.currentUser ?? null);
        } catch (err) {
            console.error("[Admin Users] fetch error:", err);
            setError(err instanceof Error ? err.message : "Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (user: User) => {
        if (currentUser?.id === user.id) return;
        try {
            const response = await fetch(`/api/admin/users/${user.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_active: !user.is_active }),
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || "Failed to toggle status");
            }
            fetchUsers();
        } catch (err) {
            console.error("[Admin Users] toggle error:", err);
        }
    };

    const handleOpenChangeRole = (user: User) => {
        const name =
            `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email;
        setSelectedUserId(user.id);
        setSelectedUserName(name);
        setSelectedCurrentRole(user.role);
    };

    const filteredUsers = users.filter((user) =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.first_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (user.last_name?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    );

    const canChangeRole =
        currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "ADMIN";

    const isChangeRoleDisabled = (user: User) => {
        if (!currentUser) return true;
        if (user.id === currentUser.id) return true;
        if (user.role === "SUPER_ADMIN" && currentUser.role === "ADMIN") return true;
        return false;
    };

    const roleBadgeClass = (role: string) => {
        switch (role) {
            case "SUPER_ADMIN":
                return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400";
            case "ADMIN":
                return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400";
            case "AUDITOR":
                return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
            case "USER":
            default:
                return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400";
        }
    };

    const roleLabel = (role: string) =>
        role === "USER" ? "Clinician" : role.replace("_", " ");

    const avatarClass = (role: string) => {
        switch (role) {
            case "SUPER_ADMIN":
                return "bg-purple-600";
            case "ADMIN":
                return "bg-blue-600";
            case "AUDITOR":
                return "bg-amber-600";
            default:
                return "bg-emerald-600";
        }
    };

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin"
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                            Users
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Manage users in your organization
                        </p>
                    </div>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-6">
                    <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
            )}

            {/* Search */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Name
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Email
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Role
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                    Loading users...
                                </td>
                            </tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                    No users found
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map((user) => {
                                const changeRoleDisabled = isChangeRoleDisabled(user);
                                const displayName =
                                    user.first_name || user.last_name
                                        ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                                        : "No Name";
                                return (
                                    <tr
                                        key={user.id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${avatarClass(user.role)}`}
                                                >
                                                    {user.first_name?.[0] || user.email[0].toUpperCase()}
                                                    {user.last_name?.[0] || ""}
                                                </div>
                                                <p className="font-medium text-slate-900 dark:text-white">
                                                    {displayName}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`px-2 py-1 text-xs font-medium rounded-full ${roleBadgeClass(user.role)}`}
                                            >
                                                {roleLabel(user.role)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleToggleActive(user)}
                                                disabled={currentUser?.id === user.id}
                                                className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full transition-colors ${user.is_active
                                                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400"
                                                    : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-400"
                                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                {user.is_active ? (
                                                    <UserCheck className="h-3 w-3" />
                                                ) : (
                                                    <UserX className="h-3 w-3" />
                                                )}
                                                {user.is_active ? "Active" : "Inactive"}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {canChangeRole && (
                                                <button
                                                    onClick={() => handleOpenChangeRole(user)}
                                                    disabled={changeRoleDisabled}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
                                                >
                                                    <Shield className="h-3.5 w-3.5" />
                                                    Change Role
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Selection state is consumed by the Change Role modal in Session 8C. */}
            {selectedUserId && (
                <div className="sr-only" aria-live="polite">
                    Selected {selectedUserName} ({selectedCurrentRole}) — id {selectedUserId}
                </div>
            )}
        </div>
    );
}
