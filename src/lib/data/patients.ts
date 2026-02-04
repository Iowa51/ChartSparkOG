/**
 * Patient Data Layer
 * Production-ready CRUD operations for patient management
 */

import { createClient } from '@/lib/supabase/server';
import type {
    Patient,
    PatientWithDetails,
    PatientCreateInput,
    PatientUpdateInput,
    PatientAllergy,
    PatientMedication,
    PatientProblem,
    PatientInsurance,
    PaginatedResult,
    QueryOptions,
} from '../types/database';
import {
    handleDatabaseError,
    safeLogger,
    validateRequired,
    validateEmail,
    validatePhone,
    validateDate,
    getPaginationRange,
    getTotalPages,
    generateInitials,
    generateAvatarColor,
    createAuditLog,
    retryOperation,
} from './utils';

// =============================================
// READ OPERATIONS
// =============================================

/**
 * Get all patients for an organization with pagination
 */
export async function getPatients(
    organizationId: string,
    options: QueryOptions = {}
): Promise<PaginatedResult<Patient>> {
    try {
        const supabase = await createClient();
        const {
            page = 1,
            pageSize = 50,
            sortBy = 'created_at',
            sortOrder = 'desc'
        } = options;

        const { from, to } = getPaginationRange(page, pageSize);

        // Get total count
        const { count, error: countError } = await supabase
            .from('patients')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .eq('status', 'active');

        if (countError) {
            handleDatabaseError(countError, 'getPatients:count');
        }

        // Get paginated data
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('status', 'active')
            .order(sortBy, { ascending: sortOrder === 'asc' })
            .range(from, to);

        if (error) {
            handleDatabaseError(error, 'getPatients');
        }

        await createAuditLog({
            event_type: 'PATIENTS_LIST',
            organization_id: organizationId,
            resource_type: 'patient',
            phi_accessed: true,
            risk_level: 'LOW',
        });

        return {
            data: data || [],
            count: count || 0,
            page,
            pageSize,
            totalPages: getTotalPages(count || 0, pageSize),
        };
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'getPatients');
        }
        throw error;
    }
}

/**
 * Get a single patient by ID with all related data
 */
export async function getPatientById(
    patientId: string,
    options: { includeDetails?: boolean } = {}
): Promise<Patient | PatientWithDetails> {
    try {
        const supabase = await createClient();
        const { includeDetails = false } = options;

        // Get base patient data
        const { data: patient, error } = await supabase
            .from('patients')
            .select('*')
            .eq('id', patientId)
            .single();

        if (error) {
            handleDatabaseError(error, 'getPatientById');
        }

        if (!patient) {
            throw new Error(`Patient ${patientId} not found`);
        }

        await createAuditLog({
            event_type: 'PATIENT_VIEW',
            organization_id: patient.organization_id,
            resource_type: 'patient',
            resource_id: patientId,
            phi_accessed: true,
            risk_level: 'MEDIUM',
        });

        if (!includeDetails) {
            return patient as Patient;
        }

        // Load related data in parallel
        const [allergiesResult, medicationsResult, problemsResult, insuranceResult] = await Promise.all([
            supabase.from('patient_allergies').select('*').eq('patient_id', patientId),
            supabase.from('patient_medications').select('*').eq('patient_id', patientId).eq('status', 'active'),
            supabase.from('patient_problems').select('*').eq('patient_id', patientId).eq('status', 'active'),
            supabase.from('patient_insurance').select('*').eq('patient_id', patientId).eq('is_primary', true).maybeSingle(),
        ]);

        // Check for errors in related data queries
        if (allergiesResult.error) safeLogger.warn(`Failed to load allergies: ${allergiesResult.error.message}`);
        if (medicationsResult.error) safeLogger.warn(`Failed to load medications: ${medicationsResult.error.message}`);
        if (problemsResult.error) safeLogger.warn(`Failed to load problems: ${problemsResult.error.message}`);
        if (insuranceResult.error) safeLogger.warn(`Failed to load insurance: ${insuranceResult.error.message}`);

        return {
            ...patient,
            allergies: allergiesResult.data || [],
            medications: medicationsResult.data || [],
            problems: problemsResult.data || [],
            insurance: insuranceResult.data || null,
        } as PatientWithDetails;
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'getPatientById');
        }
        throw error;
    }
}

/**
 * Search patients by name, MRN, email, or phone
 */
