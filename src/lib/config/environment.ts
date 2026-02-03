// src/lib/config/environment.ts
// SEC-REMEDIATION: Centralized environment configuration
// Provides consistent demo mode checks and environment info

export type AppEnvironment = 'development' | 'staging' | 'production';

export interface EnvironmentConfig {
    appEnv: AppEnvironment;
    isDemoMode: boolean;
    isProduction: boolean;
    isDevelopment: boolean;
    features: {
        demoMode: boolean;
        strictSecurityChecks: boolean;
        auditLogging: boolean;
        mfaRequired: boolean;
        sessionTimeout: boolean;
    };
}

/**
 * Check if the application is running in demo mode
 * SEC-REMEDIATION: Centralized check for consistent behavior across the app
 *
 * Demo mode should be DISABLED in production for security.
 * This function prepares for future enforcement.
 */
export function isDemoMode(): boolean {
    // Check explicit demo mode flag
    const demoModeEnv = process.env.NEXT_PUBLIC_DEMO_MODE;

    // Parse the demo mode setting
    const isExplicitlyEnabled = demoModeEnv === 'true' || demoModeEnv === '1';

    // In production, log a warning if demo mode is enabled
    // TODO (Phase 2): Enforce demo mode disabled in production
    if (process.env.NODE_ENV === 'production' && isExplicitlyEnabled) {
        console.warn(
            '[SECURITY WARNING] Demo mode is enabled in production. ' +
            'This bypasses security controls and should be disabled.'
        );
    }

    return isExplicitlyEnabled;
}

/**
 * Get the current application environment
 */
export function getAppEnvironment(): AppEnvironment {
    const appEnv = process.env.NEXT_PUBLIC_APP_ENV;

    if (appEnv === 'production') return 'production';
    if (appEnv === 'staging') return 'staging';

    // Default to development if not explicitly set
    return 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
}

/**
 * Get complete environment configuration
 * Use this for consistent environment checks throughout the app
 */
export function getEnvironmentConfig(): EnvironmentConfig {
    const appEnv = getAppEnvironment();
    const demoMode = isDemoMode();
    const production = isProduction();
    const development = isDevelopment();

    return {
        appEnv,
        isDemoMode: demoMode,
        isProduction: production,
        isDevelopment: development,
        features: {
            // Demo mode status
            demoMode,

            // Security checks should be strict in production (unless demo mode override)
            // TODO (Phase 2): Remove demo mode exception
            strictSecurityChecks: production && !demoMode,

            // Audit logging should always be enabled in production
            auditLogging: production || appEnv === 'staging',

            // MFA should be required in production (unless demo mode override)
            // TODO (Phase 2): Remove demo mode exception
            mfaRequired: production && !demoMode,

            // Session timeout should be enabled in production (unless demo mode override)
            // TODO (Phase 2): Remove demo mode exception
            sessionTimeout: production && !demoMode,
        },
    };
}

/**
 * Log the current environment configuration (safe - no secrets)
 * Useful for debugging and startup verification
 */
export function logEnvironmentConfig(): void {
    const config = getEnvironmentConfig();

    console.info('[ENV] Environment Configuration:', {
        appEnv: config.appEnv,
        nodeEnv: process.env.NODE_ENV,
        isDemoMode: config.isDemoMode,
        isProduction: config.isProduction,
        features: config.features,
    });
}

/**
 * Validate that required environment variables are set
 * Returns an array of missing variable names
 */
export function validateRequiredEnvVars(): string[] {
    const required = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ];

    // Additional requirements for production
    if (isProduction()) {
        required.push(
            'SUPABASE_SERVICE_ROLE_KEY',
            'PHI_ENCRYPTION_KEY',
        );
    }

    const missing: string[] = [];

    for (const varName of required) {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    }

    return missing;
}

/**
 * Check if all required environment variables are set
 * Throws an error in production if critical vars are missing
 */
export function ensureRequiredEnvVars(): void {
    const missing = validateRequiredEnvVars();

    if (missing.length > 0) {
        const message = `Missing required environment variables: ${missing.join(', ')}`;

        if (isProduction()) {
            throw new Error(`[CRITICAL] ${message}`);
        } else {
            console.warn(`[WARNING] ${message}`);
        }
    }
}
