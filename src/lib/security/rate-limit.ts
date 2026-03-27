// src/lib/security/rate-limit.ts
// SEC-010: Distributed rate limiting with Upstash Redis
// SEC-REMEDIATION: Fail-closed for auth endpoints, circuit breaker for persistent failures

import { NextRequest, NextResponse } from 'next/server';
import { logError, logWarn, sanitizeError } from '@/lib/logging/safe-logger';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export interface RateLimitConfig {
    limit: number;
    window: number;
    failClosed?: boolean;
}

export const RATE_LIMITS = {
    api: { limit: 100, window: 60 * 1000, failClosed: false },
    auth: { limit: 10, window: 60 * 1000, failClosed: true },
    ai: { limit: 20, window: 60 * 1000, failClosed: false },
    export: { limit: 5, window: 60 * 1000, failClosed: false },
    login: { limit: 5, window: 15 * 60 * 1000, failClosed: true },
    // SEC-PT1-F3: Per-email rate limiting to prevent brute force via IP rotation
    loginEmail: { limit: 10, window: 15 * 60 * 1000, failClosed: true },
    mfaVerify: { limit: 5, window: 15 * 60 * 1000, failClosed: true },
    passwordReset: { limit: 3, window: 60 * 60 * 1000, failClosed: true },
    emailSend: { limit: 5, window: 60 * 60 * 1000, failClosed: true },
    telehealth: { limit: 50, window: 60 * 60 * 1000, failClosed: false },
} satisfies Record<string, RateLimitConfig>;

export type RateLimitKey = keyof typeof RATE_LIMITS;

const inMemoryStore = new Map<string, { count: number; resetTime: number }>();

interface CircuitBreakerState {
    failures: number;
    lastFailure: number;
    isOpen: boolean;
}

const circuitBreaker: CircuitBreakerState = {
    failures: 0,
    lastFailure: 0,
    isOpen: false,
};

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_MS = 30000;

function checkCircuitBreaker(): boolean {
    const now = Date.now();

    if (circuitBreaker.isOpen && (now - circuitBreaker.lastFailure) > CIRCUIT_BREAKER_RESET_MS) {
        circuitBreaker.isOpen = false;
        circuitBreaker.failures = 0;
    }

    return circuitBreaker.isOpen;
}

function recordFailure(): void {
    circuitBreaker.failures++;
    circuitBreaker.lastFailure = Date.now();

    if (circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
        circuitBreaker.isOpen = true;
        logError({ action: 'RATE_LIMIT_CIRCUIT_BREAKER_OPEN', error: 'Rate limit service experiencing persistent failures' });
    }
}

function recordSuccess(): void {
    circuitBreaker.failures = 0;
    circuitBreaker.isOpen = false;
}

function resolveRateLimitKey(pathname: string): RateLimitKey {
    if (pathname === '/api/auth/verify-mfa') {
        return 'mfaVerify';
    }
    if (pathname === '/api/auth/reset-password') {
        return 'passwordReset';
    }
    if (pathname === '/api/admin/invitations') {
        return 'emailSend';
    }
    if (pathname.startsWith('/api/auth') || pathname.includes('/login')) {
        return 'auth';
    }
    if (pathname.startsWith('/api/ai') || pathname.includes('/openai')) {
        return 'ai';
    }
    if (pathname.startsWith('/api/telehealth')) {
        return 'telehealth';
    }
    if (pathname.includes('/export') || pathname.includes('/download')) {
        return 'export';
    }
    return 'api';
}

export function getRateLimitConfig(pathname: string): RateLimitConfig {
    return RATE_LIMITS[resolveRateLimitKey(pathname)];
}

function getRateLimitConfigByKey(rateLimitKey: RateLimitKey): RateLimitConfig {
    return RATE_LIMITS[rateLimitKey];
}

function getRateLimitPrefix(rateLimitKey: RateLimitKey): string {
    switch (rateLimitKey) {
        case 'auth':
            return 'ratelimit:auth';
        case 'ai':
            return 'ratelimit:ai';
        case 'telehealth':
            return 'ratelimit:telehealth';
        case 'export':
            return 'ratelimit:export';
        case 'login':
            return 'ratelimit:login';
        case 'loginEmail':
            return 'ratelimit:login-email';
        case 'mfaVerify':
            return 'ratelimit:mfa-verify';
        case 'passwordReset':
            return 'ratelimit:password-reset';
        case 'emailSend':
            return 'ratelimit:email-send';
        default:
            return 'ratelimit:api';
    }
}

export interface RateLimitResult {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
}

function checkInMemoryRateLimitByKey(identifier: string, rateLimitKey: RateLimitKey, scope = ''): RateLimitResult {
    const config = getRateLimitConfigByKey(rateLimitKey);
    const key = `${rateLimitKey}:${scope}:${identifier}`;
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
    }

    const resetTime = now + config.window;
    inMemoryStore.set(key, { count: 1, resetTime });

    return {
        allowed: true,
        limit: config.limit,
        remaining: config.limit - 1,
        resetTime,
    };
}

function checkInMemoryRateLimit(identifier: string, pathname: string): RateLimitResult {
    return checkInMemoryRateLimitByKey(identifier, resolveRateLimitKey(pathname), pathname);
}

