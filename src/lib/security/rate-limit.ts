// src/lib/security/rate-limit.ts
// Rate limiting for API endpoints

export interface RateLimitConfig {
    limit: number;      // Max requests
    window: number;     // Time window in milliseconds
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
    // General API: 100 requests per minute
    api: { limit: 100, window: 60 * 1000 },

    // Auth endpoints: 10 requests per minute (prevent brute force)
    auth: { limit: 10, window: 60 * 1000 },

    // AI endpoints: 20 requests per minute (expensive operations)
    ai: { limit: 20, window: 60 * 1000 },

    // Export endpoints: 5 requests per minute
    export: { limit: 5, window: 60 * 1000 },

    // Login attempts: 5 per 15 minutes
    login: { limit: 5, window: 15 * 60 * 1000 },
};

// In-memory rate limit store (use Redis in production for multi-instance)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Get rate limit configuration for a given path
 */
export function getRateLimitConfig(pathname: string): RateLimitConfig {
    if (pathname.startsWith('/api/auth') || pathname.includes('/login')) {
        return RATE_LIMITS.auth;
    }
    if (pathname.startsWith('/api/ai') || pathname.includes('/openai')) {
        return RATE_LIMITS.ai;
    }
    if (pathname.includes('/export') || pathname.includes('/download')) {
        return RATE_LIMITS.export;
    }
    return RATE_LIMITS.api;
}

export interface RateLimitResult {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
}

/**
 * Check if request is within rate limit
 */
export function checkRateLimit(
    identifier: string, // Usually IP address or user ID
    pathname: string
): RateLimitResult {
    const config = getRateLimitConfig(pathname);
    const key = `${identifier}:${pathname}`;
    const now = Date.now();

    const record = rateLimitStore.get(key);

    if (record && record.resetTime > now) {
        // Within current window
        if (record.count >= config.limit) {
            // Rate limit exceeded
            return {
                allowed: false,
                limit: config.limit,
                remaining: 0,
                resetTime: record.resetTime,
                retryAfter: Math.ceil((record.resetTime - now) / 1000),
            };
        }

        // Increment count
        record.count++;
        rateLimitStore.set(key, record);

        return {
            allowed: true,
            limit: config.limit,
            remaining: config.limit - record.count,
            resetTime: record.resetTime,
        };
    } else {
        // Start new window
        const resetTime = now + config.window;
        rateLimitStore.set(key, { count: 1, resetTime });

        return {
            allowed: true,
            limit: config.limit,
            remaining: config.limit - 1,
            resetTime,
        };
    }
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.resetTime),
    };

    if (result.retryAfter) {
        headers['Retry-After'] = String(result.retryAfter);
    }

    return headers;
}

/**
 * Clean up expired entries (call periodically)
 */
export function cleanupRateLimitStore(): void {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
        if (record.resetTime < now) {
            rateLimitStore.delete(key);
        }
    }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}
