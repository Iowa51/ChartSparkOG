import { NextRequest, NextResponse } from 'next/server';
import safeAzureOpenAI from '@/services/safeAzureOpenAI';

export async function POST(request: NextRequest) {
    try {
        const { patientProfile, diagnoses } = await request.json();

        if (!patientProfile || !diagnoses) {
            return NextResponse.json(
                { error: 'Patient profile and diagnoses are required' },
                { status: 400 }
            );
        }

        // Use safe Azure OpenAI wrapper (falls back to demo if not configured)
        const result = await safeAzureOpenAI.generateTreatmentPlan(patientProfile, diagnoses);

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Error in treatment plan API:', error);
        return NextResponse.json(
            { error: 'Failed to generate treatment plan' },
            { status: 500 }
        );
    }
}
