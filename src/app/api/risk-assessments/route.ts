import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const searchParams = request.nextUrl.searchParams;
        const patientId = searchParams.get('patientId');

        if (!patientId) return NextResponse.json({ error: 'patientId required' }, { status: 400 });

        const { data: assessments, error } = await supabase.from('risk_assessments').select('*').eq('patient_id', patientId).order('assessment_date', { ascending: false });
        if (error) throw error;

        return NextResponse.json({ assessments });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const assessmentData = await request.json();
        const { data: assessment, error } = await supabase.from('risk_assessments').insert([{
            ...assessmentData,
            provider_id: user.id
        }]).select().single();

        if (error) throw error;

        await supabase.from('patients').update({
            fall_risk_score: assessmentData.fall_risk_score,
            cognitive_score: assessmentData.mmse_score || assessmentData.moca_score
        }).eq('id', assessmentData.patient_id);

        return NextResponse.json({ assessment }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create assessment' }, { status: 500 });
    }
}
