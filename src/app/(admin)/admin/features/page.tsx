"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    Zap,
    Lock,
    Check,
    Save,
    Users,
} from "lucide-react";

interface UserFeature {
    userId: string;
    userName: string;
    email: string;
    role: string;
    subscription_tier: string;
    features: {
        ai_clinical: boolean;
        treatment_planner: boolean;
        telehealth: boolean;
        e_prescribe: boolean;
        analytics: boolean;
    };
}

const FEATURES = [
    { key: 'ai_clinical', label: 'Clinical AI', tier: 'COMPLETE', description: 'AI-powered diagnostic assistance' },
    { key: 'treatment_planner', label: 'Treatment Planner', tier: 'COMPLETE', description: 'AI treatment plan generation' },
    { key: 'telehealth', label: 'Telehealth', tier: 'PROFESSIONAL', description: 'Video consultation integration' },
    { key: 'e_prescribe', label: 'E-Prescribe', tier: 'COMPLETE', description: 'Electronic prescription management' },
    { key: 'analytics', label: 'Analytics', tier: 'COMPLETE', description: 'Advanced patient analytics' },
];

export default function AdminFeaturesPage() {
    const supabase = createClient();
    const [users, setUsers] = useState<UserFeature[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [organizationId, setOrganizationId] = useState<string | null>(null);
    const [orgTier, setOrgTier] = useState<string>('PROFESSIONAL');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('users')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (!profile?.organization_id) return;
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

            // Get users
            const { data: usersData } = await supabase
                .from('users')
                .select('id, email, first_name, last_name, role, subscription_tier')
                .eq('organization_id', profile.organization_id)
                .eq('is_active', true);

            // Demo feature assignment (in production, this would come from a features table)
            const usersWithFeatures = (usersData || []).map(u => ({
                userId: u.id,
                userName: `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'No Name',
                email: u.email,
                role: u.role,
                subscription_tier: u.subscription_tier || 'PROFESSIONAL',
                features: {
                    ai_clinical: u.subscription_tier === 'COMPLETE',
                    treatment_planner: u.subscription_tier === 'COMPLETE',
                    telehealth: u.subscription_tier === 'PROFESSIONAL' || u.subscription_tier === 'COMPLETE',
                    e_prescribe: u.subscription_tier === 'COMPLETE',
                    analytics: u.subscription_tier === 'COMPLETE',
                },
            }));

            setUsers(usersWithFeatures);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleFeature = (userId: string, featureKey: string) => {
        setUsers(prev => prev.map(u => {
            if (u.userId === userId) {
                return {
                    ...u,
                    features: {
                        ...u.features,
                        [featureKey]: !u.features[featureKey as keyof typeof u.features],
                    },
                };
            }
            return u;
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        // In production, this would save feature assignments to the database
        setTimeout(() => {
            setSaving(false);
            alert("Feature assignments saved (demo mode)");
        }, 1000);
    };

    const getFeatureTierBadge = (tier: string) => {
        if (tier === 'COMPLETE') {
            return <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-purple-100 text-purple-700">ELITE</span>;
        }
        return <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-700">PRO</span>;
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
                        Assign features to users based on their subscription tier
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                    <Save className="h-5 w-5" />
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {/* Organization Tier Banner */}
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl p-6 mb-8 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm opacity-80">Organization Tier</p>
                        <p className="text-2xl font-bold">{orgTier}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm opacity-80">Available Features</p>
                        <p className="text-2xl font-bold">
                            {FEATURES.filter(f =>
                                orgTier === 'COMPLETE' ||
                                (orgTier === 'PROFESSIONAL' && f.tier === 'PROFESSIONAL') ||
                                orgTier === 'STARTER'
                            ).length} / {FEATURES.length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Features Legend */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                {FEATURES.map(feature => (
                    <div key={feature.key} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <Zap className="h-5 w-5 text-teal-600" />
                            {getFeatureTierBadge(feature.tier)}
                        </div>
                        <p className="font-medium text-slate-900 dark:text-white">{feature.label}</p>
                        <p className="text-xs text-slate-500 mt-1">{feature.description}</p>
                    </div>
                ))}
            </div>

            {/* Users Feature Grid */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                            {FEATURES.map(f => (
                                <th key={f.key} className="px-4 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    {f.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    Loading users...
                                </td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    No users found
                                </td>
                            </tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user.userId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-sm font-bold">
                                                {user.userName[0]}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white">{user.userName}</p>
                                                <p className="text-xs text-slate-500">{user.subscription_tier}</p>
                                            </div>
                                        </div>
                                    </td>
                                    {FEATURES.map(feature => {
                                        const isEnabled = user.features[feature.key as keyof typeof user.features];
                                        const canEnable = orgTier === 'COMPLETE' ||
                                            (orgTier === 'PROFESSIONAL' && feature.tier === 'PROFESSIONAL');

                                        return (
                                            <td key={feature.key} className="px-4 py-4 text-center">
                                                {canEnable ? (
                                                    <button
                                                        onClick={() => handleToggleFeature(user.userId, feature.key)}
                                                        className={`h-8 w-8 rounded-lg flex items-center justify-center mx-auto transition-colors ${isEnabled
                                                                ? 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                                                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                                            }`}
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </button>
                                                ) : (
                                                    <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center mx-auto">
                                                        <Lock className="h-4 w-4 text-slate-300" />
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
