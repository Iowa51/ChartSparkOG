// F-030: Re-export from canonical validation module
// All validation schemas and sanitization functions are consolidated in lib/validation/schemas.ts
export {
    sanitizeInput,
    sanitizeObject,
    validateRequest,
    UUIDSchema,
    PaginationSchema,
    PatientCreateSchema,
    PatientUpdateSchema,
} from '@/lib/validation/schemas';
