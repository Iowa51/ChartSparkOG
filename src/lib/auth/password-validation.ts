// src/lib/auth/password-validation.ts
// HIPAA-compliant password requirements

export const PASSWORD_REQUIREMENTS = {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxLength: 128,
    preventCommonPasswords: true,
    preventUserInfoInPassword: true,
};

// Common passwords to block
const COMMON_PASSWORDS = [
    'password', '123456', 'qwerty', 'letmein', 'welcome',
    'admin', 'login', 'passw0rd', 'password123', 'abc123',
    'iloveyou', 'monkey', 'dragon', 'master', 'sunshine',
    'princess', 'football', 'baseball', 'soccer', 'hockey',
];

export interface PasswordValidationResult {
    valid: boolean;
    errors: string[];
    strength: 'weak' | 'fair' | 'good' | 'strong';
}

export function validatePassword(
    password: string,
    userInfo?: { email?: string; firstName?: string; lastName?: string }
): PasswordValidationResult {
    const errors: string[] = [];
    let strengthScore = 0;

    // Length checks
    if (password.length < PASSWORD_REQUIREMENTS.minLength) {
        errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`);
    } else {
        strengthScore += 1;
        if (password.length >= 16) strengthScore += 1;
    }

    if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
        errors.push(`Password cannot exceed ${PASSWORD_REQUIREMENTS.maxLength} characters`);
    }

    // Character type checks
    if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    } else if (/[A-Z]/.test(password)) {
        strengthScore += 1;
    }

    if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    } else if (/[a-z]/.test(password)) {
        strengthScore += 1;
    }

    if (PASSWORD_REQUIREMENTS.requireNumbers && !/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    } else if (/[0-9]/.test(password)) {
        strengthScore += 1;
    }

    if (PASSWORD_REQUIREMENTS.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\\/`~]/.test(password)) {
        errors.push('Password must contain at least one special character (!@#$%^&* etc.)');
    } else if (/[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\\/`~]/.test(password)) {
        strengthScore += 1;
    }

    // Common password check
    if (PASSWORD_REQUIREMENTS.preventCommonPasswords) {
        const lowerPassword = password.toLowerCase();
        if (COMMON_PASSWORDS.some(common => lowerPassword.includes(common))) {
            errors.push('Password is too common. Please choose a stronger password.');
        }
    }

    // User info in password check
    if (PASSWORD_REQUIREMENTS.preventUserInfoInPassword && userInfo) {
        const lowerPassword = password.toLowerCase();

        // Check email username
        const emailPart = userInfo.email?.split('@')[0]?.toLowerCase();
        if (emailPart && emailPart.length > 2 && lowerPassword.includes(emailPart)) {
            errors.push('Password cannot contain your email address');
        }

        // Check first name
        if (userInfo.firstName && userInfo.firstName.length > 2) {
            if (lowerPassword.includes(userInfo.firstName.toLowerCase())) {
                errors.push('Password cannot contain your first name');
            }
        }

        // Check last name
        if (userInfo.lastName && userInfo.lastName.length > 2) {
            if (lowerPassword.includes(userInfo.lastName.toLowerCase())) {
                errors.push('Password cannot contain your last name');
            }
        }
    }

    // Determine strength
    let strength: 'weak' | 'fair' | 'good' | 'strong';
    if (strengthScore <= 2) strength = 'weak';
    else if (strengthScore <= 4) strength = 'fair';
    else if (strengthScore <= 5) strength = 'good';
    else strength = 'strong';

    return {
        valid: errors.length === 0,
        errors,
        strength,
    };
}

// Password strength indicator colors
export function getStrengthColor(strength: PasswordValidationResult['strength']): string {
    switch (strength) {
        case 'weak': return 'text-red-500 bg-red-100';
        case 'fair': return 'text-amber-500 bg-amber-100';
        case 'good': return 'text-blue-500 bg-blue-100';
        case 'strong': return 'text-emerald-500 bg-emerald-100';
    }
}
