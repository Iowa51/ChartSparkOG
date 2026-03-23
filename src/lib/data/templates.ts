/**
 * Templates Data Layer
 * Production-ready operations for note templates management
 */

import { createClient } from '@/lib/supabase/server';
import type { NoteTemplate } from '../types/database';
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
 * Get all system templates (available to everyone)
 */
export async function getSystemTemplates(): Promise<NoteTemplate[]> {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('note_templates')
            .select('*')
            .eq('is_system', true)
            .order('display_order', { ascending: true });

        if (error) {
            handleDatabaseError(error, 'getSystemTemplates');
        }

        return data || [];
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'getSystemTemplates');
        }
        throw error;
    }
}

/**
 * Get organization-specific templates
 */
export async function getOrganizationTemplates(
    organizationId: string
): Promise<NoteTemplate[]> {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('note_templates')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('is_system', false)
            .order('created_at', { ascending: false });

        if (error) {
            handleDatabaseError(error, 'getOrganizationTemplates');
        }

        return data || [];
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'getOrganizationTemplates');
        }
        throw error;
    }
}

/**
 * Get all available templates for an organization
 * Combines system templates and organization templates
 */
export async function getAllTemplatesForOrganization(
    organizationId: string
): Promise<NoteTemplate[]> {
    try {
        const supabase = await createClient();

        // SEC-SPRINT8: Fetch system + org templates with separate safe queries
        // instead of dynamic .or() filter string interpolation
        const [systemResult, orgResult] = await Promise.all([
            supabase
                .from('note_templates')
                .select('*')
                .eq('is_system', true),
            supabase
                .from('note_templates')
                .select('*')
                .eq('organization_id', organizationId),
        ]);

        if (systemResult.error) {
            handleDatabaseError(systemResult.error, 'getAllTemplatesForOrganization:system');
        }
        if (orgResult.error) {
            handleDatabaseError(orgResult.error, 'getAllTemplatesForOrganization:org');
        }

        const combined = [...(systemResult.data || []), ...(orgResult.data || [])];

        // De-duplicate in case a system template also has organization_id set
        const seen = new Set<string>();
        const unique = combined.filter(t => {
            if (seen.has(t.id)) return false;
            seen.add(t.id);
            return true;
        });

        // Sort: system first, then defaults, then by name
        unique.sort((a, b) => {
            if (a.is_system !== b.is_system) return a.is_system ? -1 : 1;
            if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
            return (a.name || '').localeCompare(b.name || '');
        });

        return unique;
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'getAllTemplatesForOrganization');
        }
        throw error;
    }
}

/**
 * Get a single template by ID
 */
export async function getTemplateById(templateId: string): Promise<NoteTemplate> {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('note_templates')
            .select('*')
            .eq('id', templateId)
            .single();

        if (error) {
            handleDatabaseError(error, 'getTemplateById');
        }

        if (!data) {
            throw new Error(`Template ${templateId} not found`);
        }

        await createAuditLog({
            event_type: 'TEMPLATE_VIEW',
            resource_type: 'note_template',
            resource_id: templateId,
            phi_accessed: false,
            risk_level: 'LOW',
        });

        return data as NoteTemplate;
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'getTemplateById');
        }
        throw error;
    }
}

/**
 * Get the default template for an organization
 */
export async function getDefaultTemplate(
    organizationId: string
): Promise<NoteTemplate | null> {
    try {
        const supabase = await createClient();

        // First try to get organization's default template
        const { data: orgDefault, error: orgError } = await supabase
            .from('note_templates')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('is_default', true)
            .maybeSingle();

        if (orgError) {
            safeLogger.warn(`Error fetching org default template: ${orgError.message}`);
        }

        if (orgDefault) {
            return orgDefault as NoteTemplate;
        }

        // Fall back to system default
        const { data: systemDefault, error: systemError } = await supabase
            .from('note_templates')
            .select('*')
            .eq('is_system', true)
            .eq('is_default', true)
            .maybeSingle();

        if (systemError) {
            handleDatabaseError(systemError, 'getDefaultTemplate:system');
        }

        return systemDefault as NoteTemplate | null;
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'getDefaultTemplate');
        }
        throw error;
    }
}

// =============================================
// CREATE OPERATIONS (Admin only)
// =============================================

export interface TemplateCreateInput {
    name: string;
    description?: string;
    is_default?: boolean;
    structure?: NoteTemplate['structure'];
    cpt_suggestions?: string[];
    icd10_suggestions?: string[];
}

/**
 * Create a new organization template (Admin only)
 */
