// src/lib/security/masking.ts
// Data masking utilities for PHI display

/**
 * Mask SSN - show only last 4 digits
 * Input: 123-45-6789 -> ***-**-6789
 */
export function maskSSN(ssn: string | null | undefined): string {
    if (!ssn) return '';
    const digits = ssn.replace(/\D/g, '');
    if (digits.length !== 9) return '***-**-****';
    return `***-**-${digits.slice(-4)}`;
}

/**
 * Mask phone number - show only last 4 digits
 * Input: (555) 123-4567 -> (***) ***-4567
 */
export function maskPhone(phone: string | null | undefined): string {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return '***';
    return `(***) ***-${digits.slice(-4)}`;
}

/**
 * Mask email - show first/last chars and domain
 * Input: john.doe@example.com -> j***e@example.com
 */
export function maskEmail(email: string | null | undefined): string {
    if (!email) return '';
    const [local, domain] = email.split('@');
    if (!domain) return '***';

    if (local.length <= 2) {
        return `***@${domain}`;
    }

    const maskedLocal = local.charAt(0) + '***' + local.charAt(local.length - 1);
    return `${maskedLocal}@${domain}`;
}

/**
 * Mask date of birth - show only year
 * Input: 1985-06-15 -> **/**/1985
    */
export function maskDOB(dob: string | null | undefined): string {
    if (!dob) return '';
    const year = dob.split('-')[0] || dob.split('/').pop();
    if (!year || year.length !== 4) return '**/**/****';
    return `**/**/${year}`;
}

/**
 * Mask address - show only city/state
 * Input: 123 Main St, City, ST 12345 -> ***, City, ST ***
 */
export function maskAddress(address: string | null | undefined): string {
    if (!address) return '';

    // Try to extract city and state
    const parts = address.split(',');
    if (parts.length >= 2) {
        // Assume format: Street, City, State ZIP
        const cityState = parts.slice(1, -1).join(',').trim() || parts[1]?.trim() || '';
        return `***, ${cityState}, ***`;
    }

    return '*** (address hidden)';
}

/**
 * Mask insurance ID - show only last 4 characters
 */
export function maskInsuranceId(id: string | null | undefined): string {
    if (!id) return '';
    if (id.length <= 4) return '****';
    return `****${id.slice(-4)}`;
}

/**
 * Mask medical record number - show only last 4 characters
 */
export function maskMRN(mrn: string | null | undefined): string {
    if (!mrn) return '';
    if (mrn.length <= 4) return '****';
    return `****${mrn.slice(-4)}`;
}

/**
 * Mask name - show only first initial and last name
 * Input: John Doe -> J. Doe
 */
export function maskName(firstName: string | null | undefined, lastName: string | null | undefined): string {
    if (!firstName && !lastName) return '';
    const initial = firstName ? firstName.charAt(0).toUpperCase() + '.' : '';
    return `${initial} ${lastName || '***'}`.trim();
}

// =============================================
// ROLE-BASED DATA MASKING
// =============================================

export type RoleVisibility = 'FULL' | 'MASKED' | 'HIDDEN';

interface MaskingConfig {
    ssn: RoleVisibility;
    phone: RoleVisibility;
    email: RoleVisibility;
    dob: RoleVisibility;
    address: RoleVisibility;
    insuranceId: RoleVisibility;
    mrn: RoleVisibility;
}

/**
 * Get masking configuration based on user role
 */
export function getMaskingConfig(role: string): MaskingConfig {
    switch (role) {
        case 'SUPER_ADMIN':
            // Super admin sees everything
            return {
                ssn: 'FULL',
                phone: 'FULL',
                email: 'FULL',
                dob: 'FULL',
                address: 'FULL',
                insuranceId: 'FULL',
                mrn: 'FULL',
            };

        case 'ADMIN':
            // Admin sees most things, SSN masked
            return {
                ssn: 'MASKED',
                phone: 'FULL',
                email: 'FULL',
                dob: 'FULL',
                address: 'FULL',
                insuranceId: 'MASKED',
                mrn: 'FULL',
            };

        case 'USER':
            // Regular user (clinician) sees clinical data
            return {
                ssn: 'MASKED',
                phone: 'FULL',
                email: 'FULL',
                dob: 'FULL',
                address: 'MASKED',
                insuranceId: 'MASKED',
                mrn: 'FULL',
            };

        case 'AUDITOR':
            // Auditor sees masked data for compliance review
            return {
                ssn: 'MASKED',
                phone: 'MASKED',
                email: 'MASKED',
                dob: 'MASKED',
                address: 'MASKED',
                insuranceId: 'MASKED',
                mrn: 'MASKED',
            };

        default:
            // Unknown role - hide sensitive data
            return {
                ssn: 'HIDDEN',
                phone: 'HIDDEN',
                email: 'HIDDEN',
                dob: 'HIDDEN',
                address: 'HIDDEN',
                insuranceId: 'HIDDEN',
                mrn: 'HIDDEN',
            };
    }
}

/**
 * Apply masking to a patient record based on user role
 */
export function maskPatientData<T extends Record<string, any>>(
    patient: T,
    role: string
): T {
    const config = getMaskingConfig(role);
    const masked = { ...patient };

    // SSN
    if (config.ssn === 'MASKED') {
        masked.ssn = maskSSN(patient.ssn);
    } else if (config.ssn === 'HIDDEN') {
        masked.ssn = null;
    }

    // Phone
    if (config.phone === 'MASKED') {
        masked.phone = maskPhone(patient.phone);
    } else if (config.phone === 'HIDDEN') {
        masked.phone = null;
    }

    // Email
    if (config.email === 'MASKED') {
        masked.email = maskEmail(patient.email);
    } else if (config.email === 'HIDDEN') {
        masked.email = null;
    }

    // DOB
    if (config.dob === 'MASKED') {
        masked.date_of_birth = maskDOB(patient.date_of_birth);
        masked.dateOfBirth = maskDOB(patient.dateOfBirth);
    } else if (config.dob === 'HIDDEN') {
        masked.date_of_birth = null;
        masked.dateOfBirth = null;
    }

    // Address
    if (config.address === 'MASKED') {
        masked.address = maskAddress(patient.address);
    } else if (config.address === 'HIDDEN') {
        masked.address = null;
    }

    // Insurance ID
    if (config.insuranceId === 'MASKED') {
        masked.insurance_id = maskInsuranceId(patient.insurance_id);
        masked.insuranceId = maskInsuranceId(patient.insuranceId);
    } else if (config.insuranceId === 'HIDDEN') {
        masked.insurance_id = null;
        masked.insuranceId = null;
    }

    // MRN
    if (config.mrn === 'MASKED') {
        masked.medical_record_number = maskMRN(patient.medical_record_number);
    } else if (config.mrn === 'HIDDEN') {
        masked.medical_record_number = null;
    }

    return masked;
}
