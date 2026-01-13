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
    RefreshCw,
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
    granted_at: string | null;
}

interface UserData {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
}

// Demo features for fallback
const demoFeatures: FeatureWithStatus[] = [
    { id: '1', code: 'DASHBOARD', name: 'Dashboard Access', description: 'Basic dashboard with stats', tier_required: 'STARTER', category: 'CORE', display_order: 1, enabled: true, is_tier_override: false, granted_at: null },
    { id: '2', code: 'PATIENTS_VIEW', name: 'View Patients', description: 'View patient list and details', tier_required: 'STARTER', category: 'CORE', display_order: 2, enabled: true, is_tier_override: false, granted_at: null },
    { id: '3', code: 'CALENDAR', name: 'Calendar/Scheduling', description: 'Appointment scheduling', tier_required: 'PROFESSIONAL', category: 'CLINICAL', display_order: 20, enabled: true, is_tier_override: false, granted_at: null },
    { id: '4', code: 'AI_NOTE_GENERATION', name: 'AI Note Generation', description: 'AI-powered note writing', tier_required: 'PROFESSIONAL', category: 'AI', display_order: 22, enabled: false, is_tier_override: false, granted_at: null },
    { id: '5', code: 'E_PRESCRIBE', name: 'E-Prescribe', description: 'Electronic prescribing', tier_required: 'COMPLETE', category: 'INTEGRATION', display_order: 40, enabled: false, is_tier_override: false, granted_at: null },
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

// Tier hierarchy for determining if a feature is within user's tier
const TIER_INCLUDES: Record<string, FeatureTier[]> = {
    'starter': ['STARTER'],
    'pro': ['STARTER', 'PROFESSIONAL'],
    'complete': ['STARTER', 'PROFESSIONAL', 'COMPLETE'],
};

export default function UserFeaturesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: userId } = use(params);
    const router = useRouter();
    const supabase = createClient();

    const [user, setUser] = useState<UserData | null>(null);
    const [features, setFeatures] = useState<FeatureWithStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [orgTier, setOrgTier] = useState<string>('pro');
    const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(new Map());
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, [userId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (!supabase) {
                setUser({ id: userId, email: 'demo@clinic.com', first_name: 'Demo', last_name: 'User', role: 'USER' });
                setFeatures(demoFeatures);
                setLoading(false);
                return;
            }

            // Get current user
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
                setUser({ id: userId, email: 'demo@clinic.com', first_name: 'Demo', last_name: 'User', role: 'USER' });
                setFeatures(demoFeatures);
                setLoading(false);
                return;
            }

            setUser(userData);

            // Get org tier
            if (userData.organization_id) {
                const { data: orgData } = await supabase
                    .from('organizations')
                    .select('subscription_tier')
                    .eq('id', userData.organization_id)
                    .single();

                if (orgData) {
                    setOrgTier(orgData.subscription_tier);
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

        // Check if within tier
        const allowedTiers = TIER_INCLUDES[orgTier] || ['STARTER'];
        if (!allowedTiers.includes(feature.tier_required)) {
            return; // Cannot toggle features above tier
        }

        const newValue = !feature.enabled;
        setFeatures(prev => prev.map(f =>
            f.id === featureId ? { ...f, enabled: newValue } : f
        ));
        setPendingChanges(prev => new Map(prev).set(featureId, newValue));
    };

    const handleSave = async () => {
        if (pendingChanges.size === 0) return;

        setSaving(true);
        try {
            for (const [featureId, enabled] of pendingChanges) {
                await toggleUserFeature(userId, featureId, enabled, currentUserId || userId);
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

    const handleEnableAll = () => {
        const allowedTiers = TIER_INCLUDES[orgTier] || ['STARTER'];
        setFeatures(prev => prev.map(f => {
            if (allowedTiers.includes(f.tier_required)) {
                setPendingChanges(changes => new Map(changes).set(f.id, true));
                return { ...f, enabled: true };
            }
            return f;
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

    const allowedTiers = TIER_INCLUDES[orgTier] || ['STARTER'];
    const enabledCount = features.filter(f => f.enabled).length;

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
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/features"
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
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleEnableAll}
                        className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        Enable All for Tier
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || pendingChanges.size === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                        <Save className="h-5 w-5" />
                        {saving ? 'Saving...' : `Save Changes${pendingChanges.size > 0 ? ` (${pendingChanges.size})` : ''}`}
                    </button>
                </div>
            </div>

            {/* Stats Banner */}
            <div className="grid grid-cols-3 gap-4 mb-8">
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
                            <p className="text-2xl font-bold text-slate-900 dark:text-white capitalize">{orgTier}</p>
                            <p className="text-sm text-slate-500">Organization Tier</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Feature Categories */}
            <div className="space-y-6">
                {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => {
                    const categoryTier = categoryFeatures[0]?.tier_required;
                    const isLocked = !allowedTiers.includes(categoryTier);

                    return (
                        <div key={category} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <h2 className="font-bold text-slate-900 dark:text-white">
                                        {CATEGORY_LABELS[category as FeatureCategory]}
                                    </h2>
                                    <FeatureBadge tier={categoryTier} size="sm" />
                                </div>
                                {isLocked && (
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <Lock className="h-4 w-4" />
                                        <span>Requires {categoryTier} tier</span>
                                    </div>
                                )}
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {categoryFeatures.map(feature => {
                                        const canToggle = allowedTiers.includes(feature.tier_required);

                                        return (
                                            <div
                                                key={feature.id}
                                                className={`p-4 rounded-xl border transition-all ${feature.enabled
                                                        ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800'
                                                        : canToggle
                                                            ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                                                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-medium text-slate-900 dark:text-white">
                                                                {feature.name}
                                                            </p>
                                                            {feature.is_tier_override && (
                                                                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-700 rounded">
                                                                    OVERRIDE
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-slate-500 mt-1">
                                                            {feature.description}
                                                        </p>
                                                    </div>
                                                    {canToggle ? (
                                                        <button
                                                            onClick={() => handleToggle(feature.id)}
                                                            className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${feature.enabled
                                                                    ? 'bg-teal-600 text-white hover:bg-teal-700'
                                                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
                                                                }`}
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </button>
                                                    ) : (
                                                        <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                                            <Lock className="h-4 w-4 text-slate-400" />
                                                        </div>
                                                    )}
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

            {/* Pending Changes Alert */}
            {pendingChanges.size > 0 && (
                <div className="fixed bottom-6 right-6 bg-amber-100 dark:bg-amber-900/50 border border-amber-200 dark:border-amber-800 rounded-xl p-4 shadow-lg">
                    <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-amber-600" />
                        <span className="text-amber-800 dark:text-amber-200 font-medium">
                            {pendingChanges.size} unsaved change{pendingChanges.size !== 1 ? 's' : ''}
                        </span>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium"
                        >
                            {saving ? 'Saving...' : 'Save Now'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
