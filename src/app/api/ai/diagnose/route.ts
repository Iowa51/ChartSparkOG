import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI (will use mock mode if no API key)
const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

export async function POST(request: NextRequest) {
    try {
        const { notes, patientContext } = await request.json();

        // MOCK MODE - Use this if no OpenAI API key
        if (!openai) {
            console.log('Running in mock mode - no OpenAI API key provided');

            return NextResponse.json({
                symptoms: [
                    { text: "Depressed mood", confidence: 0.85, severity: "moderate" },
                    { text: "Sleep disturbance (insomnia)", confidence: 0.78, severity: "moderate" },
                    { text: "Fatigue and loss of energy", confidence: 0.72, severity: "mild" },
                    { text: "Difficulty concentrating", confidence: 0.68, severity: "mild" },
                    { text: "Feelings of worthlessness", confidence: 0.64, severity: "moderate" }
                ],
                diagnoses: [
                    {
                        condition: "Major Depressive Disorder",
                        icdCode: "F32.1",
                        confidence: 0.78,
                        dsm5Criteria: "Meets 5 of 9 DSM-5 criteria for major depressive episode",
                        evidence: "Patient reports persistent depressed mood, sleep disturbance, fatigue, and difficulty concentrating for >2 weeks. Symptoms cause significant distress and functional impairment.",
                        supportingSymptoms: ["Depressed mood", "Sleep disturbance", "Fatigue", "Difficulty concentrating", "Feelings of worthlessness"],
                        treatmentConsiderations: "Consider SSRI therapy (e.g., Sertraline 50mg) combined with CBT. Monitor for suicidal ideation."
                    },
                    {
                        condition: "Persistent Depressive Disorder (Dysthymia)",
                        icdCode: "F34.1",
                        confidence: 0.45,
                        dsm5Criteria: "Consider if symptoms persist >2 years with chronic presentation",
                        evidence: "Chronic low mood pattern. Evaluate duration and persistence of symptoms.",
                        supportingSymptoms: ["Depressed mood", "Fatigue", "Difficulty concentrating"],
                        treatmentConsiderations: "Long-term psychotherapy may be beneficial if chronic pattern confirmed."
                    },
                    {
                        condition: "Adjustment Disorder with Depressed Mood",
                        icdCode: "F43.21",
                        confidence: 0.32,
                        dsm5Criteria: "Relevant if symptoms developed in response to identifiable stressor within 3 months",
                        evidence: "Consider if clear precipitating life stressor identified.",
                        supportingSymptoms: ["Depressed mood", "Sleep disturbance"],
                        treatmentConsiderations: "Brief psychotherapy focused on stressor adaptation."
                    }
                ],
                riskScores: {
                    phq9: {
                        score: 18,
                        severity: "Moderately Severe Depression",
                        interpretation: "Scores 15-19 indicate moderately severe depression. Recommend treatment with medication and/or psychotherapy.",
                        changeFromPrevious: "+3"
                    },
                    gad7: {
                        score: 12,
                        severity: "Moderate Anxiety",
                        interpretation: "Scores 10-14 indicate moderate anxiety. Consider treatment.",
                        changeFromPrevious: "+1"
                    },
                    suicideRisk: {
                        level: "moderate",
                        score: 4,
                        factors: ["Depressed mood", "Feelings of worthlessness", "Social withdrawal"],
                        recommendations: "Conduct thorough suicide risk assessment. Develop safety plan. Consider more frequent monitoring."
                    },
                    substanceRisk: {
                        level: "low",
                        score: 1,
                        factors: ["No reported substance use"],
                        recommendations: "No immediate substance use concerns. Continue monitoring."
                    }
                },
                recommendations: [
                    "Consider initiating SSRI therapy (Sertraline 50mg daily or Escitalopram 10mg daily)",
                    "Refer to evidence-based psychotherapy (CBT or IPT)",
                    "Complete suicide risk assessment with C-SSRS",
                    "Schedule follow-up in 2 weeks to assess treatment response",
                    "Consider lab work to rule out medical causes (TSH, CBC, B12)"
                ],
                timestamp: new Date().toISOString()
            });
        }

        // REAL OPENAI MODE - Use this if API key is provided
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are a clinical decision support tool for mental health professionals. Analyze patient symptoms and session notes to suggest possible diagnoses based on DSM-5 criteria.

IMPORTANT:
- Always include confidence scores (0-1 scale)
- Provide evidence from the notes
- Cite specific DSM-5 criteria
- Include risk assessments (PHQ-9, GAD-7, suicide risk, substance use)
- Suggest treatment considerations
- Label all output as 'Clinical Decision Support - Requires Clinician Review'
- Return ONLY valid JSON

Output format:
{
  "symptoms": [{"text": string, "confidence": number, "severity": string}],
  "diagnoses": [{"condition": string, "icdCode": string, "confidence": number, "dsm5Criteria": string, "evidence": string, "supportingSymptoms": string[], "treatmentConsiderations": string}],
  "riskScores": {"phq9": object, "gad7": object, "suicideRisk": object, "substanceRisk": object},
  "recommendations": string[]
}`
                },
                {
                    role: "user",
                    content: `Analyze these clinical notes and provide diagnostic assessment:\n\n${notes}\n\nPatient Context: ${patientContext || 'None provided'}`
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
        });

        const result = JSON.parse(completion.choices[0].message.content || '{}');
        return NextResponse.json(result);

    } catch (error) {
        console.error('AI Diagnosis Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate diagnosis. Please try again.' },
            { status: 500 }
        );
    }
}
