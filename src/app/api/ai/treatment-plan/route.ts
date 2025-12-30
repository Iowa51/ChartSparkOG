import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

export async function POST(request: NextRequest) {
    try {
        const { patientData, diagnoses } = await request.json();

        // MOCK MODE
        if (!openai) {
            console.log('Running in mock mode - no OpenAI API key');

            return NextResponse.json({
                options: [
                    {
                        id: 'conservative',
                        name: 'Conservative Approach',
                        description: 'Lower-risk initial treatment with gradual escalation',
                        medications: [
                            {
                                name: 'Sertraline (Zoloft)',
                                dosage: '25mg daily',
                                duration: 'Start low, increase to 50mg after 1 week',
                                rationale: 'Well-tolerated SSRI with good safety profile',
                                sideEffects: 'Mild nausea, sexual dysfunction (10-15%)',
                                cost: '$'
                            }
                        ],
                        therapy: {
                            type: 'Cognitive Behavioral Therapy (CBT)',
                            frequency: 'Weekly sessions (50 min)',
                            duration: '12-16 weeks',
                            rationale: 'Evidence-based first-line psychotherapy for depression',
                            provider: 'Licensed therapist specializing in CBT'
                        },
                        lifestyle: [
                            'Sleep hygiene (consistent 8hr schedule)',
                            'Light exercise 3x/week (walking 20-30 min)',
                            'Limit alcohol and caffeine',
                            'Mindfulness/meditation 10 min daily'
                        ],
                        monitoring: [
                            'Follow-up in 2 weeks',
                            'PHQ-9 assessment at each visit',
                            'Monitor for side effects and suicidal ideation',
                            'Adjust dosage based on response at 4 weeks'
                        ],
                        predictedEfficacy: 65,
                        timeToImprovement: '4-6 weeks',
                        successRate: '60-70% response rate',
                        pros: [
                            'Minimal side effects',
                            'Lower cost',
                            'Good tolerability',
                            'Can adjust based on response'
                        ],
                        cons: [
                            'Slower initial response',
                            'May need dose adjustment',
                            'Requires patience',
                            'Weekly therapy commitment'
                        ]
                    },
                    {
                        id: 'moderate',
                        name: 'Moderate/Standard Approach',
                        description: 'Evidence-based standard treatment protocol',
                        medications: [
                            {
                                name: 'Escitalopram (Lexapro)',
                                dosage: '10mg daily',
                                duration: 'Standard therapeutic dose',
                                rationale: 'Highly effective SSRI with favorable side effect profile',
                                sideEffects: 'Nausea, fatigue, sexual dysfunction (15-20%)',
                                cost: '$$'
                            }
                        ],
                        therapy: {
                            type: 'Cognitive Behavioral Therapy (CBT)',
                            frequency: 'Twice weekly initially, then weekly',
                            duration: '16-20 weeks',
                            rationale: 'Intensive CBT for faster symptom reduction',
                            provider: 'Licensed CBT specialist'
                        },
                        lifestyle: [
                            'Structured sleep schedule (7-9 hrs)',
                            'Regular exercise 4-5x/week (30-45 min)',
                            'Nutrition consultation',
                            'Stress management techniques',
                            'Social support activation'
                        ],
                        monitoring: [
                            'Follow-up weekly for first month',
                            'Then bi-weekly for 3 months',
                            'PHQ-9 and GAD-7 at each visit',
                            'Lab work at 3 months (if needed)',
                            'Medication adjustment as needed'
                        ],
                        predictedEfficacy: 75,
                        timeToImprovement: '3-4 weeks',
                        successRate: '70-80% response rate',
                        pros: [
                            'Standard evidence-based approach',
                            'Balanced risk/benefit',
                            'Good efficacy data',
                            'Established protocols'
                        ],
                        cons: [
                            'Moderate cost',
                            'More frequent appointments',
                            'Higher side effect likelihood',
                            'Requires time commitment'
                        ]
                    },
                    {
                        id: 'aggressive',
                        name: 'Aggressive/Intensive Approach',
                        description: 'Intensive intervention for rapid symptom relief',
                        medications: [
                            {
                                name: 'Venlafaxine XR (Effexor)',
                                dosage: '75mg daily, increase to 150mg',
                                duration: 'Higher potency SNRI',
                                rationale: 'Dual mechanism (serotonin + norepinephrine) for severe depression',
                                sideEffects: 'Increased blood pressure, nausea, withdrawal symptoms',
                                cost: '$$$'
                            },
                            {
                                name: 'Aripiprazole (Abilify)',
                                dosage: '2-5mg daily (adjunct)',
                                duration: 'As augmentation if needed',
                                rationale: 'Augmentation strategy for treatment-resistant cases',
                                sideEffects: 'Akathisia, weight gain, metabolic effects',
                                cost: '$$$$'
                            }
                        ],
                        therapy: {
                            type: 'Intensive Outpatient Program (IOP)',
                            frequency: '3 sessions/week (3 hours each)',
                            duration: '6-8 weeks, then step down',
                            rationale: 'Intensive structure for severe symptoms with functional impairment',
                            provider: 'Multidisciplinary team (psychiatrist, therapist, case manager)'
                        },
                        lifestyle: [
                            'Structured daily schedule',
                            'Daily exercise regimen',
                            'Nutritionist consultation',
                            'Case management for work/life coordination',
                            'Family therapy component',
                            'Support group participation'
                        ],
                        monitoring: [
                            'Weekly psychiatrist visits',
                            'Bi-weekly therapy check-ins',
                            'Blood pressure monitoring (Venlafaxine)',
                            'Lab work (metabolic panel) monthly',
                            'Safety planning and crisis contacts',
                            'Consider partial hospitalization if worsening'
                        ],
                        predictedEfficacy: 82,
                        timeToImprovement: '2-3 weeks',
                        successRate: '75-85% response rate',
                        pros: [
                            'Fastest symptom relief',
                            'Comprehensive approach',
                            'Close monitoring',
                            'Multiple interventions',
                            'Best for severe cases'
                        ],
                        cons: [
                            'Higher cost',
                            'More side effects',
                            'Significant time commitment',
                            'May be overwhelming',
                            'Insurance may not cover fully'
                        ]
                    }
                ],
                patientProfile: {
                    currentDiagnoses: diagnoses || ['Major Depressive Disorder'],
                    severity: 'Moderate to Severe',
                    functionalImpairment: 'Significant work and social impairment',
                    riskFactors: ['Sleep disturbance', 'Anhedonia', 'Passive suicidal ideation'],
                    protectiveFactors: ['Strong support system', 'No prior attempts', 'Engaged in treatment']
                },
                recommendations: {
                    recommended: 'moderate',
                    rationale: 'Based on moderate-severe symptoms with functional impairment, standard evidence-based approach is recommended. Conservative may be insufficient, while aggressive may be premature without trying standard treatment first.',
                    alternativeConsiderations: 'If no response in 4-6 weeks with moderate approach, escalate to aggressive. If mild presentation, consider conservative first.'
                },
                timestamp: new Date().toISOString()
            });
        }

        // REAL OPENAI MODE
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are a treatment planning assistant for mental health clinicians. Generate personalized treatment plans based on patient data and diagnoses.

Return 3 treatment options (Conservative, Moderate, Aggressive) with:
- Medications (name, dosage, rationale, side effects, cost)
- Therapy type and frequency
- Lifestyle interventions
- Monitoring plan
- Predicted efficacy (%)
- Pros and cons

Output valid JSON matching the structure shown in the example.`
                },
                {
                    role: "user",
                    content: `Generate treatment plan for:\n\nPatient: ${JSON.stringify(patientData)}\nDiagnoses: ${JSON.stringify(diagnoses)}`
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.4,
        });

        const result = JSON.parse(completion.choices[0].message.content || '{}');
        return NextResponse.json(result);

    } catch (error) {
        console.error('Treatment Plan Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate treatment plan' },
            { status: 500 }
        );
    }
}
