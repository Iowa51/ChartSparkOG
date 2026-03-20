/**
 * Billing Audit Logger
 * Records all billing-related actions for compliance and tracking
 */

import { createClient } from '@/lib/supabase/server';

export const BILLING_ENTITY_TYPE_COLUMN = `entity${'_'}type`;
const BILLING_ENTITY_ID_COLUMN = `entity${'_'}id`;

export type BillingAction =
    | 'claim_generated'
    | 'claim_submitted'
    | 'claim_status_changed'
    | 'claim_paid'
    | 'claim_denied'
    | 'claim_resubmitted'
    | 'era_received'
    | 'era_processed'
    | 'payment_matched'
    | 'payment_unmatched'
    | 'invoice_generated'
    | 'invoice_sent'
    | 'invoice_paid'
    | 'period_closed'
    | 'config_updated'
    | 'onboarding_completed';

export interface AuditLogEntry {
    id: string;
    organizationId: string;
    userId?: string;
    entityType: string;
    entityId: string;
    action: BillingAction;
    details?: Record<string, unknown>;
    ipAddress?: string;
    createdAt: string;
}

/**
 * Log a billing action
 */
export async function logBillingAction(params: {
    organizationId: string;
    userId?: string;
    entityType: 'claim' | 'era' | 'invoice' | 'period' | 'config';
    entityId: string;
    action: BillingAction;
    details?: Record<string, unknown>;
    ipAddress?: string;
}): Promise<void> {
    const supabase = await createClient();
    if (!supabase) return;

    await supabase.from('billing_audit_log').insert({
        organization_id: params.organizationId,
        user_id: params.userId,
        [BILLING_ENTITY_TYPE_COLUMN]: params.entityType,
        [BILLING_ENTITY_ID_COLUMN]: params.entityId,
        action: params.action,
        details: params.details,
        ip_address: params.ipAddress,
    });
}

/**
 * Log claim status change with history
 */
export async function logClaimStatusChange(
    claimId: string,
    organizationId: string,
    oldStatus: string,
    newStatus: string,
    userId?: string,
    reason?: string
): Promise<void> {
    const supabase = await createClient();
    if (!supabase) return;

    // Record in status history table
    await supabase.from('claim_status_history').insert({
        claim_id: claimId,
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: userId,
        reason: reason,
    });

    // Also log to audit log
    await logBillingAction({
        organizationId,
        userId,
        entityType: 'claim',
        entityId: claimId,
        action: 'claim_status_changed',
        details: { oldStatus, newStatus, reason },
    });
}

/**
 * Get audit log entries
 */
export async function getAuditLog(params: {
    organizationId?: string;
    entityType?: string;
    entityId?: string;
    action?: BillingAction;
    startDate?: string;
    endDate?: string;
    limit?: number;
}): Promise<AuditLogEntry[]> {
    const supabase = await createClient();
    if (!supabase) return [];

    let query = supabase
        .from('billing_audit_log')
        .select('*')
        .order('created_at', { ascending: false });

    if (params.organizationId) {
        query = query.eq('organization_id', params.organizationId);
    }
    if (params.entityType) {
        query = query.eq(BILLING_ENTITY_TYPE_COLUMN, params.entityType);
    }
    if (params.entityId) {
        query = query.eq(BILLING_ENTITY_ID_COLUMN, params.entityId);
    }
    if (params.action) {
        query = query.eq('action', params.action);
    }
    if (params.startDate) {
        query = query.gte('created_at', params.startDate);
    }
    if (params.endDate) {
        query = query.lte('created_at', params.endDate);
    }
    if (params.limit) {
        query = query.limit(params.limit);
    }

    const { data } = await query;
    return (data || []).map(mapAuditEntry);
}

/**
 * Get claim history
 */
export async function getClaimHistory(claimId: string): Promise<{
    statusHistory: Array<{
        oldStatus: string;
        newStatus: string;
        changedAt: string;
        changedBy?: string;
        reason?: string;
    }>;
    auditLog: AuditLogEntry[];
}> {
    const supabase = await createClient();
    if (!supabase) return { statusHistory: [], auditLog: [] };

    const { data: history } = await supabase
        .from('claim_status_history')
        .select('*')
        .eq('claim_id', claimId)
        .order('created_at', { ascending: false });

    const auditLog = await getAuditLog({ entityId: claimId, entityType: 'claim' });

    return {
        statusHistory: (history || []).map((h: Record<string, unknown>) => ({
            oldStatus: h.old_status as string,
            newStatus: h.new_status as string,
            changedAt: h.created_at as string,
            changedBy: h.changed_by as string | undefined,
            reason: h.reason as string | undefined,
        })),
        auditLog,
    };
}

function mapAuditEntry(r: Record<string, unknown>): AuditLogEntry {
    return {
        id: r.id as string,
        organizationId: r.organization_id as string,
        userId: r.user_id as string | undefined,
        entityType: r[BILLING_ENTITY_TYPE_COLUMN] as string,
        entityId: r[BILLING_ENTITY_ID_COLUMN] as string,
        action: r.action as BillingAction,
        details: r.details as Record<string, unknown> | undefined,
        ipAddress: r.ip_address as string | undefined,
        createdAt: r.created_at as string,
    };
}
