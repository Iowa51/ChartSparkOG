import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Demo risk assessments data for when database is not available
const demoAssessments = [
    {
        id: 'ra-demo-1',
        patient_id: '1',
        assessment_date: '2024-01-15',
        assessment_type: 'MMSE',
        mmse_score: 28,
        moca_score: null,
        fall_risk_score: 'low',
        gds15_score: 3,
        tug_seconds: 10,
        notes: 'Patient demonstrates good cognitive function. MMSE score within normal limits.',
        recommendations: ['Continue current care plan', 'Reasses in 6 months'],
        provider_id: 'demo-provider',
        created_at: '2024-01-15T10:30:00Z'
    },
    {
        id: 'ra-demo-2',
        patient_id: '1',
        assessment_date: '2024-01-10',
        assessment_type: 'Fall Risk',
        mmse_score: null,
        moca_score: null,
        fall_risk_score: 'moderate',
        gds15_score: null,
        tug_seconds: 14,
        notes: 'TUG test indicates moderate fall risk. Balance slightly impaired.',
        recommendations: ['Physical therapy referral', 'Home safety evaluation', 'Medication review for fall-risk meds'],
        provider_id: 'demo-provider',
        created_at: '2024-01-10T14:00:00Z'
    }
];

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const patientId = searchParams.get('patientId');

        if (!patientId) {
            return NextResponse.json({ error: 'patientId required' }, { status: 400 });
        }

        // Try to get from Supabase
        try {
            const supabase = await createClient();
            if (supabase) {
                const { data: assessments, error } = await supabase
                    .from('risk_assessments')
                    .select('*')
                    .eq('patient_id', patientId)
                    .order('assessment_date', { ascending: false });

                if (!error && assessments) {
                    return NextResponse.json({ assessments });
                }
            }
        } catch (dbError) {
            console.log('[Risk Assessments] Database not available, using demo data');
        }

        // Fallback to demo data
        const filteredAssessments = demoAssessments.filter(a => a.patient_id === patientId);
        return NextResponse.json({ assessments: filteredAssessments, isDemo: true });

    } catch (error) {
        console.error('Error in risk assessments GET:', error);
        return NextResponse.json({ assessments: [], isDemo: true });
    }
}

export async function POST(request: NextRequest) {
    try {
        const assessmentData = await request.json();

        // Try to save to Supabase
        try {
            const supabase = await createClient();
            if (supabase) {
                const { data: { user } } = await supabase.auth.getUser();

                const { data: assessment, error } = await supabase
                    .from('risk_assessments')
                    .insert([{
                        ...assessmentData,
                        provider_id: user?.id || 'demo-provider'
                    }])
                    .select()
                    .single();

                if (!error && assessment) {
                    // Update patient record with latest scores
                    await supabase.from('patients').update({
                        fall_risk_score: assessmentData.fall_risk_score,
                        cognitive_score: assessmentData.mmse_score || assessmentData.moca_score
                    }).eq('id', assessmentData.patient_id);

                    return NextResponse.json({ assessment }, { status: 201 });
                }
            }
        } catch (dbError) {
            console.log('[Risk Assessments] Database not available, using demo mode');
        }

        // Demo mode - return the data as if it was saved
        const demoAssessment = {
            id: `ra-demo-${Date.now()}`,
            ...assessmentData,
            provider_id: 'demo-provider',
            created_at: new Date().toISOString()
        };

        return NextResponse.json({ assessment: demoAssessment, isDemo: true }, { status: 201 });

    } catch (error) {
        console.error('Error in risk assessments POST:', error);
        return NextResponse.json({ error: 'Failed to create assessment' }, { status: 500 });
    }
}
