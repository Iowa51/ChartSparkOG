/**
 * Request Deduplication Utility
 * Prevents duplicate API requests when users double-click or rapidly trigger actions
 *
 * OPTIMIZATION: Reduces unnecessary server load and prevents race conditions
 */

import { logWarn } from '@/lib/logging/safe-logger';

type PendingRequest<T> = {
    promise: Promise<T>;
    timestamp: number;
};

// Store for pending requests
const pendingRequests = new Map<string, PendingRequest<unknown>>();

// Default TTL for request deduplication (5 seconds)
const DEFAULT_TTL_MS = 5000;

/**
 * Generate a cache key from request parameters
 */
function generateKey(endpoint: string, params?: Record<string, unknown>): string {
    const paramStr = params ? JSON.stringify(params, Object.keys(params).sort()) : '';
    return `${endpoint}:${paramStr}`;
}

/**
 * Deduplicated fetch wrapper
 * If an identical request is already in flight, returns the existing promise
 *
 * @param endpoint - API endpoint
 * @param fetcher - Function that performs the actual fetch
 * @param options - Deduplication options
 * @returns Promise with the response
 *
 * @example
 * ```ts
 * const data = await dedupedFetch(
 *   '/api/patients',
 *   () => fetch('/api/patients').then(r => r.json()),
 *   { params: { status: 'active' } }
 * );
 * ```
 */
export async function dedupedFetch<T>(
    endpoint: string,
    fetcher: () => Promise<T>,
    options?: {
        params?: Record<string, unknown>;
        ttlMs?: number;
    }
): Promise<T> {
    const key = generateKey(endpoint, options?.params);
    const ttl = options?.ttlMs ?? DEFAULT_TTL_MS;
    const now = Date.now();

    // Check for existing request
    const existing = pendingRequests.get(key);
    if (existing && (now - existing.timestamp) < ttl) {
        return existing.promise as Promise<T>;
    }

    // Create new request
    const promise = fetcher().finally(() => {
        // Clean up after request completes (with small delay to handle rapid retries)
        setTimeout(() => {
            const current = pendingRequests.get(key);
            if (current?.promise === promise) {
                pendingRequests.delete(key);
            }
        }, 100);
    });

    pendingRequests.set(key, { promise, timestamp: now });
    return promise;
}

/**
 * Hook for preventing rapid button clicks
 * Returns a wrapper function that ignores calls within the debounce window
 *
 * @example
 * ```tsx
 * const handleSubmit = useClickDedup(async () => {
 *   await submitForm();
 * }, 1000);
 * ```
 */
export function createClickGuard(debounceMs: number = 1000) {
    let lastClickTime = 0;

    return <T extends (...args: unknown[]) => unknown>(fn: T): T => {
        return ((...args: unknown[]) => {
            const now = Date.now();
            if (now - lastClickTime < debounceMs) {
                return; // Ignore rapid clicks
            }
            lastClickTime = now;
            return fn(...args);
        }) as T;
    };
}

/**
 * React hook for click deduplication
 * Prevents a callback from being called more than once within the specified window
 */
export function useClickDedup<T extends (...args: unknown[]) => unknown>(
    callback: T,
    debounceMs: number = 1000
): T {
    let lastCallTime = 0;

    return ((...args: unknown[]) => {
        const now = Date.now();
        if (now - lastCallTime < debounceMs) {
            return;
        }
        lastCallTime = now;
        return callback(...args);
    }) as T;
}

/**
 * Mutation deduplication - prevents duplicate mutations
 * Unlike dedupedFetch, this doesn't share results but simply blocks duplicate calls
 */
const activeMutations = new Set<string>();

export async function dedupedMutation<T>(
    key: string,
    mutator: () => Promise<T>
): Promise<T | null> {
    if (activeMutations.has(key)) {
        logWarn({ action: 'DEDUP_BLOCKED_DUPLICATE_MUTATION', resourceId: key });
        return null;
    }

    activeMutations.add(key);
    try {
        return await mutator();
    } finally {
        activeMutations.delete(key);
    }
}

/**
 * Clear all pending requests (useful for testing or logout)
 */
export function clearPendingRequests(): void {
    pendingRequests.clear();
    activeMutations.clear();
}
