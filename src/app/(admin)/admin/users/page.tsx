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
} from "lucide-react";

interface User {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
    specialty: string | null;
    is_active: boolean;
    last_login: string | null;
}

// Demo users for fallback when database unavailable
const demoUsers: User[] = [
    {
        id: "demo-user-1",
        email: "sarah.k@mountainview.clinic",
        first_name: "Sarah",
        last_name: "Kowalski",
        role: "USER",
        specialty: "Mental Health",
        is_active: true,
        last_login: new Date().toISOString()
    },
    {
        id: "demo-user-2",
        email: "michael.r@mountainview.clinic",
        first_name: "Michael",
        last_name: "Reynolds",
        role: "USER",
        specialty: "Geriatric",
        is_active: true,
        last_login: new Date(Date.now() - 86400000).toISOString()
    },
    {
        id: "demo-user-3",
        email: "admin@chartspark.com",
        first_name: "Clinic",
        last_name: "Admin",
        role: "ADMIN",
        specialty: "Both",
        is_active: true,
        last_login: new Date().toISOString()
    },
    {
        id: "demo-user-4",
        email: "lisa.t@mountainview.clinic",
        first_name: "Lisa",
        last_name: "Thompson",
        role: "USER",
        specialty: "Mental Health",
        is_active: false,
        last_login: new Date(Date.now() - 604800000).toISOString()
    },
];

export default function AdminUsersPage() {
    const supabase = createClient();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [organizationId, setOrganizationId] = useState<string | null>(null);
    const [isDemo, setIsDemo] = useState(false);

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        specialty: "both",
    });

    useEffect(() => {
        fetchCurrentUserOrg();
    }, []);

    const fetchCurrentUserOrg = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile, error } = await supabase
                    .from('users')
                    .select('organization_id')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;

                if (profile?.organization_id) {
                    setOrganizationId(profile.organization_id);
                    fetchUsers(profile.organization_id);
                } else {
                    // No org found, use demo data
                    console.log("[Admin Users] No organization found, using demo data");
                    setIsDemo(true);
                    setUsers(demoUsers);
                    setLoading(false);
                }
            } else {
                // No user, use demo data
                console.log("[Admin Users] No user session, using demo data");
                setIsDemo(true);
                setUsers(demoUsers);
                setLoading(false);
            }
        } catch (error) {
            console.error("[Admin Users] Error fetching org, using demo data:", error);
            setIsDemo(true);
            setUsers(demoUsers);
            setLoading(false);
        }
    };

    const fetchUsers = async (orgId: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('organization_id', orgId)
                .in('role', ['USER', 'ADMIN']) // Admin can only see their org's admins and users
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data && data.length > 0) {
                setUsers(data);
            } else {
                // No users found, use demo data
                console.log("[Admin Users] No users in database, using demo data");
                setIsDemo(true);
                setUsers(demoUsers);
            }
        } catch (error) {
            console.error("[Admin Users] Error fetching users, using demo data:", error);
            setIsDemo(true);
            setUsers(demoUsers);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setFormData({
            first_name: user.first_name || "",
            last_name: user.last_name || "",
            specialty: user.specialty || "both",
        });
        setShowEditModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        try {
            const { error } = await supabase
                .from('users')
                .update({
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    specialty: formData.specialty,
                })
                .eq('id', editingUser.id);

            if (error) throw error;

            setShowEditModal(false);
            setEditingUser(null);
            if (organizationId) fetchUsers(organizationId);
        } catch (error) {
            console.error("Error updating user:", error);
            alert("Failed to update user");
        }
    };

    const handleToggleActive = async (user: User) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ is_active: !user.is_active })
                .eq('id', user.id);

            if (error) throw error;
            if (organizationId) fetchUsers(organizationId);
        } catch (error) {
            console.error("Error toggling user status:", error);
        }
    };

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.first_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (user.last_name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                        Users
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Manage users in your organization
                    </p>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 mb-6">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> New users are created through Supabase Auth.
                    Contact your Super Admin to add new users to the organization.
                </p>
            </div>

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
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Specialty</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Last Login</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    Loading users...
                                </td>
                            </tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    No users found
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${user.role === 'ADMIN' ? 'bg-blue-600' : 'bg-teal-600'
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
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.role === 'ADMIN'
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                                            : 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                        {user.specialty || '—'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleToggleActive(user)}
                                            className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full transition-colors ${user.is_active
                                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                                : 'bg-red-100 text-red-700 hover:bg-red-200'
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
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
            {showEditModal && editingUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                Edit User
                            </h2>
                            <button
                                onClick={() => setShowEditModal(false)}
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
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-50 transition-colors"
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
