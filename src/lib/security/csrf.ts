// src/lib/security/csrf.ts
// SEC-REMEDIATION: CSRF protection for state-changing routes

import { NextRequest, NextResponse } from 'next/server';

/**
 * Validate that the request origin matches our allowed origins.
 * This helps prevent CSRF attacks by ensuring requests come from trusted sources.
 */
export function validateOrigin(request: NextRequest): boolean {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');

    // If no origin header, check referer
    if (!origin) {
        const referer = request.headers.get('referer');
        if (!referer) {
            // No origin or referer - could be a direct API call (e.g., curl, Postman)
            // In development, we might want to allow this
            return process.env.NODE_ENV !== 'production';
        }

        // Validate referer matches host
        try {
            const refererUrl = new URL(referer);
            return refererUrl.host === host;
        } catch {
            return false;
        }
    }

    // Validate origin matches host
    try {
        const originUrl = new URL(origin);
        const hostWithoutPort = host?.split(':')[0];
        return originUrl.host === host || originUrl.hostname === hostWithoutPort;
    } catch {
        return false;
    }
}

/**
 * Get allowed origins from environment
 */
function getAllowedOrigins(): string[] {
    const origins: string[] = [];

    // Add configured origin
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (siteUrl) {
        origins.push(siteUrl);
    }

    // In development, allow localhost
    if (process.env.NODE_ENV !== 'production') {
        origins.push('http://localhost:3000');
        origins.push('http://127.0.0.1:3000');
    }

    // Add Vercel preview URLs
    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl) {
        origins.push(`https://${vercelUrl}`);
    }

    return origins;
}

/**
 * Check if origin is in allowed list
 */
export function isAllowedOrigin(origin: string): boolean {
    const allowed = getAllowedOrigins();

    // Check exact match
    if (allowed.includes(origin)) {
        return true;
    }

    // Check if it's a Vercel preview URL (*.vercel.app)
    try {
        const url = new URL(origin);
        if (url.hostname.endsWith('.vercel.app')) {
            return true;
        }
    } catch {
        return false;
    }

    return false;
}

/**
 * CSRF protection middleware for state-changing routes
 * Use this wrapper for POST, PUT, PATCH, DELETE handlers
 */
export function requireSameOrigin(
    handler: (request: NextRequest, ...args: unknown[]) => Promise<NextResponse>
) {
    return async (request: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
        // Skip CSRF check for safe methods
        if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
            return handler(request, ...args);
        }

        // Validate origin
        if (!validateOrigin(request)) {
            console.warn('CSRF: Origin validation failed', {
                origin: request.headers.get('origin'),
                host: request.headers.get('host'),
            });
            return NextResponse.json(
                { error: 'Invalid request origin' },
                { status: 403 }
            );
        }

        return handler(request, ...args);
    };
}

/**
 * Simple inline CSRF check - returns error response if invalid, null if valid
 */
export function checkCSRF(request: NextRequest): NextResponse | null {
    if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
        return null;
    }

    if (!validateOrigin(request)) {
        return NextResponse.json(
            { error: 'Invalid request origin' },
            { status: 403 }
        );
    }

    return null;
}