async function checkUpstashRateLimitByKey(
    identifier: string,
    rateLimitKey: RateLimitKey,
    scope = ''
): Promise<RateLimitResult> {
    const { Ratelimit } = await import('@upstash/ratelimit');
    const { Redis } = await import('@upstash/redis');

    const redis = new Redis({
        url: UPSTASH_URL!,
        token: UPSTASH_TOKEN!,
    });

    const config = getRateLimitConfigByKey(rateLimitKey);
    const windowMs = config.window;
    const windowStr = windowMs >= 3600000
        ? `${Math.floor(windowMs / 3600000)} h`
        : `${Math.floor(windowMs / 60000)} m`;

    const limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.limit, windowStr as `${number} ${'s' | 'm' | 'h' | 'd'}`),
        analytics: true,
        prefix: getRateLimitPrefix(rateLimitKey),
    });

    const key = `${scope}:${identifier}`;
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

async function checkUpstashRateLimit(identifier: string, pathname: string): Promise<RateLimitResult> {
    return checkUpstashRateLimitByKey(identifier, resolveRateLimitKey(pathname), pathname);
}

async function checkRateLimitWithKey(
    identifier: string,
    rateLimitKey: RateLimitKey,
    scope = ''
): Promise<RateLimitResult> {
    if (checkCircuitBreaker()) {
        logWarn({ action: 'RATE_LIMIT_CIRCUIT_BREAKER_FALLBACK', status: 'using_in_memory' });
        return checkInMemoryRateLimitByKey(identifier, rateLimitKey, scope);
    }

    if (UPSTASH_URL && UPSTASH_TOKEN) {
        const result = await checkUpstashRateLimitByKey(identifier, rateLimitKey, scope);
        recordSuccess();
        return result;
    }

    if (process.env.NODE_ENV === 'production') {
        logWarn({ action: 'RATE_LIMIT_UPSTASH_NOT_CONFIGURED', status: 'using_in_memory_fallback' });
    }

    return checkInMemoryRateLimitByKey(identifier, rateLimitKey, scope);
}

function rateLimitExceededResponse(result: RateLimitResult): NextResponse {
    return NextResponse.json(
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
    );
}

/**
 * SEC-PT2-F2: Extract client IP with production hardening.
 * In production (Vercel), x-real-ip is set by the platform from the actual
 * client socket and cannot be spoofed. x-forwarded-for is client-controllable
 * and must NOT be trusted in production for rate-limit keying.
 */
function getClientIp(request: NextRequest): string {
    const isProduction = process.env.NODE_ENV === 'production';

    // x-real-ip is set by Vercel from the actual TCP connection — trusted
    const realIp = request.headers.get('x-real-ip');
    if (realIp) return realIp.trim();

    // In production, never fall back to spoofable x-forwarded-for
    if (isProduction) return 'anonymous';

    // Non-production: allow x-forwarded-for for local dev behind proxies
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0].trim();
    return forwarded || 'anonymous';
}

export async function checkRateLimit(
    request: NextRequest
): Promise<{ success: boolean; response?: NextResponse }> {
    const ip = getClientIp(request);

    const pathname = request.nextUrl.pathname;
    const config = getRateLimitConfig(pathname);

    let result: RateLimitResult;

    try {
        if (checkCircuitBreaker()) {
            logWarn({ action: 'RATE_LIMIT_CIRCUIT_BREAKER_FALLBACK', status: 'using_in_memory' });
            result = checkInMemoryRateLimit(ip, pathname);
        } else if (UPSTASH_URL && UPSTASH_TOKEN) {
            result = await checkUpstashRateLimit(ip, pathname);
            recordSuccess();
        } else {
            if (process.env.NODE_ENV === 'production') {
                logWarn({ action: 'RATE_LIMIT_UPSTASH_NOT_CONFIGURED', status: 'using_in_memory_fallback' });
            }
            result = checkInMemoryRateLimit(ip, pathname);
        }
    } catch (error) {
        recordFailure();
        logError({ action: 'RATE_LIMIT_CHECK_ERROR', error: sanitizeError(error) });

        if (config.failClosed) {
            logWarn({ action: 'RATE_LIMIT_FAIL_CLOSED', status: 'denying_request' });
            return {
                success: false,
                response: NextResponse.json(
                    { error: 'Service temporarily unavailable. Please try again.' },
                    { status: 503 }
                ),
            };
        }

        return { success: true };
    }

    if (!result.allowed) {
        return { success: false, response: rateLimitExceededResponse(result) };
    }

    return { success: true };
}

export async function checkRateLimitByKey(
    identifier: string,
    rateLimitKey: RateLimitKey,
    scope: string = rateLimitKey
): Promise<{ success: boolean; response?: NextResponse }> {
    const config = getRateLimitConfigByKey(rateLimitKey);

    try {
        const result = await checkRateLimitWithKey(identifier, rateLimitKey, scope);

        if (!result.allowed) {
            return { success: false, response: rateLimitExceededResponse(result) };
        }

        return { success: true };
    } catch (error) {
        recordFailure();
        logError({ action: 'RATE_LIMIT_CHECK_ERROR', error: sanitizeError(error) });

        if (config.failClosed) {
            return {
                success: false,
                response: NextResponse.json(
                    { error: 'Service temporarily unavailable. Please try again.' },
                    { status: 503 }
                ),
            };
        }

        return { success: true };
    }
}

export function checkRateLimitSync(
    identifier: string,
    pathname: string
): RateLimitResult {
    return checkInMemoryRateLimit(identifier, pathname);
}

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

export function cleanupRateLimitStore(): void {
    const now = Date.now();
    for (const [key, record] of inMemoryStore.entries()) {
        if (record.resetTime < now) {
            inMemoryStore.delete(key);
        }
    }
}

export function getCircuitBreakerStatus(): { isOpen: boolean; failures: number; lastFailure: number } {
    return { ...circuitBreaker };
}

if (typeof setInterval !== 'undefined') {
    setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}
