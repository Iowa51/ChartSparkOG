// src/lib/security/rate-limit.ts
// SEC-010: Distributed rate limiting with Upstash Redis
// Falls back to in-memory if Redis not configured

import { NextRequest, NextResponse } from 'next/server';

// Determine if Upstash is available
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

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

    // Telehealth: 10 room creations per hour
    telehealth: { limit: 10, window: 60 * 60 * 1000 },
};

// In-memory fallback store (for development/demo without Redis)
const inMemoryStore = new Map<string, { count: number; resetTime: number }>();

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
    if (pathname.startsWith('/api/telehealth')) {
        return RATE_LIMITS.telehealth;
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
 * Check rate limit using in-memory store (fallback)
 */
function checkInMemoryRateLimit(identifier: string, pathname: string): RateLimitResult {
    const config = getRateLimitConfig(pathname);
    const key = `${identifier}:${pathname}`;
    const now = Date.now();

    const record = inMemoryStore.get(key);

    if (record && record.resetTime > now) {
        if (record.count >= config.limit) {
            return {
                allowed: false,
                limit: config.limit,
                remaining: 0,
                resetTime: record.resetTime,
                retryAfter: Math.ceil((record.resetTime - now) / 1000),
            };
        }

        record.count++;
        inMemoryStore.set(key, record);

        return {
            allowed: true,
            limit: config.limit,
            remaining: config.limit - record.count,
            resetTime: record.resetTime,
        };
    } else {
        const resetTime = now + config.window;
        inMemoryStore.set(key, { count: 1, resetTime });

        return {
            allowed: true,
            limit: config.limit,
            remaining: config.limit - 1,
            resetTime,
        };
    }
}

/**
 * Check rate limit using Upstash Redis
 */
async function checkUpstashRateLimit(identifier: string, pathname: string): Promise<RateLimitResult> {
    // Dynamic import to avoid bundling issues if not used
    const { Ratelimit } = await import('@upstash/ratelimit');
    const { Redis } = await import('@upstash/redis');

    const redis = new Redis({
        url: UPSTASH_URL!,
        token: UPSTASH_TOKEN!,
    });

    const config = getRateLimitConfig(pathname);
    const windowMs = config.window;
    const windowStr = windowMs >= 3600000
        ? `${Math.floor(windowMs / 3600000)} h`
        : `${Math.floor(windowMs / 60000)} m`;

    // Determine prefix based on endpoint type
    let prefix = 'ratelimit:api';
    if (pathname.startsWith('/api/auth')) prefix = 'ratelimit:auth';
    else if (pathname.startsWith('/api/ai')) prefix = 'ratelimit:ai';
    else if (pathname.startsWith('/api/telehealth')) prefix = 'ratelimit:telehealth';
    else if (pathname.includes('/export')) prefix = 'ratelimit:export';

    const limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.limit, windowStr as `${number} ${'s' | 'm' | 'h' | 'd'}`),
        analytics: true,
        prefix,
    });

    const key = `${identifier}:${pathname}`;
    const { success, limit, reset, remaining } = await limiter.limit(key);

    if (!success) {
        return {
            allowed: false,
            limit,
            remaining,
            resetTime: reset,
            retryAfter: Math.ceil((reset - Date.now()) / 1000),
        };
    }

    return {
        allowed: true,
        limit,
        remaining,
        resetTime: reset,
    };
}

/**
 * Main rate limit check function
 * Uses Upstash if configured, otherwise falls back to in-memory
 */
export async function checkRateLimit(
    request: NextRequest
): Promise<{ success: boolean; response?: NextResponse }> {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        request.headers.get('x-real-ip') ||
        'anonymous';

    const pathname = request.nextUrl.pathname;

    let result: RateLimitResult;

    try {
        if (UPSTASH_URL && UPSTASH_TOKEN) {
            // Use Upstash Redis for distributed rate limiting
            result = await checkUpstashRateLimit(ip, pathname);
        } else {
            // Fall back to in-memory (single instance only)
            if (process.env.NODE_ENV === 'production') {
                console.warn('Rate limiting: Upstash not configured, using in-memory fallback. This is not suitable for multi-instance deployments.');
            }
            result = checkInMemoryRateLimit(ip, pathname);
        }
    } catch (error) {
        console.error('Rate limit check error:', error);
        // Fail open on rate limit errors (but log it)
        return { success: true };
    }

    if (!result.allowed) {
        return {
            success: false,
            response: NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                {
                    status: 429,
                    headers: {
                        'X-RateLimit-Limit': String(result.limit),
                        'X-RateLimit-Remaining': String(result.remaining),
                        'X-RateLimit-Reset': String(result.resetTime),
                        'Retry-After': String(result.retryAfter || 60),
                    },
                }
            ),
        };
    }

    return { success: true };
}

/**
 * Legacy synchronous rate limit check (for in-memory only)
 * Kept for backward compatibility
 */
export function checkRateLimitSync(
    identifier: string,
    pathname: string
): RateLimitResult {
    return checkInMemoryRateLimit(identifier, pathname);
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
 * Clean up expired entries from in-memory store
 */
export function cleanupRateLimitStore(): void {
    const now = Date.now();
    for (const [key, record] of inMemoryStore.entries()) {
        if (record.resetTime < now) {
            inMemoryStore.delete(key);
        }
    }
}

// Run cleanup every 5 minutes (in-memory only)
if (typeof setInterval !== 'undefined') {
    setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}
