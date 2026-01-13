// src/lib/security/file-security.ts
// Secure file handling utilities

import { randomBytes } from 'crypto';

// Allowed MIME types for file uploads
export const ALLOWED_FILE_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
] as const;

// File type display names
export const FILE_TYPE_NAMES: Record<string, string> = {
    'application/pdf': 'PDF Document',
    'image/jpeg': 'JPEG Image',
    'image/png': 'PNG Image',
    'image/gif': 'GIF Image',
    'image/webp': 'WebP Image',
    'application/msword': 'Word Document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
    'application/vnd.ms-excel': 'Excel Spreadsheet',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
    'text/plain': 'Text File',
    'text/csv': 'CSV File',
};

// Maximum file size (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Dangerous file extensions to block
const DANGEROUS_EXTENSIONS = [
    '.exe', '.bat', '.cmd', '.sh', '.bash',
    '.php', '.asp', '.aspx', '.jsp',
    '.js', '.mjs', '.ts', '.cjs',
    '.py', '.rb', '.pl', '.ps1',
    '.dll', '.so', '.dylib',
    '.vbs', '.vbe', '.wsf', '.wsh',
    '.msi', '.msp', '.com', '.scr',
    '.jar', '.class', '.war',
];

// Suspicious patterns in filenames
const SUSPICIOUS_PATTERNS = [
    /<script/i,
    /javascript:/i,
    /\.\.\//, // Path traversal
    /\.\.\\/, // Path traversal (Windows)
    /[\x00-\x1f]/, // Control characters
];

export interface FileValidationResult {
    valid: boolean;
    error?: string;
    sanitizedName?: string;
}

/**
 * Validate an uploaded file
 */
export function validateFileUpload(
    file: File | { name: string; type: string; size: number }
): FileValidationResult {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
        };
    }

    if (file.size === 0) {
        return { valid: false, error: 'File is empty' };
    }

    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type as any)) {
        return {
            valid: false,
            error: `File type not allowed. Allowed types: PDF, images, Word, Excel, text files`
        };
    }

    // Check file extension
    const fileName = file.name.toLowerCase();
    for (const ext of DANGEROUS_EXTENSIONS) {
        if (fileName.endsWith(ext)) {
            return { valid: false, error: `File extension ${ext} is not allowed` };
        }
    }

    // Check for double extensions (file.pdf.exe)
    const parts = fileName.split('.');
    if (parts.length > 2) {
        for (let i = 1; i < parts.length - 1; i++) {
            const fakeExt = '.' + parts[i];
            if (DANGEROUS_EXTENSIONS.includes(fakeExt)) {
                return { valid: false, error: 'Suspicious double extension detected' };
            }
        }
    }

    // Check for suspicious patterns
    for (const pattern of SUSPICIOUS_PATTERNS) {
        if (pattern.test(file.name)) {
            return { valid: false, error: 'Invalid characters in filename' };
        }
    }

    // Sanitize filename
    const sanitizedName = sanitizeFilename(file.name);

    return { valid: true, sanitizedName };
}

/**
 * Sanitize a filename - remove dangerous characters
 */
export function sanitizeFilename(filename: string): string {
    // Get safe part of filename
    let safe = filename
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // Remove dangerous chars
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/\.+/g, '.') // Collapse multiple dots
        .replace(/^\.+/, '') // Remove leading dots
        .trim();

    // Ensure we have a filename
    if (!safe || safe === '.') {
        safe = 'file';
    }

    // Limit length
    if (safe.length > 200) {
        const ext = safe.split('.').pop() || '';
        const name = safe.slice(0, 200 - ext.length - 1);
        safe = ext ? `${name}.${ext}` : name;
    }

    return safe;
}

/**
 * Generate a secure, unique file path
 * Does NOT expose original filename or internal structure
 */
export function generateSecureFilePath(
    userId: string,
    originalFilename: string,
    prefix = 'uploads'
): string {
    const timestamp = Date.now();
    const random = randomBytes(8).toString('hex');
    const extension = originalFilename.split('.').pop()?.toLowerCase() || 'bin';
    const safeExtension = extension.replace(/[^a-z0-9]/g, '');

    // Format: uploads/userId/timestamp-random.ext
    return `${prefix}/${userId}/${timestamp}-${random}.${safeExtension}`;
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
    const extensions: Record<string, string> = {
        'application/pdf': 'pdf',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/vnd.ms-excel': 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'text/plain': 'txt',
        'text/csv': 'csv',
    };

    return extensions[mimeType] || 'bin';
}

/**
 * Check if a file path is trying to traverse directories
 */
export function isPathTraversal(path: string): boolean {
    const normalized = path
        .replace(/\\/g, '/')
        .split('/')
        .filter(Boolean);

    let depth = 0;
    for (const part of normalized) {
        if (part === '..') {
            depth--;
            if (depth < 0) return true;
        } else if (part !== '.') {
            depth++;
        }
    }

    return false;
}
