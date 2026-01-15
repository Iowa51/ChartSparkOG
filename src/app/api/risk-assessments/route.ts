// src/app/api/risk-assessments/route.ts
// SEC-004: Locked down risk assessments endpoint
// - Requires authentication
// - AUDITOR cannot create (403)
// - Organization scoping enforced
// - Demo fallback removed
// - Strict Zod validation

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth, AuthContext, canAccessPatient, isSuperAdmin } from '@/lib/auth/api-auth';
import { logPHIAccess } from '@/lib/security/audit-log';
import { z } from 'zod';

// Prevent static generation
export const dynamic = 'force-dynamic';

// Strict Zod schema for risk assessment creation
const RiskAssessmentCreateSchema = z.object({
    patient_id: z.string().uuid('Invalid patient ID'),
    assessment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    assessment_type: z.enum(['MMSE', 'MoCA', 'Fall Risk', 'GDS-15', 'PHQ-9', 'GAD-7']),
    mmse_score: z.number().int().min(0).max(30).nullable().optional(),
    moca_score: z.number().int().min(0).max(30).nullable().optional(),
    fall_risk_score: z.enum(['low', 'moderate', 'high']).nullable().optional(),
    gds15_score: z.number().int().min(0).max(15).nullable().optional(),
    tug_seconds: z.number().positive().nullable().optional(),
    notes: z.string().max(5000).nullable().optional(),
    recommendations: z.array(z.string().max(500)).max(20).optional(),
}).strict(); // Reject unknown keys

interface RiskAssessmentContext extends AuthContext {
    supabase: Awaited<ReturnType<typeof createClient>>;
}

// GET handler - requires auth and org scope
async function handleGet(context: RiskAssessmentContext): Promise<NextResponse> {
    const { user, request, supabase } = context;
    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get('patientId');

    if (!patientId) {
        return NextResponse.json({ error: 'patientId required' }, { status: 400 });
    }

    // Validate UUID format
    if (!z.string().uuid().safeParse(patientId).success) {
        return NextResponse.json({ error: 'Invalid patientId format' }, { status: 400 });
    }

    // Verify patient belongs to user's org (unless SUPER_ADMIN)
    const canAccess = await canAccessPatient(user, patientId);
    if (!canAccess) {
        // Return 404 to avoid leaking patient existence across orgs
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Log PHI access
    await logPHIAccess(
        user.id,
        user.email,
        user.role,
        user.organizationId || '',
        'PATIENT',
        patientId,
        'VIEW',
        request.headers.get('x-forwarded-for') || undefined,
        request.headers.get('user-agent') || undefined
    );

    // Query database - no demo fallback
    const { data: assessments, error } = await supabase
        .from('risk_assessments')
        .select('*')
        .eq('patient_id', patientId)
        .order('assessment_date', { ascending: false });

    if (error) {
        console.error('[Risk Assessments] Database error');
        return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 });
    }

    return NextResponse.json({ assessments: assessments || [] });
}

// POST handler - requires auth, no AUDITOR, org scope
async function handlePost(context: RiskAssessmentContext): Promise<NextResponse> {
    const { user, request, supabase } = context;

    // AUDITOR cannot create risk assessments
    if (user.role === 'AUDITOR') {
        return NextResponse.json({ error: 'Forbidden - Auditors cannot create assessments' }, { status: 403 });
    }

    // Parse and validate request body
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = RiskAssessmentCreateSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({
            error: 'Validation failed',
            details: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
        }, { status: 400 });
    }

    const assessmentData = validation.data;

    // Verify patient belongs to user's org
    const canAccess = await canAccessPatient(user, assessmentData.patient_id);
    if (!canAccess) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Get user's organization_id for the record
    const { data: userProfile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

    if (!userProfile?.organization_id) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    // Insert with server-set fields
    const { data: assessment, error } = await supabase
        .from('risk_assessments')
        .insert([{
            ...assessmentData,
            organization_id: userProfile.organization_id, // Server-set, never trust client
            provider_id: user.id, // Server-set
        }])
        .select()
        .single();

    if (error) {
        console.error('[Risk Assessments] Insert error');
        return NextResponse.json({ error: 'Failed to create assessment' }, { status: 500 });
    }

    // Update patient with latest scores if applicable
    const updateData: Record<string, unknown> = {};
    if (assessmentData.fall_risk_score) updateData.fall_risk_score = assessmentData.fall_risk_score;
    if (assessmentData.mmse_score !== undefined) updateData.cognitive_score = assessmentData.mmse_score;
    if (assessmentData.moca_score !== undefined) updateData.cognitive_score = assessmentData.moca_score;

    if (Object.keys(updateData).length > 0) {
        await supabase
            .from('patients')
            .update(updateData)
            .eq('id', assessmentData.patient_id);
    }

    // Log PHI access
    await logPHIAccess(
        user.id,
        user.email,
        user.role,
        userProfile.organization_id,
        'PATIENT',
        assessmentData.patient_id,
        'CREATE',
        request.headers.get('x-forwarded-for') || undefined,
        request.headers.get('user-agent') || undefined
    );

    return NextResponse.json({ assessment }, { status: 201 });
}

// Create wrapped handler that adds supabase to context
async function createHandlerWithSupabase(
    handler: (context: RiskAssessmentContext) => Promise<NextResponse>
) {
    return withAuth(async (baseContext: AuthContext) => {
        const supabase = await createClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
        }
        return handler({ ...baseContext, supabase } as RiskAssessmentContext);
    });
}

// Export wrapped handlers
export const GET = withAuth(async (context: AuthContext) => {
    const supabase = await createClient();
    if (!supabase) {
        return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }
    return handleGet({ ...context, supabase } as RiskAssessmentContext);
});

export const POST = withAuth(async (context: AuthContext) => {
    const supabase = await createClient();
    if (!supabase) {
        return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }
    return handlePost({ ...context, supabase } as RiskAssessmentContext);
});
