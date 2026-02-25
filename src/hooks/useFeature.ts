'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { FeatureCode } from '@/types/database';

interface FeatureCheckResult {
    hasFeature: boolean;
    loading: boolean;
    error: Error | null;
}

interface FeaturesCheckResult {
    features: Record<string, boolean>;
    loading: boolean;
    error: Error | null;
}

/**
 * Check if the current user has a specific feature enabled
 */
export function useFeature(featureCode: FeatureCode): FeatureCheckResult {
    const [hasFeature, setHasFeature] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function checkFeature() {
            try {
                const supabase = createClient();
                if (!supabase) {
                    // Demo mode fallback - enable all features
                    setHasFeature(true);
                    setLoading(false);
                    return;
                }

                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    setHasFeature(false);
                    setLoading(false);
                    return;
                }

                // Check if user has this feature enabled
                const { data, error: queryError } = await supabase
                    .from('user_features')
                    .select(`
            enabled,
            expires_at,
            features!inner(code)
          `)
                    .eq('user_id', user.id)
                    .eq('features.code', featureCode)
                    .eq('enabled', true)
                    .maybeSingle();

                if (queryError) {
                    console.error('Feature check error, denying access (fail-closed):', queryError);
                    // SECURITY: Fail-closed - deny access on database errors
                    setHasFeature(false);
                    setError(new Error('Feature check failed'));
                    setLoading(false);
                    return;
                }

                if (!data) {
                    // No explicit feature assignment - deny access (fail-closed)
                    setHasFeature(false);
                } else {
                    // Check if feature has expired
                    if (data.expires_at && new Date(data.expires_at) < new Date()) {
                        setHasFeature(false);
                    } else {
                        setHasFeature(data.enabled);
                    }
                }

                setLoading(false);
            } catch (err) {
                console.error('Feature check exception, denying access (fail-closed):', err);
                setError(err as Error);
                // SECURITY: Fail-closed - deny access on exceptions
                setHasFeature(false);
                setLoading(false);
            }
        }

        checkFeature();
    }, [featureCode]);

    return { hasFeature, loading, error };
}

/**
 * Check multiple features at once
 */
export function useFeatures(featureCodes: FeatureCode[]): FeaturesCheckResult {
    const [features, setFeatures] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function checkFeatures() {
            try {
                const supabase = createClient();
                if (!supabase) {
                    // Demo mode fallback - enable all features
                    const allEnabled: Record<string, boolean> = {};
                    featureCodes.forEach(code => { allEnabled[code] = true; });
                    setFeatures(allEnabled);
                    setLoading(false);
                    return;
                }

                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    setFeatures({});
                    setLoading(false);
                    return;
                }

                const { data, error: queryError } = await supabase
                    .from('user_features')
                    .select(`
            enabled,
            expires_at,
            features!inner(code)
          `)
                    .eq('user_id', user.id)
                    .eq('enabled', true);

                if (queryError) {
                    console.error('Features check error, denying all access (fail-closed):', queryError);
                    // SECURITY: Fail-closed - deny all features on database errors
                    const allDisabled: Record<string, boolean> = {};
                    featureCodes.forEach(code => { allDisabled[code] = false; });
                    setFeatures(allDisabled);
                    setError(new Error('Features check failed'));
                    setLoading(false);
                    return;
                }

                const featureMap: Record<string, boolean> = {};

                for (const code of featureCodes) {
                    // Type assertion for the joined query result
                    const feature = data?.find((f: any) => f.features?.code === code);
                    if (feature) {
                        // Check expiration
                        if (feature.expires_at && new Date(feature.expires_at) < new Date()) {
                            featureMap[code] = false;
                        } else {
                            featureMap[code] = true;
                        }
                    } else {
                        // No explicit assignment - deny access (fail-closed)
                        featureMap[code] = false;
                    }
                }

                setFeatures(featureMap);
                setLoading(false);
            } catch (err) {
                console.error('Features check exception, denying all access (fail-closed):', err);
                setError(err as Error);
                // SECURITY: Fail-closed - deny all features on exceptions
                const allDisabled: Record<string, boolean> = {};
                featureCodes.forEach(code => { allDisabled[code] = false; });
                setFeatures(allDisabled);
                setLoading(false);
            }
        }

        checkFeatures();
    }, [featureCodes.join(',')]);

    return { features, loading, error };
}

/**
 * Get all features for a specific user (Admin use)
 */
export function useUserFeatures(userId: string | null) {
    const [userFeatures, setUserFeatures] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const refetch = useCallback(async () => {
        if (!userId) {
            setUserFeatures([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const supabase = createClient();
            if (!supabase) {
                setUserFeatures([]);
                setLoading(false);
                return;
            }

            const { data, error: queryError } = await supabase
                .from('user_features')
                .select(`
          *,
          features(*)
        `)
                .eq('user_id', userId);

            if (queryError) {
                setError(new Error(queryError.message));
                setLoading(false);
                return;
            }

            setUserFeatures(data || []);
            setLoading(false);
        } catch (err) {
            setError(err as Error);
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { userFeatures, loading, error, refetch };
}
