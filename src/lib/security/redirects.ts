/**
 * Validate redirect paths to prevent open redirect attacks.
 * Only allows app-internal relative paths.
 *
 * SEC-PT6-F5: Added path traversal blocking and URL decode checks.
 */
export function sanitizeRedirectPath(path: string | null, fallback = '/dashboard'): string {
    if (!path) return fallback;

    // Block protocol-relative, backslash, and non-path-starting values
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
        return fallback;
    }

    // SEC-PT6-F5: Block path traversal attempts (.. in raw or encoded form)
    if (path.includes('..')) {
        return fallback;
    }

    // SEC-PT6-F5: Decode once and re-validate to catch encoded bypasses
    let decoded: string;
    try {
        decoded = decodeURIComponent(path);
    } catch {
        return fallback; // Invalid encoding
    }

    if (decoded.startsWith('//') || decoded.includes('\\') || decoded.includes('..')) {
        return fallback;
    }

    return path;
}
