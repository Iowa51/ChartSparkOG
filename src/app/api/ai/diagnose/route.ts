import { NextRequest, NextResponse } from 'next/server';
import safeAzureOpenAI from '@/services/safeAzureOpenAI';

export async function POST(request: NextRequest) {
    try {
        const { sessionNotes, specialty = 'mental_health' } = await request.json();

        if (!sessionNotes) {
            return NextResponse.json(
                { error: 'Session notes are required' },
                { status: 400 }
            );
        }

        // Use safe Azure OpenAI wrapper (falls back to demo if not configured)
        const result = await safeAzureOpenAI.diagnose(sessionNotes, specialty);

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Error in diagnose API:', error);
        return NextResponse.json(
            { error: 'Failed to analyze clinical notes' },
            { status: 500 }
        );
    }
}