export async function searchPatients(
    organizationId: string,
    query: string,
    options: QueryOptions = {}
): Promise<PaginatedResult<Patient>> {
    try {
        const supabase = await createClient();
        const {
            page = 1,
            pageSize = 50,
        } = options;

        const { from, to } = getPaginationRange(page, pageSize);
        const searchQuery = `%${query}%`;

        // Search across multiple fields
        const { data, count, error } = await supabase
            .from('patients')
            .select('*', { count: 'exact' })
            .eq('organization_id', organizationId)
            .eq('status', 'active')
            .or(`first_name.ilike.${searchQuery},last_name.ilike.${searchQuery},mrn.ilike.${searchQuery},email.ilike.${searchQuery},phone.ilike.${searchQuery}`)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            handleDatabaseError(error, 'searchPatients');
        }

        await createAuditLog({
            event_type: 'PATIENTS_SEARCH',
            organization_id: organizationId,
            resource_type: 'patient',
            details: { query: query.slice(0, 50) }, // Limit query length in logs
            phi_accessed: true,
            risk_level: 'LOW',
        });

        return {
            data: data || [],
            count: count || 0,
            page,
            pageSize,
            totalPages: getTotalPages(count || 0, pageSize),
        };
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'searchPatients');
        }
        throw error;
    }
}

// =============================================
// CREATE OPERATIONS
// =============================================

/**
 * Create a new patient with related data
 */
export async function createPatient(
    organizationId: string,
    userId: string,
    input: PatientCreateInput
): Promise<Patient> {
    try {
        // Validate required fields
        validateRequired(input, ['first_name', 'last_name']);

        // Validate optional fields
        if (input.email && !validateEmail(input.email)) {
            throw new Error('Invalid email format');
        }
        if (input.phone && !validatePhone(input.phone)) {
            throw new Error('Invalid phone format');
        }
        if (input.date_of_birth && !validateDate(input.date_of_birth)) {
            throw new Error('Invalid date of birth format');
        }

        const supabase = await createClient();

        // Generate avatar color if not provided
        const avatarColor = input.avatar_color || generateAvatarColor();

        // Create patient record
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .insert({
                organization_id: organizationId,
                first_name: input.first_name,
                last_name: input.last_name,
                date_of_birth: input.date_of_birth || null,
                gender: input.gender || null,
                phone: input.phone || null,
                email: input.email || null,
                address: input.address || null,
                preferred_name: input.preferred_name || null,
                avatar_color: avatarColor,
                status: 'active',
                created_by: userId,
            })
            .select()
            .single();

        if (patientError) {
            handleDatabaseError(patientError, 'createPatient');
        }

        if (!patient) {
            throw new Error('Failed to create patient');
        }

        // Create related data in parallel (non-blocking)
        const relatedDataPromises = [];

        // Add allergies
        if (input.allergies && input.allergies.length > 0) {
            const allergyRecords = input.allergies.map(allergy => ({
                patient_id: patient.id,
                allergy,
            }));
            relatedDataPromises.push(
                supabase.from('patient_allergies').insert(allergyRecords)
            );
        }

        // Add medications
        if (input.medications && input.medications.length > 0) {
            const medicationRecords = input.medications.map(med => ({
                patient_id: patient.id,
                medication: med.medication,
                dosage: med.dosage || null,
                frequency: med.frequency || null,
                status: 'active',
            }));
            relatedDataPromises.push(
                supabase.from('patient_medications').insert(medicationRecords)
            );
        }

        // Add problems
        if (input.problems && input.problems.length > 0) {
            const problemRecords = input.problems.map(prob => ({
                patient_id: patient.id,
                problem: prob.problem,
                icd10_code: prob.icd10_code || null,
                status: 'active',
            }));
            relatedDataPromises.push(
                supabase.from('patient_problems').insert(problemRecords)
            );
        }

        // Add insurance
        if (input.insurance) {
            relatedDataPromises.push(
                supabase.from('patient_insurance').insert({
                    patient_id: patient.id,
                    provider: input.insurance.provider,
                    policy_number: input.insurance.policy_number || null,
                    group_number: input.insurance.group_number || null,
                    is_primary: true,
                })
            );
        }

        // Wait for all related data insertions (non-blocking - log failures but don't fail patient creation)
        if (relatedDataPromises.length > 0) {
            const results = await Promise.allSettled(relatedDataPromises);
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    // Log but don't fail - tables may not exist yet
                    safeLogger.warn(`Failed to create related data for patient: ${result.reason}`);
                } else if (result.value && 'error' in result.value && result.value.error) {
                    // Supabase returns { error } instead of throwing
                    const error = result.value.error as { message?: string; code?: string };
                    if (error.code === '42P01') {
                        // Table doesn't exist - this is expected if migration not run
                        safeLogger.warn(`Related table not found (run migrations): ${error.message}`);
                    } else {
                        safeLogger.warn(`Failed to insert related data: ${error.message}`);
                    }
                }
            });
        }

        await createAuditLog({
            event_type: 'PATIENT_CREATE',
            user_id: userId,
            organization_id: organizationId,
            resource_type: 'patient',
            resource_id: patient.id,
            phi_accessed: true,
            risk_level: 'HIGH',
        });

        safeLogger.info(`Created patient successfully`);
        return patient as Patient;
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'createPatient');
        }
        throw error;
    }
}

