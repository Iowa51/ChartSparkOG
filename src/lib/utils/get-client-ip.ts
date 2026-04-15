// src/lib/utils/get-client-ip.ts
// SEC-PT7-F1: Single source of truth for client IP extraction.
// In production (Vercel), only x-real-ip is trusted (platform-set, unspoofable).
// x-forwarded-for is NEVER used in production — it is client-controllable.

/**
 * Extract the client's IP address from the request.
 * Production: uses only x-real-ip (set by Vercel from actual TCP connection).
 * Non-production: falls back to x-forwarded-for for local dev convenience.
 */
export function getClientIP(request: Request): string {
    const isProduction = process.env.NODE_ENV === 'production';

    // x-real-ip is set by Vercel from the actual client socket — trusted
    const realIP = request.headers.get('x-real-ip');
    if (realIP) return realIP.trim();

    // In production, never fall back to spoofable x-forwarded-for
    if (isProduction) return 'unknown';

    // Non-production: allow x-forwarded-for for local dev behind proxies
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0].trim();
    return forwarded || 'unknown';
}

/**
 * Get the user agent from the request
 */
export function getUserAgent(request: Request): string {
    return request.headers.get('user-agent') || 'unknown';
}

/**
 * Get both IP and User Agent in one call (common pattern)
 */
export function getRequestMetadata(request: Request): {
    ipAddress: string;
    userAgent: string;
} {
    return {
        ipAddress: getClientIP(request),
        userAgent: getUserAgent(request),
    };
}
