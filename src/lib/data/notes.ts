/**
 * Notes Data Layer
 * Production-ready CRUD operations for clinical notes management
 */

import { createClient } from '@/lib/supabase/server';
import type {
    Note,
    NoteCreateInput,
    NoteUpdateInput,
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
 * Get all notes for an encounter
 */
export async function getNotesByEncounterId(encounterId: string): Promise<Note[]> {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('clinical_notes')
            .select('*')
            .eq('encounter_id', encounterId)
            .order('created_at', { ascending: false });

        if (error) {
            handleDatabaseError(error, 'getNotesByEncounterId');
        }

        await createAuditLog({
            event_type: 'NOTES_LIST',
            resource_type: 'note',
            details: { encounter_id: encounterId },
            phi_accessed: true,
            risk_level: 'MEDIUM',
        });

        return data || [];
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'getNotesByEncounterId');
        }
        throw error;
    }
}

/**
 * Get a single note by ID
 */
export async function getNoteById(noteId: string): Promise<Note> {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('clinical_notes')
            .select('*')
            .eq('id', noteId)
            .single();

        if (error) {
            handleDatabaseError(error, 'getNoteById');
        }

        if (!data) {
            throw new Error(`Note ${noteId} not found`);
        }

        await createAuditLog({
            event_type: 'NOTE_VIEW',
            resource_type: 'note',
            resource_id: noteId,
            phi_accessed: true,
            risk_level: 'HIGH',
        });

        return data as Note;
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'getNoteById');
        }
        throw error;
    }
}

/**
 * Get notes for a provider with optional filters
 */
export async function getNotesByProviderId(
    providerId: string,
    organizationId: string,
    options: {
        limit?: number;
        status?: Note['status'];
        startDate?: string;
        endDate?: string;
    } = {}
): Promise<Note[]> {
    try {
        const supabase = await createClient();
        const { limit = 50, status, startDate, endDate } = options;

        let query = supabase
            .from('clinical_notes')
            .select('*')
            .eq('provider_id', providerId)
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (status) {
            query = query.eq('status', status);
        }

        if (startDate) {
            query = query.gte('created_at', startDate);
        }

        if (endDate) {
            query = query.lte('created_at', endDate);
        }

        const { data, error } = await query;

        if (error) {
            handleDatabaseError(error, 'getNotesByProviderId');
        }

        return data || [];
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'getNotesByProviderId');
        }
        throw error;
    }
}

// =============================================
// CREATE OPERATIONS
// =============================================

/**
 * Create a new clinical note
 */
export async function createNote(
    organizationId: string,
    providerId: string,
    input: NoteCreateInput
): Promise<Note> {
    try {
        validateRequired(input, ['encounter_id']);

        const supabase = await createClient();

        const { data: note, error } = await supabase
            .from('clinical_notes')
            .insert({
                encounter_id: input.encounter_id,
                organization_id: organizationId,
                provider_id: providerId,
                template_id: input.template_id || null,
                subjective: input.subjective || null,
                objective: input.objective || null,
                assessment: input.assessment || null,
                plan: input.plan || null,
                cpt_codes: input.cpt_codes || [],
                icd10_codes: input.icd10_codes || [],
                billing_amount: 0,
                status: 'draft',
            })
            .select()
            .single();

        if (error) {
            handleDatabaseError(error, 'createNote');
        }

        if (!note) {
            throw new Error('Failed to create note');
        }

        await createAuditLog({
            event_type: 'NOTE_CREATE',
            user_id: providerId,
            organization_id: organizationId,
            resource_type: 'note',
            resource_id: note.id,
            details: { encounter_id: input.encounter_id },
            phi_accessed: true,
            risk_level: 'HIGH',
        });

        safeLogger.info(`Created note successfully`);
        return note as Note;
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'createNote');
        }
        throw error;
    }
}

// =============================================
// UPDATE OPERATIONS
// =============================================

/**
 * Update a note (auto-save or manual edit)
 */
export async function updateNote(
    noteId: string,
    userId: string,
    input: NoteUpdateInput,
    options: { isAutoSave?: boolean } = {}
): Promise<Note> {
    try {
        const supabase = await createClient();
        const { isAutoSave = false } = options;

        const { data: note, error } = await supabase
            .from('clinical_notes')
            .update(input)
            .eq('id', noteId)
            .select()
            .single();

        if (error) {
            handleDatabaseError(error, 'updateNote');
        }

        if (!note) {
            throw new Error(`Note ${noteId} not found`);
        }

        // Only audit log manual saves to reduce log volume
        if (!isAutoSave) {
            await createAuditLog({
                event_type: 'NOTE_UPDATE',
                user_id: userId,
                organization_id: note.organization_id,
                resource_type: 'note',
                resource_id: noteId,
                details: { updated_fields: Object.keys(input), is_auto_save: isAutoSave },
                phi_accessed: true,
                risk_level: 'MEDIUM',
            });
        }

        if (!isAutoSave) {
            safeLogger.info(`Updated note successfully`);
        }

        return note as Note;
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'updateNote');
        }
        throw error;
    }
}

/**
 * Sign a clinical note (finalizes it)
 */
