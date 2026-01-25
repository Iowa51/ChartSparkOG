// src/lib/utils/get-client-ip.ts
// Helper function to extract client IP address from request headers
// Handles proxies, load balancers, and direct connections

/**
 * Extract the client's IP address from the request.
 * Handles:
 * - x-forwarded-for header (when behind proxy/load balancer)
 * - x-real-ip header (nginx configuration)
 * - Direct connection fallback
 * 
 * @param request - The incoming request object
 * @returns The client's IP address or 'unknown'
 */
export function getClientIP(request: Request): string {
    // x-forwarded-for can contain multiple IPs: client, proxy1, proxy2...
    // The first one is the original client IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }

    // Some proxies use x-real-ip instead
    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
        return realIP.trim();
    }

    // Cloudflare uses cf-connecting-ip
    const cfIP = request.headers.get('cf-connecting-ip');
    if (cfIP) {
        return cfIP.trim();
    }

    return 'unknown';
}

/**
 * Get the user agent from the request
 * @param request - The incoming request object
 * @returns The user agent string or 'unknown'
 */
export function getUserAgent(request: Request): string {
    return request.headers.get('user-agent') || 'unknown';
}

/**
 * Get both IP and User Agent in one call (common pattern)
 * @param request - The incoming request object
 * @returns Object with ipAddress and userAgent
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
