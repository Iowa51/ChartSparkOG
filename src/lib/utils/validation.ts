// F-030: Re-export from canonical validation module
// All validation utilities are consolidated in lib/validation/schemas.ts
export {
    isValidEmail,
    isValidUrl,
    isValidPhone,
    isValidDate,
    isFutureDate,
    createFieldState,
    validateForm,
    validators,
} from '@/lib/validation/schemas';
export type { FieldState } from '@/lib/validation/schemas';
