/**
 * Form Validation Utilities
 * Common validation functions for forms
 */

// Email validation
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// URL validation
export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// Phone validation (US format)
export function isValidPhone(phone: string): boolean {
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    return phoneRegex.test(phone);
}

// Password strength
export function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
    if (password.length < 8) return 'weak';

    let score = 0;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score < 2) return 'weak';
    if (score < 4) return 'medium';
    return 'strong';
}

// Required field validation
export function isRequired(value: string | null | undefined): boolean {
    return value !== null && value !== undefined && value.trim() !== '';
}

// Min length validation
export function hasMinLength(value: string, minLength: number): boolean {
    return value.length >= minLength;
}

// Max length validation
export function hasMaxLength(value: string, maxLength: number): boolean {
    return value.length <= maxLength;
}

// Numeric validation
export function isNumeric(value: string): boolean {
    return /^[0-9]+$/.test(value);
}

// Decimal validation
export function isDecimal(value: string): boolean {
    return /^[0-9]+([.][0-9]+)?$/.test(value);
}

// Date validation
export function isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
}

// Future date validation
export function isFutureDate(dateString: string): boolean {
    if (!isValidDate(dateString)) return false;
    const date = new Date(dateString);
    return date > new Date();
}

// Form field state helper
export interface FieldState {
    value: string;
    error: string | null;
    touched: boolean;
}

export function createFieldState(initialValue = ''): FieldState {
    return {
        value: initialValue,
        error: null,
        touched: false,
    };
}

// Validation result
export interface ValidationResult {
    isValid: boolean;
    errors: Record<string, string>;
}

// Validate form helper
export function validateForm(
    values: Record<string, string>,
    rules: Record<string, ((value: string) => string | null)[]>
): ValidationResult {
    const errors: Record<string, string> = {};

    for (const [field, validators] of Object.entries(rules)) {
        const value = values[field] || '';
        for (const validate of validators) {
            const error = validate(value);
            if (error) {
                errors[field] = error;
                break;
            }
        }
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
}

// Common validators
export const validators = {
    required: (message = 'This field is required') => (value: string) =>
        isRequired(value) ? null : message,

    email: (message = 'Please enter a valid email') => (value: string) =>
        !value || isValidEmail(value) ? null : message,

    url: (message = 'Please enter a valid URL') => (value: string) =>
        !value || isValidUrl(value) ? null : message,

    minLength: (min: number, message?: string) => (value: string) =>
        !value || hasMinLength(value, min) ? null : (message || `Must be at least ${min} characters`),

    maxLength: (max: number, message?: string) => (value: string) =>
        hasMaxLength(value, max) ? null : (message || `Must be no more than ${max} characters`),

    numeric: (message = 'Please enter numbers only') => (value: string) =>
        !value || isNumeric(value) ? null : message,
};
