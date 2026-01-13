"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getUserFeaturesWithStatus, toggleUserFeature } from "@/lib/features/assign-defaults";
import {
    ArrowLeft,
    Check,
    Lock,
    Save,
    Zap,
    User,
    Clock,
    AlertTriangle,
    Calendar,
    RefreshCw,
    Shield,
} from "lucide-react";
import Link from "next/link";
import { FeatureBadge } from "@/components/FeatureGate";
import type { FeatureTier, FeatureCategory } from "@/types/database";

interface FeatureWithStatus {
    id: string;
    code: string;
    name: string;
    description: string;
    tier_required: FeatureTier;
    category: FeatureCategory;
    display_order: number;
    enabled: boolean;
    is_tier_override: boolean;
    override_reason: string | null;
    expires_at: string | null;
    granted_at: string | null;
}

interface UserData {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
    organization_id: string | null;
}

interface OrgData {
    id: string;
    name: string;
    subscription_tier: string;
}

// Demo data
const demoFeatures: FeatureWithStatus[] = [
    { id: '1', code: 'DASHBOARD', name: 'Dashboard Access', description: 'Basic dashboard with stats', tier_required: 'STARTER', category: 'CORE', display_order: 1, enabled: true, is_tier_override: false, override_reason: null, expires_at: null, granted_at: null },
    { id: '2', code: 'AI_DIAGNOSIS', name: 'AI Diagnostic Assistant', description: 'AI-powered diagnosis suggestions', tier_required: 'PROFESSIONAL', category: 'AI', display_order: 23, enabled: false, is_tier_override: false, override_reason: null, expires_at: null, granted_at: null },
    { id: '3', code: 'E_PRESCRIBE', name: 'E-Prescribe', description: 'Electronic prescribing', tier_required: 'COMPLETE', category: 'INTEGRATION', display_order: 40, enabled: false, is_tier_override: false, override_reason: null, expires_at: null, granted_at: null },
];

const CATEGORY_ORDER: FeatureCategory[] = ['CORE', 'CLINICAL', 'AI', 'INTEGRATION', 'ADMIN', 'SUPER_ADMIN'];

const CATEGORY_LABELS: Record<FeatureCategory, string> = {
    'CORE': 'Core Features',
    'CLINICAL': 'Clinical Features',
    'AI': 'AI Features',
    'INTEGRATION': 'Integration Features',
    'ADMIN': 'Admin Features',
    'SUPER_ADMIN': 'Super Admin Features',
};

const TIER_INCLUDES: Record<string, FeatureTier[]> = {
    'starter': ['STARTER'],
    'pro': ['STARTER', 'PROFESSIONAL'],
    'complete': ['STARTER', 'PROFESSIONAL', 'COMPLETE'],
};

export default function SuperAdminUserFeaturesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: userId } = use(params);
    const router = useRouter();
    const supabase = createClient();

    const [user, setUser] = useState<UserData | null>(null);
    const [org, setOrg] = useState<OrgData | null>(null);
    const [features, setFeatures] = useState<FeatureWithStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pendingChanges, setPendingChanges] = useState<Map<string, { enabled: boolean; isOverride: boolean; reason?: string; expiresAt?: string }>>(new Map());
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Override modal state
    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [overrideFeature, setOverrideFeature] = useState<FeatureWithStatus | null>(null);
    const [overrideReason, setOverrideReason] = useState("");
    const [overrideExpiry, setOverrideExpiry] = useState("");

    useEffect(() => {
        fetchData();
    }, [userId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (!supabase) {
                setUser({ id: userId, email: 'demo@clinic.com', first_name: 'Demo', last_name: 'User', role: 'USER', organization_id: null });
                setOrg({ id: '1', name: 'Demo Clinic', subscription_tier: 'pro' });
                setFeatures(demoFeatures);
                setLoading(false);
                return;
            }

            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
                setCurrentUserId(authUser.id);
            }

            // Get target user
            const { data: userData } = await supabase
                .from('users')
                .select('id, email, first_name, last_name, role, organization_id')
                .eq('id', userId)
                .single();

            if (!userData) {
                setUser({ id: userId, email: 'demo@clinic.com', first_name: 'Demo', last_name: 'User', role: 'USER', organization_id: null });
                setFeatures(demoFeatures);
                setLoading(false);
                return;
            }

            setUser(userData);

            // Get organization
            if (userData.organization_id) {
                const { data: orgData } = await supabase
                    .from('organizations')
                    .select('id, name, subscription_tier')
                    .eq('id', userData.organization_id)
                    .single();

                if (orgData) {
                    setOrg(orgData);
                }
            }

            // Get features with status
            const { features: featuresData, error } = await getUserFeaturesWithStatus(userId);

            if (error || !featuresData.length) {
                setFeatures(demoFeatures);
            } else {
                setFeatures(featuresData);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            setFeatures(demoFeatures);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (featureId: string) => {
        const feature = features.find(f => f.id === featureId);
        if (!feature) return;

        const allowedTiers = TIER_INCLUDES[org?.subscription_tier || 'pro'] || ['STARTER'];
        const isWithinTier = allowedTiers.includes(feature.tier_required);

        if (!isWithinTier) {
            // This is a tier override - show modal
            setOverrideFeature(feature);
            setOverrideReason("");
            setOverrideExpiry("");
            setShowOverrideModal(true);
            return;
        }

        const newValue = !feature.enabled;
        setFeatures(prev => prev.map(f =>
            f.id === featureId ? { ...f, enabled: newValue } : f
        ));
        setPendingChanges(prev => new Map(prev).set(featureId, { enabled: newValue, isOverride: false }));
    };

    const handleOverrideConfirm = () => {
        if (!overrideFeature || !overrideReason.trim()) {
            alert('Please provide a reason for the override');
            return;
        }

        setFeatures(prev => prev.map(f =>
            f.id === overrideFeature.id
                ? { ...f, enabled: true, is_tier_override: true, override_reason: overrideReason, expires_at: overrideExpiry || null }
                : f
        ));

        setPendingChanges(prev => new Map(prev).set(overrideFeature.id, {
            enabled: true,
            isOverride: true,
            reason: overrideReason,
            expiresAt: overrideExpiry || undefined
        }));

        setShowOverrideModal(false);
        setOverrideFeature(null);
    };

    const handleSave = async () => {
        if (pendingChanges.size === 0) return;

        setSaving(true);
        try {
            for (const [featureId, change] of pendingChanges) {
                await toggleUserFeature(
                    userId,
                    featureId,
                    change.enabled,
                    currentUserId || userId,
                    {
                        isTierOverride: change.isOverride,
                        overrideReason: change.reason,
                        expiresAt: change.expiresAt
                    }
                );
            }
            setPendingChanges(new Map());
            alert('Features updated successfully');
        } catch (error) {
            console.error('Error saving features:', error);
            alert('Error saving features');
        } finally {
            setSaving(false);
        }
    };

    const handleEnableAllForTier = () => {
        const allowedTiers = TIER_INCLUDES[org?.subscription_tier || 'pro'] || ['STARTER'];
        setFeatures(prev => prev.map(f => {
            if (allowedTiers.includes(f.tier_required)) {
                setPendingChanges(changes => new Map(changes).set(f.id, { enabled: true, isOverride: false }));
                return { ...f, enabled: true };
            }
            return f;
        }));
    };

    const handleResetToDefaults = () => {
        const allowedTiers = TIER_INCLUDES[org?.subscription_tier || 'pro'] || ['STARTER'];
        setFeatures(prev => prev.map(f => {
            const shouldEnable = allowedTiers.includes(f.tier_required);
            setPendingChanges(changes => new Map(changes).set(f.id, { enabled: shouldEnable, isOverride: false }));
            return { ...f, enabled: shouldEnable, is_tier_override: false };
        }));
    };

    // Group features by category
    const groupedFeatures = CATEGORY_ORDER.reduce((acc, category) => {
        const categoryFeatures = features.filter(f => f.category === category);
        if (categoryFeatures.length > 0) {
            acc[category] = categoryFeatures.sort((a, b) => a.display_order - b.display_order);
        }
        return acc;
    }, {} as Record<FeatureCategory, FeatureWithStatus[]>);

    const allowedTiers = TIER_INCLUDES[org?.subscription_tier || 'pro'] || ['STARTER'];
    const enabledCount = features.filter(f => f.enabled).length;
    const overrideCount = features.filter(f => f.is_tier_override && f.enabled).length;

    if (loading) {
        return (
            <div className="flex-1 p-6 lg:p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-500">Loading user features...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Super Admin Banner */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-4 mb-6 text-white flex items-center gap-3">
                <Shield className="h-6 w-6" />
                <div>
                    <p className="font-bold">Super Admin Mode</p>
                    <p className="text-sm opacity-80">You can override tier restrictions for this user</p>
                </div>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link
                        href="/super-admin/users"
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Manage Features
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <User className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-500">
                                {user?.first_name} {user?.last_name} ({user?.email})
                            </span>
                            {org && (
                                <span className="text-slate-400">• {org.name}</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        disabled={saving || pendingChanges.size === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                        <Save className="h-5 w-5" />
                        {saving ? 'Saving...' : `Save Changes${pendingChanges.size > 0 ? ` (${pendingChanges.size})` : ''}`}
                    </button>
                </div>
            </div>

            {/* Stats Banner */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                            <Zap className="h-5 w-5 text-teal-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{enabledCount}</p>
                            <p className="text-sm text-slate-500">Features Enabled</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{overrideCount}</p>
                            <p className="text-sm text-slate-500">Tier Overrides</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white capitalize">{user?.role}</p>
                            <p className="text-sm text-slate-500">User Role</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <Lock className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white capitalize">{org?.subscription_tier || 'pro'}</p>
                            <p className="text-sm text-slate-500">Org Tier</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-slate-500" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Quick Actions</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleEnableAllForTier}
                        className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-white dark:hover:bg-slate-800"
                    >
                        Enable All for Tier
                    </button>
                    <button
                        onClick={handleResetToDefaults}
                        className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-white dark:hover:bg-slate-800"
                    >
                        Reset to Defaults
                    </button>
                </div>
            </div>

            {/* Feature Categories */}
            <div className="space-y-6">
                {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => {
                    const categoryTier = categoryFeatures[0]?.tier_required;
                    const isAboveTier = !allowedTiers.includes(categoryTier);

                    return (
                        <div key={category} className={`bg-white dark:bg-slate-900 rounded-2xl border overflow-hidden ${isAboveTier
                                ? 'border-amber-200 dark:border-amber-900'
                                : 'border-slate-200 dark:border-slate-800'
                            }`}>
                            <div className={`px-6 py-4 border-b flex items-center justify-between ${isAboveTier
                                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900'
                                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'
                                }`}>
                                <div className="flex items-center gap-3">
                                    <h2 className="font-bold text-slate-900 dark:text-white">
                                        {CATEGORY_LABELS[category as FeatureCategory]}
                                    </h2>
                                    <FeatureBadge tier={categoryTier} size="sm" />
                                </div>
                                {isAboveTier && (
                                    <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span>Above org tier - Override required</span>
                                    </div>
                                )}
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {categoryFeatures.map(feature => {
                                        const isWithinTier = allowedTiers.includes(feature.tier_required);

                                        return (
                                            <div
                                                key={feature.id}
                                                className={`p-4 rounded-xl border transition-all ${feature.enabled
                                                        ? feature.is_tier_override
                                                            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                                                            : 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800'
                                                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="font-medium text-slate-900 dark:text-white">
                                                                {feature.name}
                                                            </p>
                                                            {feature.is_tier_override && (
                                                                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-200 text-amber-800 rounded">
                                                                    OVERRIDE
                                                                </span>
                                                            )}
                                                            {feature.expires_at && (
                                                                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-100 text-blue-700 rounded flex items-center gap-1">
                                                                    <Calendar className="h-3 w-3" />
                                                                    {new Date(feature.expires_at).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-slate-500 mt-1">
                                                            {feature.description}
                                                        </p>
                                                        {feature.override_reason && (
                                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 italic">
                                                                "{feature.override_reason}"
                                                            </p>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => handleToggle(feature.id)}
                                                        className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${feature.enabled
                                                                ? feature.is_tier_override
                                                                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                                                                    : 'bg-teal-600 text-white hover:bg-teal-700'
                                                                : isWithinTier
                                                                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
                                                                    : 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 hover:bg-amber-200 dark:hover:bg-amber-900'
                                                            }`}
                                                    >
                                                        {feature.enabled ? (
                                                            <Check className="h-4 w-4" />
                                                        ) : isWithinTier ? (
                                                            <Check className="h-4 w-4" />
                                                        ) : (
                                                            <Lock className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Override Modal */}
            {showOverrideModal && overrideFeature && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <AlertTriangle className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">Tier Override</h3>
                                <p className="text-sm text-slate-500">Grant feature above subscription tier</p>
                            </div>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900 rounded-xl p-4 mb-4">
                            <p className="font-medium text-amber-800 dark:text-amber-300">{overrideFeature.name}</p>
                            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                                Requires {overrideFeature.tier_required} tier (Org has {org?.subscription_tier || 'pro'})
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Override Reason <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={overrideReason}
                                    onChange={(e) => setOverrideReason(e.target.value)}
                                    placeholder="e.g., 30-day trial for evaluation"
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                                    rows={2}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Expiration Date (optional)
                                </label>
                                <input
                                    type="date"
                                    value={overrideExpiry}
                                    onChange={(e) => setOverrideExpiry(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mt-6">
                            <button
                                onClick={() => setShowOverrideModal(false)}
                                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleOverrideConfirm}
                                className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium"
                            >
                                Grant Override
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pending Changes Alert */}
            {pendingChanges.size > 0 && (
                <div className="fixed bottom-6 right-6 bg-purple-100 dark:bg-purple-900/50 border border-purple-200 dark:border-purple-800 rounded-xl p-4 shadow-lg">
                    <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-purple-600" />
                        <span className="text-purple-800 dark:text-purple-200 font-medium">
                            {pendingChanges.size} unsaved change{pendingChanges.size !== 1 ? 's' : ''}
                        </span>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium"
                        >
                            {saving ? 'Saving...' : 'Save Now'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
