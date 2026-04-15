/**
 * Data Layer Index
 * Central export point for all database operations
 */

// Patient operations
export {
    getPatients,
    getPatientById,
    searchPatients,
    createPatient,
    updatePatient,
    archivePatient,
    addPatientAllergy,
    addPatientMedication,
    discontinuePatientMedication,
} from './patients';

// Encounter operations
export {
    getEncounters,
    getEncountersByPatientId,
    getEncounterById,
    getEncountersByProviderId,
    createEncounter,
    updateEncounter,
    completeEncounter,
    cancelEncounter,
} from './encounters';

// Note operations
export {
    getNotesByEncounterId,
    getNoteById,
    getNotesByProviderId,
    createNote,
    updateNote,
    signNote,
    completeNote,
    calculateBillingAmount,
    calculatePlatformFee,
    calculateNetAmount,
    getSuggestedCPTCodes,
    validateCPTCode,
    validateICD10Code,
} from './notes';

// Template operations
export {
    getSystemTemplates,
    getOrganizationTemplates,
    getAllTemplatesForOrganization,
    getTemplateById,
    getDefaultTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    cloneTemplate,
} from './templates';

// Utility functions
export {
    sanitizePHI,
    safeLogger,
    handleDatabaseError,
    validateRequired,
    validateEmail,
    validatePhone,
    validateDate,
    getPaginationRange,
    getTotalPages,
    formatPatientName,
    generateInitials,
    generateAvatarColor,
    formatDate,
    formatDateForDB,
    calculateAge,
    createAuditLog,
    retryOperation,
} from './utils';

// Type exports
export type {
    Patient,
    PatientWithDetails,
    PatientCreateInput,
    PatientUpdateInput,
    PatientAllergy,
    PatientMedication,
    PatientProblem,
    PatientInsurance,
    Encounter,
    EncounterWithDetails,
    EncounterCreateInput,
    EncounterUpdateInput,
    Note,
    NoteCreateInput,
    NoteUpdateInput,
    NoteTemplate,
    PaginatedResult,
    QueryOptions,
    Organization,
    User,
} from '../types/database';