// =============================================
// UPDATE OPERATIONS
// =============================================

/**
 * Update a patient's information
 */
export async function updatePatient(
    patientId: string,
    userId: string,
    input: PatientUpdateInput
): Promise<Patient> {
    try {
        // Validate optional fields
        if (input.email && !validateEmail(input.email)) {
            throw new Error('Invalid email format');
        }
        if (input.phone && !validatePhone(input.phone)) {
            throw new Error('Invalid phone format');
        }
        if (input.date_of_birth && !validateDate(input.date_of_birth)) {
            throw new Error('Invalid date of birth format');
        }

        const supabase = await createClient();

        const { data: patient, error } = await supabase
            .from('patients')
            .update(input)
            .eq('id', patientId)
            .select()
            .single();

        if (error) {
            handleDatabaseError(error, 'updatePatient');
        }

        if (!patient) {
            throw new Error(`Patient ${patientId} not found`);
        }

        await createAuditLog({
            event_type: 'PATIENT_UPDATE',
            user_id: userId,
            organization_id: patient.organization_id,
            resource_type: 'patient',
            resource_id: patientId,
            details: { updated_fields: Object.keys(input) },
            phi_accessed: true,
            risk_level: 'MEDIUM',
        });

        safeLogger.info(`Updated patient successfully`);
        return patient as Patient;
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'updatePatient');
        }
        throw error;
    }
}

/**
 * Archive a patient (soft delete)
 */
export async function archivePatient(
    patientId: string,
    userId: string
): Promise<Patient> {
    try {
        const supabase = await createClient();

        const { data: patient, error } = await supabase
            .from('patients')
            .update({ status: 'archived' })
            .eq('id', patientId)
            .select()
            .single();

        if (error) {
            handleDatabaseError(error, 'archivePatient');
        }

        if (!patient) {
            throw new Error(`Patient ${patientId} not found`);
        }

        await createAuditLog({
            event_type: 'PATIENT_ARCHIVE',
            user_id: userId,
            organization_id: patient.organization_id,
            resource_type: 'patient',
            resource_id: patientId,
            phi_accessed: true,
            risk_level: 'HIGH',
        });

        safeLogger.info(`Archived patient successfully`);
        return patient as Patient;
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'archivePatient');
        }
        throw error;
    }
}

// =============================================
// RELATED DATA MANAGEMENT
// =============================================

/**
 * Add allergy to patient
 */
export async function addPatientAllergy(
    patientId: string,
    allergy: string,
    severity?: 'mild' | 'moderate' | 'severe'
): Promise<void> {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from('patient_allergies')
            .insert({
                patient_id: patientId,
                allergy,
                severity: severity || null,
            });

        if (error) {
            handleDatabaseError(error, 'addPatientAllergy');
        }

        safeLogger.info(`Added allergy to patient`);
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'addPatientAllergy');
        }
        throw error;
    }
}

/**
 * Add medication to patient
 */
export async function addPatientMedication(
    patientId: string,
    medication: string,
    dosage?: string,
    frequency?: string
): Promise<void> {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from('patient_medications')
            .insert({
                patient_id: patientId,
                medication,
                dosage: dosage || null,
                frequency: frequency || null,
                status: 'active',
            });

        if (error) {
            handleDatabaseError(error, 'addPatientMedication');
        }

        safeLogger.info(`Added medication to patient`);
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'addPatientMedication');
        }
        throw error;
    }
}

/**
 * discontinue medication
 */
export async function discontinuePatientMedication(
    medicationId: string
): Promise<void> {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from('patient_medications')
            .update({
                status: 'discontinued',
                discontinued_at: new Date().toISOString(),
            })
            .eq('id', medicationId);

        if (error) {
            handleDatabaseError(error, 'discontinuePatientMedication');
        }

        safeLogger.info(`Discontinued medication`);
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'discontinuePatientMedication');
        }
        throw error;
    }
}

