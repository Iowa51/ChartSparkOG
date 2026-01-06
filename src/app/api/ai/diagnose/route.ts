import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { sessionNotes, specialty = 'mental_health' } = await request.json();

        // PLACEHOLDER: Returns mock data
        // Will be replaced with real AI in Part 3

        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate AI processing

        const mockResponse = {
            symptoms: [
                { text: 'Low mood', confidence: 85, severity: 'moderate' },
                { text: 'Sleep disturbance', confidence: 90, severity: 'moderate' },
                { text: 'Difficulty concentrating', confidence: 75, severity: 'mild' }
            ],
            diagnoses: [
                {
                    condition: 'Major Depressive Disorder, Moderate Episode',
                    icdCode: 'F32.1',
                    confidence: 85,
                    dsm5Criteria: [
                        'Depressed mood most of the day',
                        'Diminished interest in activities',
                        'Sleep disturbance',
                        'Difficulty concentrating'
                    ],
                    supportingEvidence: 'Patient reports persistent low mood for 6 weeks, sleep difficulties, and reduced interest in previously enjoyed activities.'
                }
            ],
            riskScores: {
                phq9: { score: 18, severity: 'Moderately Severe Depression', interpretation: 'Warrants active treatment with psychotherapy and/or pharmacotherapy' },
                gad7: { score: 12, severity: 'Moderate Anxiety', interpretation: 'Consider further assessment and treatment' }
            },
            recommendations: [
                'Consider antidepressant medication (SSRI first-line)',
                'Refer for cognitive behavioral therapy (CBT)',
                'Follow-up in 2 weeks to assess treatment response',
                'Assess suicide risk at each visit',
                'Monitor for medication side effects'
            ],
            fromCache: false,
            modelUsed: 'placeholder',
            processingTime: '1.0s'
        };

        return NextResponse.json(mockResponse);

    } catch (error: any) {
        console.error('Error in diagnose API:', error);
        return NextResponse.json({ error: 'Failed to analyze' }, { status: 500 });
    }
}
