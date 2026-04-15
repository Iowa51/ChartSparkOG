/**
 * Encounters Data Layer
 * Production-ready CRUD operations for encounter management
 */

import { createClient } from '@/lib/supabase/server';
import type {
    Encounter,
    EncounterWithDetails,
    EncounterCreateInput,
    EncounterUpdateInput,
    Patient,
    User,
    Note,
} from '../types/database';
import {
    handleDatabaseError,
    safeLogger,
    validateRequired,
    createAuditLog,
} from './utils';

// =============================================
// READ OPERATIONS
// =============================================

/**
 * Get all encounters for an organization
 */
export async function getEncounters(
    organizationId: string,
    options: {
        page?: number;
        pageSize?: number;
        patientId?: string;
        status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    } = {}
): Promise<{
    data: EncounterWithDetails[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
}> {
    try {
        const supabase = await createClient();
        const { page = 1, pageSize = 50, patientId, status } = options;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
            .from('encounters')
            .select(
                `
                *,
                patient:patients(id, first_name, last_name, mrn, avatar_color),
                provider:users(id, email, full_name)
            `,
                { count: 'exact' }
            )
            .eq('organization_id', organizationId);

        if (patientId) {
            query = query.eq('patient_id', patientId);
        }

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error, count } = await query
            .order('encounter_date', { ascending: false })
            .range(from, to);

        if (error) {
            handleDatabaseError(error, 'getEncounters');
        }

        const totalPages = count ? Math.ceil(count / pageSize) : 0;

        return {
            data: (data || []) as EncounterWithDetails[],
            count: count || 0,
            page,
            pageSize,
            totalPages,
        };
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'getEncounters');
        }
        throw error;
    }
}


/**
 * Get all en counters for a patient
 */
export async function getEncountersByPatientId(
    patientId: string,
    options: { includeDetails?: boolean } = {}
): Promise<Encounter[] | EncounterWithDetails[]> {
    try {
        const supabase = await createClient();
        const { includeDetails = false } = options;

        if (!includeDetails) {
            const { data, error } = await supabase
                .from('encounters')
                .select('*')
                .eq('patient_id', patientId)
                .order('encounter_date', { ascending: false });

            if (error) {
                handleDatabaseError(error, 'getEncountersByPatientId');
            }

            return data || [];
        }

        // Get encounters with joined patient, provider, and note data
        const { data, error } = await supabase
            .from('encounters')
            .select(`
        *,
        patient:patients(*),
        provider:users(*),
        notes(*)
      `)
            .eq('patient_id', patientId)
            .order('encounter_date', { ascending: false });

        if (error) {
            handleDatabaseError(error, 'getEncountersByPatientId:details');
        }

        await createAuditLog({
            event_type: 'ENCOUNTERS_LIST',
            resource_type: 'encounter',
            details: { patient_id: patientId },
            phi_accessed: true,
            risk_level: 'LOW',
        });

        return (data || []) as EncounterWithDetails[];
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'getEncountersByPatientId');
        }
        throw error;
    }
}

/**
 * Get a single encounter by ID
 */
export async function getEncounterById(
    encounterId: string,
    options: { includeDetails?: boolean } = {}
): Promise<Encounter | EncounterWithDetails> {
    try {
        const supabase = await createClient();
        const { includeDetails = false } = options;

        if (!includeDetails) {
            const { data, error } = await supabase
                .from('encounters')
                .select('*')
                .eq('id', encounterId)
                .single();

            if (error) {
                handleDatabaseError(error, 'getEncounterById');
            }

            if (!data) {
                throw new Error(`Encounter ${encounterId} not found`);
            }

            return data as Encounter;
        }

        // Get encounter with joined data
        const { data, error } = await supabase
            .from('encounters')
            .select(`
        *,
        patient:patients(*),
        provider:users(*),
        notes(*)
      `)
            .eq('id', encounterId)
            .single();

        if (error) {
            handleDatabaseError(error, 'getEncounterById:details');
        }

        if (!data) {
            throw new Error(`Encounter ${encounterId} not found`);
        }

        await createAuditLog({
            event_type: 'ENCOUNTER_VIEW',
            resource_type: 'encounter',
            resource_id: encounterId,
            phi_accessed: true,
            risk_level: 'MEDIUM',
        });

        return data as EncounterWithDetails;
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'getEncounterById');
        }
        throw error;
    }
}

/**
 * Get encounters for a provider
 */
export async function getEncountersByProviderId(
    providerId: string,
    organizationId: string,
    options: { limit?: number; status?: Encounter['status'] } = {}
): Promise<Encounter[]> {
    try {
        const supabase = await createClient();
        const { limit = 50, status } = options;

        let query = supabase
            .from('encounters')
            .select('*')
            .eq('provider_id', providerId)
            .eq('organization_id', organizationId)
            .order('encounter_date', { ascending: false })
            .limit(limit);

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
            handleDatabaseError(error, 'getEncountersByProviderId');
        }

        return data || [];
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'getEncountersByProviderId');
        }
        throw error;
    }
}

