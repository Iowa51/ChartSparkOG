/**
 * Collections API Route
 * SEC-HIGH-01: Migrated to withAuth wrapper
 * GET /api/managed-billing/collections - Get collection summary
 */

import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { getCollectionSummary } from '@/lib/managed-billing/collection-service';

async function handleGet(context: AuthContext) {
    try {
        const summary = await getCollectionSummary(context.user.organizationId!);
        return NextResponse.json(summary);
    } catch (error) {
        console.error('[API] Collections error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

export const GET = withAuth(handleGet, { requireOrganization: true });
