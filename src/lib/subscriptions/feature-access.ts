/**
 * Feature Access Utilities
 * Helpers for checking feature access based on subscription tier
 * 
 * NOTE: This supplements the existing FeatureGate component
 */

// Features included in STARTER tier
export const STARTER_FEATURES = [
    'DASHBOARD',
    'PATIENTS',
    'PATIENTS_VIEW',
    'PATIENTS_CREATE',
    'PATIENTS_EDIT',
    'ENCOUNTERS',
    'TEMPLATES',
    'BASIC_TEMPLATES',
    'CUSTOM_TEMPLATES',
    'REFERENCES',
    'BASIC_REFERENCES',
    'FULL_REFERENCES',
    'GERIATRIC_GUIDE',
    'NOTES_VIEW',
    'NOTES_CREATE',
    'AI_NOTE_GENERATION',
    'AI_SCRIBE',
    'CALENDAR',
    'TELEHEALTH',
    'BILLING',
    'BILLING_VIEW',
    'QUICK_PHRASES',
] as const;

// Features ONLY in ELITE tier
export const ELITE_ONLY_FEATURES = [
    'AI_MEDICAL_CODING',
    'AI_CODING',
    'AI_TREATMENT',
    'AI_TREATMENT_PLAN',
    'AI_DIAGNOSIS',
    'AI_DIAGNOSTICS',
    'ADVANCED_ANALYTICS',
    'ANALYTICS',
    'E_PRESCRIBE',
    'EPRESCRIBE',
    'EHR_INTEGRATION',
    'API_ACCESS',
    'PRIORITY_SUPPORT',
] as const;

export type StarterFeature = typeof STARTER_FEATURES[number];
export type EliteFeature = typeof ELITE_ONLY_FEATURES[number];
export type TierCode = 'STARTER' | 'ELITE';

/**
 * Check if a feature is available in a given tier
 */
export function isFeatureInTier(featureCode: string, tierCode: TierCode | null): boolean {
    if (!tierCode) return false;

    // ELITE tier has all features
    if (tierCode === 'ELITE') return true;

    // STARTER tier only has starter features
    if (tierCode === 'STARTER') {
        return STARTER_FEATURES.includes(featureCode as StarterFeature);
    }

    return false;
}

/**
 * Get the required tier for a feature
 */
export function getRequiredTier(featureCode: string): TierCode {
    if (ELITE_ONLY_FEATURES.includes(featureCode as EliteFeature)) {
        return 'ELITE';
    }
    return 'STARTER';
}

/**
 * Get upgrade message for a feature
 */
export function getUpgradeMessage(featureCode: string): string {
    const requiredTier = getRequiredTier(featureCode);

    if (requiredTier === 'ELITE') {
        return `This feature requires the Elite plan. Upgrade to unlock advanced AI capabilities.`;
    }

    return `This feature requires an active subscription.`;
}