export async function signNote(
    noteId: string,
    userId: string
): Promise<Note> {
    try {
        const supabase = await createClient();

        // First, get the note to calculate billing
        const { data: existingNote, error: fetchError } = await supabase
            .from('clinical_notes')
            .select('*')
            .eq('id', noteId)
            .single();

        if (fetchError) {
            handleDatabaseError(fetchError, 'signNote:fetch');
        }

        if (!existingNote) {
            throw new Error(`Note ${noteId} not found`);
        }

        // platform_fee_amount / net_amount are legacy columns from the old
        // `notes` table — they were never migrated onto `clinical_notes`,
        // so only billing_amount is persisted here.
        const billingAmount = calculateBillingAmount(existingNote.cpt_codes);

        // Update note with billing and signed status
        const { data: note, error } = await supabase
            .from('clinical_notes')
            .update({
                status: 'signed',
                signed_at: new Date().toISOString(),
                billing_amount: billingAmount,
            })
            .eq('id', noteId)
            .select()
            .single();

        if (error) {
            handleDatabaseError(error, 'signNote:update');
        }

        if (!note) {
            throw new Error(`Failed to sign note ${noteId}`);
        }

        await createAuditLog({
            event_type: 'NOTE_SIGN',
            user_id: userId,
            organization_id: note.organization_id,
            resource_type: 'note',
            resource_id: noteId,
            details: {
                billing_amount: billingAmount,
                cpt_codes: existingNote.cpt_codes,
            },
            phi_accessed: true,
            risk_level: 'CRITICAL',
        });

        safeLogger.info(`Signed note successfully`);
        return note as Note;
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'signNote');
        }
        throw error;
    }
}

/**
 * Complete a note (without signing, for review)
 */
export async function completeNote(
    noteId: string,
    userId: string
): Promise<Note> {
    try {
        const supabase = await createClient();

        const { data: note, error } = await supabase
            .from('clinical_notes')
            .update({
                status: 'completed',
                updated_at: new Date().toISOString(),
            })
            .eq('id', noteId)
            .select()
            .single();

        if (error) {
            handleDatabaseError(error, 'completeNote');
        }

        if (!note) {
            throw new Error(`Note ${noteId} not found`);
        }

        await createAuditLog({
            event_type: 'NOTE_COMPLETE',
            user_id: userId,
            organization_id: note.organization_id,
            resource_type: 'note',
            resource_id: noteId,
            phi_accessed: true,
            risk_level: 'MEDIUM',
        });

        safeLogger.info(`Completed note successfully`);
        return note as Note;
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'completeNote');
        }
        throw error;
    }
}

// =============================================
// BILLING CALCULATIONS
// =============================================

/**
 * CPT code billing rates (simplified for demo)
 * In production, this would be fetched from a fee schedule table
 */
// F-052: All rates in CENTS (integers) — consistent with claim-generator.ts
const CPT_RATES: Record<string, number> = {
    // Evaluation & Management
    '99211': 2500,
    '99212': 5000,
    '99213': 7500,
    '99214': 11000,
    '99215': 15000,
    // New Patient Visits
    '99201': 4500,
    '99202': 7500,
    '99203': 11000,
    '99204': 16500,
    '99205': 21000,
    // Psychiatric
    '90791': 15000, // Psychiatric diagnostic evaluation
    '90832': 6000,  // Psychotherapy 30 min
    '90834': 9000,  // Psychotherapy 45 min
    '90837': 12000, // Psychotherapy 60 min
    // Default
    'DEFAULT': 7500,
};

/**
 * Calculate total billing amount from CPT codes
 */
export function calculateBillingAmount(cptCodes: string[]): number {
    if (!cptCodes || cptCodes.length === 0) {
        return 0;
    }

    return cptCodes.reduce((total, code) => {
        const rate = CPT_RATES[code] || CPT_RATES.DEFAULT;
        return total + rate;
    }, 0);
}

/**
 * Calculate platform fee (default 1%) — returns cents as integer
 */
export function calculatePlatformFee(
    billingAmountCents: number,
    feePercentage: number = 1.0
): number {
    return Math.round(billingAmountCents * (feePercentage / 100));
}

/**
 * Calculate net amount after platform fee — returns cents as integer
 */
export function calculateNetAmount(billingAmountCents: number, platformFeeCents: number): number {
    return billingAmountCents - platformFeeCents;
}

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Get suggested CPT codes for an encounter type
 * In production, this could use AI or templates
 */
export function getSuggestedCPTCodes(encounterType: string): string[] {
    const suggestions: Record<string, string[]> = {
        'Initial Evaluation': ['99204', '99205', '90791'],
        'Follow-up': ['99213', '99214'],
        'Medication Management': ['99213', '99214'],
        'Therapy Session': ['90834', '90837'],
        'Crisis Intervention': ['90839', '90840'],
    };

    return suggestions[encounterType] || ['99213'];
}

/**
 * Validate CPT codes format
 */
export function validateCPTCode(code: string): boolean {
    // CPT codes are 5 digits
    return /^\d{5}$/.test(code);
}

/**
 * Validate ICD-10 codes format
 */
export function validateICD10Code(code: string): boolean {
    // ICD-10 codes: Letter + 2 digits + optional decimal + up to 4 chars
    return /^[A-Z]\d{2}(\.\w{1,4})?$/.test(code);
}
