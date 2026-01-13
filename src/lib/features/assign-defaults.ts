import { createClient } from '@/lib/supabase/client';
import type { FeatureTier } from '@/types/database';

/**
 * Tier hierarchy for determining eligible features
 */
const TIER_HIERARCHY: Record<string, string[]> = {
    'STARTER': ['STARTER'],
    'PROFESSIONAL': ['STARTER', 'PROFESSIONAL'],
    'COMPLETE': ['STARTER', 'PROFESSIONAL', 'COMPLETE'],
};

/**
 * Assign default features to a user based on their subscription tier
 * This should be called when a new user is created
 */
export async function assignDefaultFeatures(
    userId: string,
    tier: 'STARTER' | 'PROFESSIONAL' | 'COMPLETE',
    grantedBy: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = createClient();
        if (!supabase) {
            return { success: false, error: 'Supabase client not available' };
        }

        // Get all features for this tier and below
        const eligibleTiers = TIER_HIERARCHY[tier] || ['STARTER'];

        // Get features that match the eligible tiers
        const { data: features, error: featuresError } = await supabase
            .from('features')
            .select('id, code')
            .in('tier_required', eligibleTiers)
            .eq('is_active', true);

        if (featuresError) {
            console.error('Error fetching features:', featuresError);
            return { success: false, error: featuresError.message };
        }

        if (!features || features.length === 0) {
            return { success: true }; // No features to assign
        }

        // Create user_features entries
        const userFeatures = features.map((feature: { id: string; code: string }) => ({
            user_id: userId,
            feature_id: feature.id,
            enabled: true,
            granted_by: grantedBy,
            granted_at: new Date().toISOString(),
            is_tier_override: false,
        }));

        // Insert all at once with upsert to handle existing entries
        const { error: insertError } = await supabase
            .from('user_features')
            .upsert(userFeatures, {
                onConflict: 'user_id,feature_id',
                ignoreDuplicates: false
            });

        if (insertError) {
            console.error('Error assigning features:', insertError);
            return { success: false, error: insertError.message };
        }

        return { success: true };
    } catch (err) {
        console.error('Exception assigning default features:', err);
        return { success: false, error: (err as Error).message };
    }
}

/**
 * Toggle a specific feature for a user
 */
export async function toggleUserFeature(
    userId: string,
    featureId: string,
    enabled: boolean,
    grantedBy: string,
    options?: {
        isTierOverride?: boolean;
        overrideReason?: string;
        expiresAt?: string;
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = createClient();
        if (!supabase) {
            return { success: false, error: 'Supabase client not available' };
        }

        const upsertData: any = {
            user_id: userId,
            feature_id: featureId,
            enabled,
            granted_by: grantedBy,
            granted_at: new Date().toISOString(),
            is_tier_override: options?.isTierOverride || false,
            override_reason: options?.overrideReason || null,
            expires_at: options?.expiresAt || null,
        };

        if (!enabled) {
            upsertData.revoked_by = grantedBy;
            upsertData.revoked_at = new Date().toISOString();
        } else {
            upsertData.revoked_by = null;
            upsertData.revoked_at = null;
        }

        const { error } = await supabase
            .from('user_features')
            .upsert(upsertData, {
                onConflict: 'user_id,feature_id'
            });

        if (error) {
            console.error('Error toggling feature:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error('Exception toggling feature:', err);
        return { success: false, error: (err as Error).message };
    }
}

/**
 * Get all features with user's current status
 */
export async function getUserFeaturesWithStatus(userId: string) {
    try {
        const supabase = createClient();
        if (!supabase) {
            return { features: [], error: 'Supabase client not available' };
        }

        // Get all features
        const { data: allFeatures, error: featuresError } = await supabase
            .from('features')
            .select('*')
            .eq('is_active', true)
            .order('display_order');

        if (featuresError) {
            return { features: [], error: featuresError.message };
        }

        // Get user's feature assignments
        const { data: userFeatures, error: userFeaturesError } = await supabase
            .from('user_features')
            .select('*')
            .eq('user_id', userId);

        if (userFeaturesError) {
            return { features: [], error: userFeaturesError.message };
        }

        // Merge the data
        const featuresWithStatus = allFeatures?.map((feature: any) => {
            const userFeature = userFeatures?.find((uf: any) => uf.feature_id === feature.id);
            return {
                ...feature,
                enabled: userFeature?.enabled ?? false,
                is_tier_override: userFeature?.is_tier_override ?? false,
                override_reason: userFeature?.override_reason ?? null,
                expires_at: userFeature?.expires_at ?? null,
                granted_at: userFeature?.granted_at ?? null,
            };
        }) || [];

        return { features: featuresWithStatus, error: null };
    } catch (err) {
        return { features: [], error: (err as Error).message };
    }
}
