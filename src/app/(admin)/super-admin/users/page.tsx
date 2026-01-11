"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    Users,
    Plus,
    Search,
    Edit,
    UserCheck,
    UserX,
    X,
    Mail,
    Building2,
    Shield,
} from "lucide-react";

interface User {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
    organization_id: string | null;
    subscription_tier: string | null;
    specialty: string | null;
    is_active: boolean;
    last_login: string | null;
    organizations?: { name: string } | null;
}

interface Organization {
    id: string;
    name: string;
}

export default function UsersPage() {
    const supabase = createClient();
    const [users, setUsers] = useState<User[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("ALL");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        email: "",
        first_name: "",
        last_name: "",
        role: "USER",
        organization_id: "",
        subscription_tier: "PROFESSIONAL",
        specialty: "both",
    });

    useEffect(() => {
        fetchUsers();
        fetchOrganizations();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select(`
                    *,
                    organizations(name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrganizations = async () => {
        try {
            const { data, error } = await supabase
                .from('organizations')
                .select('id, name')
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            setOrganizations(data || []);
        } catch (error) {
            console.error("Error fetching organizations:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingUser) {
                // Update existing
                const { error } = await supabase
                    .from('users')
                    .update({
                        first_name: formData.first_name,
                        last_name: formData.last_name,
                        role: formData.role,
                        organization_id: formData.organization_id || null,
                        subscription_tier: formData.subscription_tier,
                        specialty: formData.specialty,
                    })
                    .eq('id', editingUser.id);

                if (error) throw error;
            } else {
                // For demo, we'll just create in the users table
                // In production, you'd use Supabase Admin API to create auth user first
                alert("Note: In production, this would create the user in auth.users as well. For demo, user must already exist in auth.");
            }

            setShowCreateModal(false);
            setEditingUser(null);
            setFormData({
                email: "",
                first_name: "",
                last_name: "",
                role: "USER",
                organization_id: "",
                subscription_tier: "PROFESSIONAL",
                specialty: "both",
            });
            fetchUsers();
        } catch (error) {
            console.error("Error saving user:", error);
            alert("Failed to save user");
        }
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setFormData({
            email: user.email,
            first_name: user.first_name || "",
            last_name: user.last_name || "",
            role: user.role,
            organization_id: user.organization_id || "",
            subscription_tier: user.subscription_tier || "PROFESSIONAL",
            specialty: user.specialty || "both",
        });
        setShowCreateModal(true);
    };

    const handleToggleActive = async (user: User) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ is_active: !user.is_active })
                .eq('id', user.id);

            if (error) throw error;
            fetchUsers();
        } catch (error) {
            console.error("Error toggling user status:", error);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (user.first_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (user.last_name?.toLowerCase() || '').includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'SUPER_ADMIN': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400';
            case 'ADMIN': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400';
            case 'AUDITOR': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
            default: return 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400';
        }
    };

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                        Users
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Manage all users across the platform
                    </p>
                </div>
                <button
                    onClick={() => {
                        setEditingUser(null);
                        setFormData({
                            email: "",
                            first_name: "",
                            last_name: "",
                            role: "USER",
                            organization_id: "",
                            subscription_tier: "PROFESSIONAL",
                            specialty: "both",
                        });
                        setShowCreateModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                >
                    <Plus className="h-5 w-5" />
                    Create User
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div className="flex gap-2">
                    {['ALL', 'SUPER_ADMIN', 'ADMIN', 'AUDITOR', 'USER'].map((role) => (
                        <button
                            key={role}
                            onClick={() => setRoleFilter(role)}
                            className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${roleFilter === role
                                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            {role === 'ALL' ? 'All' : role.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Organization</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tier</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Last Login</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                    Loading users...
                                </td>
                            </tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                    No users found
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${user.role === 'SUPER_ADMIN' ? 'bg-purple-600' :
                                                    user.role === 'ADMIN' ? 'bg-blue-600' :
                                                        user.role === 'AUDITOR' ? 'bg-amber-600' : 'bg-teal-600'
                                                }`}>
                                                {user.first_name?.[0] || user.email[0].toUpperCase()}
                                                {user.last_name?.[0] || ''}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white">
                                                    {user.first_name || user.last_name
                                                        ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                                        : 'No Name'}
                                                </p>
                                                <p className="text-xs text-slate-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                        {user.organizations?.name || '—'}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                        {user.subscription_tier || '—'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleToggleActive(user)}
                                            className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full transition-colors ${user.is_active
                                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400'
                                                    : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-400'
                                                }`}
                                        >
                                            {user.is_active ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {user.last_login
                                            ? new Date(user.last_login).toLocaleDateString()
                                            : 'Never'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleEdit(user)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {showCreateModal && editingUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                Edit User
                            </h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        First Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Email (read-only)
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    disabled
                                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Role
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="SUPER_ADMIN">Super Admin</option>
                                    <option value="ADMIN">Admin</option>
                                    <option value="AUDITOR">Auditor</option>
                                    <option value="USER">User</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Organization
                                </label>
                                <select
                                    value={formData.organization_id}
                                    onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">None (Super Admin only)</option>
                                    {organizations.map((org) => (
                                        <option key={org.id} value={org.id}>{org.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Tier
                                    </label>
                                    <select
                                        value={formData.subscription_tier}
                                        onChange={(e) => setFormData({ ...formData, subscription_tier: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="STARTER">Starter</option>
                                        <option value="PROFESSIONAL">Professional</option>
                                        <option value="COMPLETE">Complete</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Specialty
                                    </label>
                                    <select
                                        value={formData.specialty}
                                        onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="mental_health">Mental Health</option>
                                        <option value="geriatric">Geriatric</option>
                                        <option value="both">Both</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
