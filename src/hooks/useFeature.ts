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
                    console.warn('Feature check error, defaulting to enabled:', queryError);
                    // Fallback to enabled in case of query issues (demo mode)
                    setHasFeature(true);
                    setLoading(false);
                    return;
                }

                if (!data) {
                    // No explicit assignment - default to enabled for demo
                    setHasFeature(true);
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
                console.error('Feature check exception:', err);
                setError(err as Error);
                // Fallback to enabled on error
                setHasFeature(true);
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
                    console.warn('Features check error, defaulting to all enabled:', queryError);
                    // Fallback to all enabled in case of query issues
                    const allEnabled: Record<string, boolean> = {};
                    featureCodes.forEach(code => { allEnabled[code] = true; });
                    setFeatures(allEnabled);
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
                        // No explicit assignment - default to enabled for demo
                        featureMap[code] = true;
                    }
                }

                setFeatures(featureMap);
                setLoading(false);
            } catch (err) {
                console.error('Features check exception:', err);
                setError(err as Error);
                // Fallback to all enabled on error
                const allEnabled: Record<string, boolean> = {};
                featureCodes.forEach(code => { allEnabled[code] = true; });
                setFeatures(allEnabled);
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
                setError(queryError as any);
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
