"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    Building2,
    Plus,
    Search,
    MoreHorizontal,
    Edit,
    Trash2,
    Users,
    CheckCircle,
    XCircle,
    X,
} from "lucide-react";

interface Organization {
    id: string;
    name: string;
    slug: string;
    subscription_tier: string;
    platform_fee_percentage: number;
    fee_collection_method: string;
    is_active: boolean;
    created_at: string;
    user_count?: number;
}

export default function OrganizationsPage() {
    const supabase = createClient();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        subscription_tier: "PROFESSIONAL",
        platform_fee_percentage: 1.0,
        fee_collection_method: "DEDUCT",
    });

    useEffect(() => {
        fetchOrganizations();
    }, []);

    const fetchOrganizations = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('organizations')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Get user counts for each org
            const orgsWithCounts = await Promise.all(
                (data || []).map(async (org: { id: string; name: string; slug: string; subscription_tier: string; platform_fee_percentage: number; fee_collection_method: string; is_active: boolean; created_at: string }) => {
                    const { count } = await supabase
                        .from('users')
                        .select('*', { count: 'exact', head: true })
                        .eq('organization_id', org.id);
                    return { ...org, user_count: count || 0 };
                })
            );

            setOrganizations(orgsWithCounts);
        } catch (error) {
            console.error("Error fetching organizations:", error);
        } finally {
            setLoading(false);
        }
    };

    const generateSlug = (name: string) => {
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    };

    const handleNameChange = (name: string) => {
        setFormData({
            ...formData,
            name,
            slug: editingOrg ? formData.slug : generateSlug(name),
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingOrg) {
                // Update existing
                const { error } = await supabase
                    .from('organizations')
                    .update({
                        name: formData.name,
                        subscription_tier: formData.subscription_tier,
                        platform_fee_percentage: formData.platform_fee_percentage,
                        fee_collection_method: formData.fee_collection_method,
                    })
                    .eq('id', editingOrg.id);

                if (error) throw error;
            } else {
                // Create new
                const { error } = await supabase
                    .from('organizations')
                    .insert({
                        name: formData.name,
                        slug: formData.slug,
                        subscription_tier: formData.subscription_tier,
                        platform_fee_percentage: formData.platform_fee_percentage,
                        fee_collection_method: formData.fee_collection_method,
                    });

                if (error) throw error;
            }

            setShowCreateModal(false);
            setEditingOrg(null);
            setFormData({
                name: "",
                slug: "",
                subscription_tier: "PROFESSIONAL",
                platform_fee_percentage: 1.0,
                fee_collection_method: "DEDUCT",
            });
            fetchOrganizations();
        } catch (error) {
            console.error("Error saving organization:", error);
            alert("Failed to save organization");
        }
    };

    const handleEdit = (org: Organization) => {
        setEditingOrg(org);
        setFormData({
            name: org.name,
            slug: org.slug,
            subscription_tier: org.subscription_tier,
            platform_fee_percentage: org.platform_fee_percentage,
            fee_collection_method: org.fee_collection_method,
        });
        setShowCreateModal(true);
    };

    const handleToggleActive = async (org: Organization) => {
        try {
            const { error } = await supabase
                .from('organizations')
                .update({ is_active: !org.is_active })
                .eq('id', org.id);

            if (error) throw error;
            fetchOrganizations();
        } catch (error) {
            console.error("Error toggling organization status:", error);
        }
    };

    const filteredOrgs = organizations.filter(org =>
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                        Organizations
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Manage all organizations on the platform
                    </p>
                </div>
                <button
                    onClick={() => {
                        setEditingOrg(null);
                        setFormData({
                            name: "",
                            slug: "",
                            subscription_tier: "PROFESSIONAL",
                            platform_fee_percentage: 1.0,
                            fee_collection_method: "DEDUCT",
                        });
                        setShowCreateModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
                >
                    <Plus className="h-5 w-5" />
                    Create Organization
                </button>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search organizations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Organization</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tier</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Users</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Platform Fee</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    Loading organizations...
                                </td>
                            </tr>
                        ) : filteredOrgs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    No organizations found
                                </td>
                            </tr>
                        ) : (
                            filteredOrgs.map((org) => (
                                <tr key={org.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                                                <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white">{org.name}</p>
                                                <p className="text-xs text-slate-500">{org.slug}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${org.subscription_tier === 'COMPLETE'
                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'
                                            : org.subscription_tier === 'PROFESSIONAL'
                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                                                : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400'
                                            }`}>
                                            {org.subscription_tier}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                            <Users className="h-4 w-4" />
                                            {org.user_count}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                        {org.platform_fee_percentage}%
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleToggleActive(org)}
                                            className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full transition-colors ${org.is_active
                                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400'
                                                : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-400'
                                                }`}
                                        >
                                            {org.is_active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                            {org.is_active ? 'Active' : 'Inactive'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleEdit(org)}
                                            className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
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

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {editingOrg ? 'Edit Organization' : 'Create Organization'}
                            </h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Organization Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Slug
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    disabled={!!editingOrg}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Subscription Tier
                                </label>
                                <select
                                    value={formData.subscription_tier}
                                    onChange={(e) => setFormData({ ...formData, subscription_tier: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                                >
                                    <option value="STARTER">Starter</option>
                                    <option value="PROFESSIONAL">Professional</option>
                                    <option value="COMPLETE">Complete</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Platform Fee %
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="10"
                                    value={formData.platform_fee_percentage}
                                    onChange={(e) => setFormData({ ...formData, platform_fee_percentage: parseFloat(e.target.value) })}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Fee Collection Method
                                </label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="feeMethod"
                                            value="DEDUCT"
                                            checked={formData.fee_collection_method === 'DEDUCT'}
                                            onChange={(e) => setFormData({ ...formData, fee_collection_method: e.target.value })}
                                            className="text-purple-600"
                                        />
                                        <span className="text-sm text-slate-600 dark:text-slate-400">Deduct from payment</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="feeMethod"
                                            value="INVOICE"
                                            checked={formData.fee_collection_method === 'INVOICE'}
                                            onChange={(e) => setFormData({ ...formData, fee_collection_method: e.target.value })}
                                            className="text-purple-600"
                                        />
                                        <span className="text-sm text-slate-600 dark:text-slate-400">Invoice separately</span>
                                    </label>
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
                                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
                                >
                                    {editingOrg ? 'Save Changes' : 'Create Organization'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
