/**
 * Collection Service
 * Manages collection periods for managed billing clients
 * 
 * NOTE: This is a NEW service. It does not replace any existing code.
 */

import { createClient } from '@/lib/supabase/server';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

export interface CollectionPeriod {
    id: string;
    organizationId: string;
    periodStart: string;
    periodEnd: string;
    status: 'open' | 'closed' | 'invoiced' | 'paid';
    totalClaims: number;
    totalBilled: number;
    totalCollected: number;
    managementFee: number;
    netToClient: number;
}

export interface CollectionSummary {
    currentPeriod: CollectionPeriod | null;
    previousPeriods: CollectionPeriod[];
    ytdStats: {
        totalBilled: number;
        totalCollected: number;
        totalFees: number;
        collectionRate: number;
    };
}

/**
 * Get or create current collection period for an organization
 */
export async function getCurrentCollectionPeriod(
    organizationId: string
): Promise<CollectionPeriod | null> {
    const supabase = await createClient();

    if (!supabase) {
        return null;
    }

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Try to find existing period
    const { data: existing } = await supabase
        .from('collection_periods')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'open')
        .gte('period_start', periodStart.toISOString())
        .lte('period_end', periodEnd.toISOString())
        .maybeSingle();

    if (existing) {
        return mapCollectionPeriod(existing);
    }

    // Create new period
    const { data: newPeriod, error } = await supabase
        .from('collection_periods')
        .insert({
            organization_id: organizationId,
            period_start: periodStart.toISOString(),
            period_end: periodEnd.toISOString(),
            status: 'open',
            total_claims: 0,
            total_billed: 0,
            total_collected: 0,
            management_fee: 0,
            net_to_client: 0,
        })
        .select()
        .single();

    if (error) {
        logError({ action: 'COLLECTION_SERVICE_CREATE_PERIOD_FAILED', error: sanitizeError(error), organizationId });
        return null;
    }

    return mapCollectionPeriod(newPeriod);
}

/**
 * Get collection summary for an organization
 */
export async function getCollectionSummary(
    organizationId: string
): Promise<CollectionSummary> {
    const supabase = await createClient();

    if (!supabase) {
        return {
            currentPeriod: null,
            previousPeriods: [],
            ytdStats: { totalBilled: 0, totalCollected: 0, totalFees: 0, collectionRate: 0 },
        };
    }

    // Get current period
    const currentPeriod = await getCurrentCollectionPeriod(organizationId);

    // Get previous periods (last 12 months)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { data: previous } = await supabase
        .from('collection_periods')
        .select('*')
        .eq('organization_id', organizationId)
        .neq('status', 'open')
        .gte('period_start', oneYearAgo.toISOString())
        .order('period_start', { ascending: false });

    const previousPeriods = (previous || []).map(mapCollectionPeriod);

    // Calculate YTD stats
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const { data: ytdPeriods } = await supabase
        .from('collection_periods')
        .select('total_billed, total_collected, management_fee')
        .eq('organization_id', organizationId)
        .gte('period_start', yearStart.toISOString());

    interface YtdStats {
        totalBilled: number;
        totalCollected: number;
        totalFees: number;
        collectionRate: number;
    }

    const ytdStats: YtdStats = { totalBilled: 0, totalCollected: 0, totalFees: 0, collectionRate: 0 };
    for (const period of (ytdPeriods || []) as Array<{ total_billed?: number; total_collected?: number; management_fee?: number }>) {
        ytdStats.totalBilled += period.total_billed || 0;
        ytdStats.totalCollected += period.total_collected || 0;
        ytdStats.totalFees += period.management_fee || 0;
    }

    ytdStats.collectionRate = ytdStats.totalBilled > 0
        ? Math.round((ytdStats.totalCollected / ytdStats.totalBilled) * 100)
        : 0;

    return {
        currentPeriod,
        previousPeriods,
        ytdStats,
    };
}

/**
 * Update collection period when a claim is paid
 */
