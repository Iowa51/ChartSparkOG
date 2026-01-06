import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { patientProfile, diagnoses } = await request.json();

        // PLACEHOLDER: Returns mock data
        // Will be replaced with real AI in Part 3

        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate AI processing

        const mockResponse = {
            recommendedOption: 'moderate',
            options: [
                {
                    name: 'Conservative',
                    description: 'Psychotherapy-focused approach with minimal medication',
                    medications: [],
                    therapy: {
                        type: 'Cognitive Behavioral Therapy (CBT)',
                        frequency: 'Weekly sessions',
                        duration: '12-16 weeks'
                    },
                    lifestyle: [
                        'Regular sleep schedule (7-9 hours)',
                        'Daily exercise (30 minutes)',
                        'Social activities 2-3x per week',
                        'Limit alcohol and caffeine'
                    ],
                    cptCodes: [
                        { code: '90834', description: 'Psychotherapy 45 minutes', frequency: 'Weekly' }
                    ],
                    predictedEfficacy: 70,
                    timeline: '8-12 weeks for improvement',
                    suitability: 'Best for mild-moderate cases, motivated patients, no prior medication trials'
                },
                {
                    name: 'Moderate',
                    description: 'Combined medication and therapy approach',
                    medications: [
                        {
                            name: 'Sertraline (Zoloft)',
                            dosage: '50mg daily',
                            titration: 'May increase to 100mg after 4 weeks if needed',
                            duration: '6-12 months minimum',
                            sideEffects: 'Nausea, headache, sexual dysfunction',
                            monitoring: 'Check-in at 2 weeks, 4 weeks, then monthly'
                        }
                    ],
                    therapy: {
                        type: 'Cognitive Behavioral Therapy (CBT)',
                        frequency: 'Weekly sessions',
                        duration: '12-16 weeks'
                    },
                    lifestyle: [
                        'Regular sleep schedule',
                        'Daily exercise',
                        'Stress management techniques',
                        'Social support engagement'
                    ],
                    cptCodes: [
                        { code: '90834', description: 'Psychotherapy 45 minutes', frequency: 'Weekly' },
                        { code: '99213', description: 'Medication management', frequency: 'Monthly' }
                    ],
                    predictedEfficacy: 85,
                    timeline: '4-6 weeks for initial response',
                    suitability: 'Recommended for moderate depression, evidence-based first-line treatment'
                },
                {
                    name: 'Intensive',
                    description: 'Aggressive treatment for severe or treatment-resistant cases',
                    medications: [
                        {
                            name: 'Venlafaxine (Effexor XR)',
                            dosage: '75mg daily',
                            titration: 'Increase to 150mg after 1 week',
                            duration: '12+ months',
                            sideEffects: 'Nausea, increased blood pressure, sweating',
                            monitoring: 'Weekly initially, then bi-weekly'
                        },
                        {
                            name: 'Aripiprazole (Abilify) - augmentation',
                            dosage: '2-5mg daily',
                            rationale: 'For treatment-resistant depression',
                            duration: 'Re-assess after 8 weeks'
                        }
                    ],
                    therapy: {
                        type: 'Intensive outpatient program (IOP) or CBT',
                        frequency: '3-5 sessions per week (IOP) or twice weekly (CBT)',
                        duration: '6-8 weeks IOP, then transition to weekly therapy'
                    },
                    additionalInterventions: [
                        'Consider TMS (Transcranial Magnetic Stimulation) if no response',
                        'Psychiatric consultation for medication optimization',
                        'Case management services'
                    ],
                    lifestyle: [
                        'Structured daily routine',
                        'Supervised exercise program',
                        'Family therapy component',
                        'Crisis plan development'
                    ],
                    cptCodes: [
                        { code: '90834', description: 'Psychotherapy 45 minutes', frequency: '2x weekly' },
                        { code: '99214', description: 'Complex medication management', frequency: 'Bi-weekly' }
                    ],
                    predictedEfficacy: 75,
                    timeline: '6-8 weeks for response',
                    suitability: 'For severe depression, failed prior treatments, significant functional impairment'
                }
            ],
            monitoring: {
                initialFollowUp: '2 weeks',
                regularFollowUp: 'Monthly for first 3 months, then quarterly',
                assessments: ['PHQ-9 at each visit', 'Suicide risk screening', 'Side effect monitoring'],
                redFlags: [
                    'Worsening suicidal ideation',
                    'Severe medication side effects',
                    'No improvement after 6 weeks',
                    'Functional decline'
                ]
            },
            fromCache: false,
            modelUsed: 'placeholder',
            processingTime: '1.2s'
        };

        return NextResponse.json(mockResponse);

    } catch (error: any) {
        console.error('Error in treatment plan API:', error);
        return NextResponse.json({ error: 'Failed to generate plan' }, { status: 500 });
    }
}