export async function createTemplate(
    organizationId: string,
    userId: string,
    input: TemplateCreateInput
): Promise<NoteTemplate> {
    try {
        validateRequired(input, ['name']);

        const supabase = await createClient();

        // If setting as default, unset other defaults first
        if (input.is_default) {
            await supabase
                .from('note_templates')
                .update({ is_default: false })
                .eq('organization_id', organizationId);
        }

        const { data: template, error } = await supabase
            .from('note_templates')
            .insert({
                organization_id: organizationId,
                name: input.name,
                description: input.description || null,
                is_system: false,
                is_default: input.is_default || false,
                structure: input.structure || {
                    subjective: { label: 'Subjective', placeholder: '' },
                    objective: { label: 'Objective', placeholder: '' },
                    assessment: { label: 'Assessment', placeholder: '' },
                    plan: { label: 'Plan', placeholder: '' },
                },
                cpt_suggestions: input.cpt_suggestions || [],
                icd10_suggestions: input.icd10_suggestions || [],
            })
            .select()
            .single();

        if (error) {
            handleDatabaseError(error, 'createTemplate');
        }

        if (!template) {
            throw new Error('Failed to create template');
        }

        await createAuditLog({
            event_type: 'TEMPLATE_CREATE',
            user_id: userId,
            organization_id: organizationId,
            resource_type: 'note_template',
            resource_id: template.id,
            details: { name: input.name },
            phi_accessed: false,
            risk_level: 'LOW',
        });

        safeLogger.info(`Created template successfully`);
        return template as NoteTemplate;
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'createTemplate');
        }
        throw error;
    }
}

// =============================================
// UPDATE OPERATIONS (Admin only)
// =============================================

export interface TemplateUpdateInput {
    name?: string;
    description?: string;
    is_default?: boolean;
    structure?: NoteTemplate['structure'];
    cpt_suggestions?: string[];
    icd10_suggestions?: string[];
}

/**
 * Update a template (Admin only)
 */
export async function updateTemplate(
    templateId: string,
    organizationId: string,
    userId: string,
    input: TemplateUpdateInput
): Promise<NoteTemplate> {
    try {
        const supabase = await createClient();

        // If setting as default, unset other defaults first
        if (input.is_default) {
            await supabase
                .from('note_templates')
                .update({ is_default: false })
                .eq('organization_id', organizationId);
        }

        const { data: template, error } = await supabase
            .from('note_templates')
            .update(input)
            .eq('id', templateId)
            .eq('organization_id', organizationId) // Ensure they can only update their org's templates
            .select()
            .single();

        if (error) {
            handleDatabaseError(error, 'updateTemplate');
        }

        if (!template) {
            throw new Error(`Template ${templateId} not found or access denied`);
        }

        await createAuditLog({
            event_type: 'TEMPLATE_UPDATE',
            user_id: userId,
            organization_id: organizationId,
            resource_type: 'note_template',
            resource_id: templateId,
            details: { updated_fields: Object.keys(input) },
            phi_accessed: false,
            risk_level: 'LOW',
        });

        safeLogger.info(`Updated template successfully`);
        return template as NoteTemplate;
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'updateTemplate');
        }
        throw error;
    }
}

// =============================================
// DELETE OPERATIONS (Admin only)
// =============================================

/**
 * Delete a template (Admin only, cannot delete system templates)
 */
export async function deleteTemplate(
    templateId: string,
    organizationId: string,
    userId: string
): Promise<void> {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from('note_templates')
            .delete()
            .eq('id', templateId)
            .eq('organization_id', organizationId)
            .eq('is_system', false); // Cannot delete system templates

        if (error) {
            handleDatabaseError(error, 'deleteTemplate');
        }

        await createAuditLog({
            event_type: 'TEMPLATE_DELETE',
            user_id: userId,
            organization_id: organizationId,
            resource_type: 'note_template',
            resource_id: templateId,
            phi_accessed: false,
            risk_level: 'LOW',
        });

        safeLogger.info(`Deleted template successfully`);
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'deleteTemplate');
        }
        throw error;
    }
}

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Clone a template (useful for creating custom variants)
 */
export async function cloneTemplate(
    sourceTemplateId: string,
    organizationId: string,
    userId: string,
    newName: string
): Promise<NoteTemplate> {
    try {
        // Get source template
        const sourceTemplate = await getTemplateById(sourceTemplateId);

        // Create new template with same structure
        return await createTemplate(organizationId, userId, {
            name: newName,
            description: `Cloned from ${sourceTemplate.name}`,
            structure: sourceTemplate.structure,
            cpt_suggestions: sourceTemplate.cpt_suggestions,
            icd10_suggestions: sourceTemplate.icd10_suggestions,
            is_default: false,
        });
    } catch (error) {
        if (error instanceof Error && error.name !== 'DatabaseError') {
            handleDatabaseError(error, 'cloneTemplate');
        }
        throw error;
    }
}
