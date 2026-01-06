import { NextRequest, NextResponse } from 'next/server';
import azureOpenAIService from '@/services/azureOpenAIService';

export async function POST(request: NextRequest) {
    try {
        const { diagnosis, symptoms, history, previousTreatments } = await request.json();

        if (!diagnosis || !symptoms) {
            return NextResponse.json({ error: 'Diagnosis and symptoms are required' }, { status: 400 });
        }

        const recommendations = await azureOpenAIService.generateTreatmentRecommendations({
            diagnosis,
            symptoms,
            history: history || 'No history provided',
            previousTreatments: previousTreatments || 'None noted'
        });

        return NextResponse.json({
            success: true,
            recommendations
        });

    } catch (error: any) {
        console.error('Error in recommendations API:', error);
        return NextResponse.json({ error: 'Failed to generate recommendations: ' + error.message }, { status: 500 });
    }
}