export async function recordClaimPayment(
    claimId: string,
    paidAmount: number
): Promise<void> {
    const supabase = await createClient();

    if (!supabase) return;

    // Get claim to find organization and period
    const { data: claim } = await supabase
        .from('billing_claims')
        .select('organization_id, service_date, billed_amount')
        .eq('id', claimId)
        .single();

    if (!claim) return;

    // Find the collection period for this claim's service date
    const serviceDate = new Date(claim.service_date);
    const periodStart = new Date(serviceDate.getFullYear(), serviceDate.getMonth(), 1);
    const periodEnd = new Date(serviceDate.getFullYear(), serviceDate.getMonth() + 1, 0);

    const { data: period } = await supabase
        .from('collection_periods')
        .select('id, total_collected, total_claims')
        .eq('organization_id', claim.organization_id)
        .gte('period_start', periodStart.toISOString())
        .lte('period_end', periodEnd.toISOString())
        .maybeSingle();

    if (period) {
        // Update existing period
        await supabase
            .from('collection_periods')
            .update({
                total_collected: (period.total_collected || 0) + paidAmount,
                updated_at: new Date().toISOString(),
            })
            .eq('id', period.id);
    }
}

/**
 * Record a new claim in the collection period
 */
export async function recordClaimSubmission(
    claimId: string,
    billedAmount: number
): Promise<void> {
    const supabase = await createClient();

    if (!supabase) return;

    const { data: claim } = await supabase
        .from('billing_claims')
        .select('organization_id, service_date')
        .eq('id', claimId)
        .single();

    if (!claim) return;

    const period = await getCurrentCollectionPeriod(claim.organization_id);

    if (period) {
        const { data: existingPeriod } = await supabase
            .from('collection_periods')
            .select('id, total_claims, total_billed')
            .eq('id', period.id)
            .single();

        if (existingPeriod) {
            await supabase
                .from('collection_periods')
                .update({
                    total_claims: (existingPeriod.total_claims || 0) + 1,
                    total_billed: (existingPeriod.total_billed || 0) + billedAmount,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', period.id);
        }
    }
}

/**
 * Close a collection period and calculate fees
 */
export async function closeCollectionPeriod(
    periodId: string,
    feePercentage: number = 5
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    if (!supabase) {
        return { success: false, error: 'Database not available' };
    }

    const { data: period } = await supabase
        .from('collection_periods')
        .select('*')
        .eq('id', periodId)
        .single();

    if (!period) {
        return { success: false, error: 'Period not found' };
    }

    if (period.status !== 'open') {
        return { success: false, error: 'Period is already closed' };
    }

    // Calculate management fee
    const managementFee = Math.round((period.total_collected || 0) * (feePercentage / 100));
    const netToClient = (period.total_collected || 0) - managementFee;

    const { error } = await supabase
        .from('collection_periods')
        .update({
            status: 'closed',
            management_fee: managementFee,
            net_to_client: netToClient,
            closed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', periodId);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Get claims for a specific collection period
 */
export async function getPeriodClaims(periodId: string): Promise<any[]> {
    const supabase = await createClient();

    if (!supabase) return [];

    const { data: period } = await supabase
        .from('collection_periods')
        .select('organization_id, period_start, period_end')
        .eq('id', periodId)
        .single();

    if (!period) return [];

    const { data: claims } = await supabase
        .from('billing_claims')
        .select(`
            *,
            patients (first_name, last_name),
            users!billing_claims_provider_id_fkey (first_name, last_name)
        `)
        .eq('organization_id', period.organization_id)
        .gte('service_date', period.period_start)
        .lte('service_date', period.period_end)
        .order('service_date', { ascending: false });

    return claims || [];
}

/**
 * Map database record to CollectionPeriod interface
 */
function mapCollectionPeriod(record: Record<string, unknown>): CollectionPeriod {
    return {
        id: record.id as string,
        organizationId: record.organization_id as string,
        periodStart: record.period_start as string,
        periodEnd: record.period_end as string,
        status: record.status as CollectionPeriod['status'],
        totalClaims: (record.total_claims as number) || 0,
        totalBilled: (record.total_billed as number) || 0,
        totalCollected: (record.total_collected as number) || 0,
        managementFee: (record.management_fee as number) || 0,
        netToClient: (record.net_to_client as number) || 0,
    };
}
