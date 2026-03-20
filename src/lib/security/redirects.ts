/**
 * Validate redirect paths to prevent open redirect attacks.
 * Only allows app-internal relative paths.
 */
export function sanitizeRedirectPath(path: string | null, fallback = '/dashboard'): string {
    if (!path) return fallback;

    if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
        return fallback;
    }

    return path;
}