// =============================================
// CREATE OPERATIONS
// =============================================

/**
 * Create a new encounter
 */
export async function createEncounter(
    organizationId: string,
    providerId: string,
    input: EncounterCreateInput
): Promise<Encounter> {
    try {
        validateRequired(input, ['patient_id', 'encounter_type']);

        const supabase = await createClient();

        const { data: encounter, error } = await supabase
            .from('encounters')
            .insert({
                patient_id: input.patient_id,
                organization_id: organizationId,
                provider_id: providerId,
                encounter_type: input.encounter_type,
                encounter_date: input.encounter_date || new Date().toISOString(),
                chief_complaint: input.chief_complaint || null,
                duration_minutes: input.duration_minutes || null,
                status: 'in_progress',
            })
            .select()
            .single();

        if (error) {
            handleDatabaseError(error, 'createEncounter');
        }

        if (!encounter) {
            throw new Error('Failed to create encounter');
        }

        await createAuditLog({
            event_type: 'ENCOUNTER_CREATE',
            user_id: providerId,
            organization_id: organizationId,
            resource_type: 'encounter',
            resource_id: encounter.id,
            details: { patient_id: input.patient_id, encounter_type: input.encounter_type },
            phi_accessed: true,
            risk_level: 'MEDIUM',
        });

        safeLogger.info(`Created encounter successfully`);
        return encounter as Encounter;
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'createEncounter');
        }
        throw error;
    }
}

// =============================================
// UPDATE OPERATIONS
// =============================================

/**
 * Update an encounter
 */
export async function updateEncounter(
    encounterId: string,
    userId: string,
    input: EncounterUpdateInput
): Promise<Encounter> {
    try {
        const supabase = await createClient();

        const { data: encounter, error } = await supabase
            .from('encounters')
            .update(input)
            .eq('id', encounterId)
            .select()
            .single();

        if (error) {
            handleDatabaseError(error, 'updateEncounter');
        }

        if (!encounter) {
            throw new Error(`Encounter ${encounterId} not found`);
        }

        await createAuditLog({
            event_type: 'ENCOUNTER_UPDATE',
            user_id: userId,
            organization_id: encounter.organization_id,
            resource_type: 'encounter',
            resource_id: encounterId,
            details: { updated_fields: Object.keys(input) },
            phi_accessed: true,
            risk_level: 'MEDIUM',
        });

        safeLogger.info(`Updated encounter successfully`);
        return encounter as Encounter;
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'updateEncounter');
        }
        throw error;
    }
}

/**
 * Complete an encounter
 */
export async function completeEncounter(
    encounterId: string,
    userId: string
): Promise<Encounter> {
    try {
        const supabase = await createClient();

        const { data: encounter, error } = await supabase
            .from('encounters')
            .update({
                status: 'completed',
                updated_at: new Date().toISOString(),
            })
            .eq('id', encounterId)
            .select()
            .single();

        if (error) {
            handleDatabaseError(error, 'completeEncounter');
        }

        if (!encounter) {
            throw new Error(`Encounter ${encounterId} not found`);
        }

        await createAuditLog({
            event_type: 'ENCOUNTER_COMPLETE',
            user_id: userId,
            organization_id: encounter.organization_id,
            resource_type: 'encounter',
            resource_id: encounterId,
            phi_accessed: true,
            risk_level: 'LOW',
        });

        safeLogger.info(`Completed encounter successfully`);
        return encounter as Encounter;
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'completeEncounter');
        }
        throw error;
    }
}

/**
 * Cancel an encounter
 */
export async function cancelEncounter(
    encounterId: string,
    userId: string
): Promise<Encounter> {
    try {
        const supabase = await createClient();

        const { data: encounter, error } = await supabase
            .from('encounters')
            .update({
                status: 'cancelled',
                updated_at: new Date().toISOString(),
            })
            .eq('id', encounterId)
            .select()
            .single();

        if (error) {
            handleDatabaseError(error, 'cancelEncounter');
        }

        if (!encounter) {
            throw new Error(`Encounter ${encounterId} not found`);
        }

        await createAuditLog({
            event_type: 'ENCOUNTER_CANCEL',
            user_id: userId,
            organization_id: encounter.organization_id,
            resource_type: 'encounter',
            resource_id: encounterId,
            phi_accessed: true,
            risk_level: 'LOW',
        });

        safeLogger.info(`Cancelled encounter successfully`);
        return encounter as Encounter;
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'cancelEncounter');
        }
        throw error;
    }
}

