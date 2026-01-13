"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toggleUserFeature, getUserFeaturesWithStatus } from "@/lib/features/assign-defaults";
import {
    Zap,
    Lock,
    Check,
    Save,
    Users,
    ChevronRight,
    Search,
    RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { FeatureBadge } from "@/components/FeatureGate";
import type { FeatureTier } from "@/types/database";

interface UserWithFeatures {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
    featureCount: number;
    totalFeatures: number;
}

// Demo data for when database is unavailable
const demoUsers: UserWithFeatures[] = [
    { id: 'demo-1', email: 'sarah.k@clinic.com', first_name: 'Sarah', last_name: 'Kowalski', role: 'USER', featureCount: 18, totalFeatures: 21 },
    { id: 'demo-2', email: 'mike.j@clinic.com', first_name: 'Mike', last_name: 'Johnson', role: 'USER', featureCount: 11, totalFeatures: 11 },
    { id: 'demo-3', email: 'admin@clinic.com', first_name: 'Admin', last_name: 'User', role: 'ADMIN', featureCount: 27, totalFeatures: 27 },
];

export default function AdminFeaturesPage() {
    const supabase = createClient();
    const [users, setUsers] = useState<UserWithFeatures[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [organizationId, setOrganizationId] = useState<string | null>(null);
    const [orgTier, setOrgTier] = useState<string>('pro');
    const [totalFeatures, setTotalFeatures] = useState(0);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (!supabase) {
                // Demo mode
                setUsers(demoUsers);
                setOrgTier('pro');
                setTotalFeatures(21);
                setLoading(false);
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setUsers(demoUsers);
                setLoading(false);
                return;
            }

            const { data: profile } = await supabase
                .from('users')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (!profile?.organization_id) {
                setUsers(demoUsers);
                setLoading(false);
                return;
            }

            setOrganizationId(profile.organization_id);

            // Get org tier
            const { data: orgData } = await supabase
                .from('organizations')
                .select('subscription_tier')
                .eq('id', profile.organization_id)
                .single();

            if (orgData) {
                setOrgTier(orgData.subscription_tier);
            }

            // Get total features count
            const { count: featuresCount } = await supabase
                .from('features')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            setTotalFeatures(featuresCount || 21);

            // Get users in organization
            const { data: usersData } = await supabase
                .from('users')
                .select('id, email, first_name, last_name, role')
                .eq('organization_id', profile.organization_id);

            if (!usersData || usersData.length === 0) {
                setUsers(demoUsers);
                setLoading(false);
                return;
            }

            // Get feature counts for each user
            const usersWithCounts = await Promise.all(
                usersData.map(async (u: { id: string; email: string; first_name: string | null; last_name: string | null; role: string }) => {
                    const { count } = await supabase
                        .from('user_features')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', u.id)
                        .eq('enabled', true);

                    return {
                        ...u,
                        featureCount: count || 0,
                        totalFeatures: featuresCount || 21,
                    };
                })
            );

            setUsers(usersWithCounts);
        } catch (error) {
            console.error("Error fetching data:", error);
            setUsers(demoUsers);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user => {
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
        const email = user.email.toLowerCase();
        const query = searchQuery.toLowerCase();
        return fullName.includes(query) || email.includes(query);
    });

    const getTierBadge = (tier: string) => {
        const tierMap: Record<string, FeatureTier> = {
            'starter': 'STARTER',
            'pro': 'PROFESSIONAL',
            'complete': 'COMPLETE',
        };
        return <FeatureBadge tier={tierMap[tier] || 'PROFESSIONAL'} size="md" />;
    };

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                        Feature Management
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Assign features to users in your organization
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Organization Tier Banner */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 mb-8 text-white shadow-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm opacity-80 font-medium">Organization Tier</p>
                        <div className="flex items-center gap-3 mt-1">
                            <p className="text-2xl font-bold capitalize">{orgTier}</p>
                            {getTierBadge(orgTier)}
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm opacity-80 font-medium">Total Platform Features</p>
                        <p className="text-2xl font-bold">{totalFeatures}</p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                </div>
            </div>

            {/* Users List */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-slate-500" />
                        <h2 className="font-bold text-slate-900 dark:text-white">Organization Users</h2>
                        <span className="px-2 py-0.5 text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">
                            {filteredUsers.length}
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-slate-500">Loading users...</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-12 text-center">
                        <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No users found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredUsers.map((user) => (
                            <Link
                                key={user.id}
                                href={`/admin/users/${user.id}/features`}
                                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                        {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white">
                                            {user.first_name && user.last_name
                                                ? `${user.first_name} ${user.last_name}`
                                                : user.email}
                                        </p>
                                        <p className="text-sm text-slate-500">{user.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="flex items-center gap-2">
                                            <Zap className="h-4 w-4 text-teal-500" />
                                            <span className="font-bold text-slate-900 dark:text-white">
                                                {user.featureCount}
                                            </span>
                                            <span className="text-slate-400">/</span>
                                            <span className="text-slate-500">{user.totalFeatures}</span>
                                        </div>
                                        <p className="text-xs text-slate-500">Features enabled</p>
                                    </div>
                                    <span className={`px-2 py-1 text-xs font-bold rounded-lg ${user.role === 'ADMIN'
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                        : user.role === 'SUPER_ADMIN'
                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                        }`}>
                                        {user.role}
                                    </span>
                                    <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Info Card */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl">
                <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                        <p className="font-medium text-blue-900 dark:text-blue-300">Feature Assignment</p>
                        <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                            Click on a user to manage their individual feature access. Features can be enabled or disabled based on your organization's subscription tier.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
