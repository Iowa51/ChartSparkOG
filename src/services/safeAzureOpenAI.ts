/**
 * Safe Azure OpenAI Wrapper
 * 
 * This wrapper provides graceful fallback to demo mode when Azure OpenAI
 * credentials are not configured, ensuring the application works in both
 * demo and production environments.
 * 
 * Migrated to openai v4+ AzureOpenAI client (from deprecated @azure/openai v1.x)
 */

import { AzureOpenAI } from "openai";

class SafeAzureOpenAIService {
    private client: AzureOpenAI | null = null;
    private deploymentName: string = '';
    private isConfigured: boolean = false;

    constructor() {
        const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
        const apiKey = process.env.AZURE_OPENAI_API_KEY;
        const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
        const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview";

        if (endpoint && apiKey && deploymentName) {
            try {
                this.client = new AzureOpenAI({
                    endpoint: endpoint,
                    apiKey: apiKey,
                    apiVersion: apiVersion,
                    deployment: deploymentName
                });
                this.deploymentName = deploymentName;
                this.isConfigured = true;
                console.log('[Azure OpenAI] Service configured successfully');
            } catch (error) {
                console.warn('[Azure OpenAI] Failed to initialize client:', error);
                this.isConfigured = false;
            }
        } else {
            console.log('[Azure OpenAI] Running in DEMO mode - no Azure credentials configured');
            this.isConfigured = false;
        }
    }

    /**
     * Check if Azure OpenAI is available
     */
    isAvailable(): boolean {
        return this.isConfigured && this.client !== null;
    }

    /**
     * Generate clinical diagnostic analysis
     */
    async diagnose(sessionNotes: string, specialty: string = 'mental_health'): Promise<any> {
        if (!this.isAvailable()) {
            throw new Error('Azure OpenAI is not configured. Please configure AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_DEPLOYMENT_NAME environment variables.');
        }

        const systemPrompt = specialty === 'geriatric'
            ? `You are an expert geriatric medicine specialist AI assistant. Analyze the clinical notes and provide:
               1. Key symptoms identified with confidence levels
               2. Potential diagnoses with ICD-10 codes
               3. Risk assessments (fall risk, cognitive decline, depression)
               4. Evidence-based recommendations`
            : `You are an expert mental health clinician AI assistant. Analyze the clinical notes and provide:
               1. Key symptoms identified with confidence levels  
               2. Potential diagnoses with ICD-10 codes (F-codes for mental health)
               3. Risk scores (PHQ-9, GAD-7 estimates)
               4. Evidence-based treatment recommendations`;

        const jsonStructureExample = `{
  "symptoms": [
    { "text": "symptom name", "confidence": 0.85, "severity": "mild|moderate|severe" }
  ],
  "diagnoses": [
    {
      "condition": "Diagnosis name",
      "icdCode": "F32.1",
      "confidence": 0.85,
      "dsm5Criteria": ["Criterion 1", "Criterion 2", "Criterion 3"],
      "evidence": "Detailed clinical evidence supporting this diagnosis.",
      "treatmentConsiderations": "Recommended treatment approaches for this condition."
    }
  ],
  "riskScores": {
    "phq9": { "score": 18, "severity": "Moderately Severe Depression", "interpretation": "Clinical interpretation" },
    "gad7": { "score": 12, "severity": "Moderate Anxiety", "interpretation": "Clinical interpretation" }
  },
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}`;

        try {
            const startTime = Date.now();
            const response = await this.client!.chat.completions.create({
                model: this.deploymentName,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Analyze these clinical notes:\n\n${sessionNotes}\n\nProvide your analysis in the following EXACT JSON format. IMPORTANT: confidence values MUST be decimals between 0 and 1 (e.g., 0.85 not 85), and dsm5Criteria MUST be an array of strings.\n\n${jsonStructureExample}` }
                ],
                max_tokens: 2000,
                temperature: 0.3,
                top_p: 0.9
            });

            const content = response.choices[0].message?.content || '';
            const processingTime = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;

            // Try to parse as JSON, otherwise return raw content
            try {
                // Extract JSON from markdown code blocks if present
                let jsonContent = content;
                const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                    jsonContent = jsonMatch[1];
                }

                const parsed = JSON.parse(jsonContent);

                // Normalize the response to ensure correct format
                const normalized = this.normalizeDiagnosisResponse(parsed);

                return {
                    ...normalized,
                    fromCache: false,
                    modelUsed: this.deploymentName,
                    processingTime
                };
            } catch {
                return {
                    rawAnalysis: content,
                    fromCache: false,
                    modelUsed: this.deploymentName,
                    processingTime
                };
            }
        } catch (error) {
            console.error('[Azure OpenAI] Diagnose error:', error);
            throw error;
        }
    }

    /**
     * Normalize diagnosis response to ensure consistent format
     */
    private normalizeDiagnosisResponse(data: any): any {
        // Normalize symptoms confidence values
        if (data.symptoms && Array.isArray(data.symptoms)) {
            data.symptoms = data.symptoms.map((s: any) => ({
                ...s,
                confidence: s.confidence > 1 ? s.confidence / 100 : s.confidence
            }));
        }

        // Normalize diagnoses
        if (data.diagnoses && Array.isArray(data.diagnoses)) {
            data.diagnoses = data.diagnoses.map((d: any) => ({
                ...d,
                confidence: d.confidence > 1 ? d.confidence / 100 : d.confidence,
                // Ensure dsm5Criteria is an array
                dsm5Criteria: Array.isArray(d.dsm5Criteria)
                    ? d.dsm5Criteria
                    : typeof d.dsm5Criteria === 'string'
                        ? d.dsm5Criteria.split(/[,;]|\.\s+/).map((c: string) => c.trim()).filter((c: string) => c.length > 0)
                        : [],
                // Ensure evidence field exists
                evidence: d.evidence || d.supportingEvidence || d.clinicalEvidence || 'Clinical evidence supports this diagnosis based on the presented symptoms.',
                // Ensure treatmentConsiderations field exists
                treatmentConsiderations: d.treatmentConsiderations || d.treatment || d.recommendations || 'Evidence-based treatment should be tailored to patient presentation and preferences.'
            }));
        }

        return data;
    }


    /**
     * Generate treatment plan recommendations
     */
    async generateTreatmentPlan(patientProfile: any, diagnoses: any[]): Promise<any> {
        if (!this.isAvailable()) {
            return this.getDemoTreatmentPlan();
        }

        const prompt = `Based on the following patient profile and diagnoses, generate a comprehensive treatment plan:

Patient Profile:
${JSON.stringify(patientProfile, null, 2)}

Diagnoses:
${JSON.stringify(diagnoses, null, 2)}

Generate treatment options (Conservative, Moderate, Intensive) with:
- Medications with dosages, titration, side effects
- Therapy recommendations
- Lifestyle modifications
- CPT codes for billing
- Predicted efficacy and timeline

Return as JSON with structure: { recommendedOption, options[], monitoring }`;

        try {
            const startTime = Date.now();
            const response = await this.client!.chat.completions.create({
                model: this.deploymentName,
                messages: [
                    { role: "system", content: "You are a clinical treatment planning specialist providing evidence-based recommendations." },
                    { role: "user", content: prompt }
                ],
                max_tokens: 2000,
                temperature: 0.4,
                top_p: 0.9
            });

            const content = response.choices[0].message?.content || '';
            const processingTime = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;

            try {
                const parsed = JSON.parse(content);
                return { ...parsed, fromCache: false, modelUsed: this.deploymentName, processingTime };
            } catch {
                return { rawPlan: content, fromCache: false, modelUsed: this.deploymentName, processingTime };
            }
        } catch (error) {
            console.error('[Azure OpenAI] Treatment plan error:', error);
            return this.getDemoTreatmentPlan();
        }
    }

    /**
     * Chat with AI assistant
     */
    async chat(userMessage: string, conversationHistory: Array<{ role: string, content: string }> = []): Promise<string> {
        if (!this.isAvailable()) {
            return "I'm currently running in demo mode. Azure OpenAI is not configured. In production, I would provide clinical decision support based on your query.";
        }

        try {
            const messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }> = [
                {
                    role: "system" as const,
                    content: "You are ChartSpark AI, a clinical decision support assistant for mental health and geriatric care professionals. Provide evidence-based insights. For emergencies, always recommend contacting emergency services."
                },
                ...conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
                { role: "user" as const, content: userMessage }
            ];

            const response = await this.client!.chat.completions.create({
                model: this.deploymentName,
                messages: messages,
                max_tokens: 1000,
                temperature: 0.7,
                top_p: 0.95
            });

            return response.choices[0].message?.content || "I couldn't generate a response. Please try again.";
        } catch (error) {
            console.error('[Azure OpenAI] Chat error:', error);
            return "I encountered an error processing your request. Please try again.";
        }
    }

    /**
     * Generate SOAP note from session data
     */
    async generateSOAPNote(sessionData: {
        subjective: string;
        objective: string;
        symptoms: string[];
        assessment: string;
    }): Promise<string> {
        if (!this.isAvailable()) {
            return this.getDemoSOAPNote(sessionData);
        }

        const prompt = `You are a clinical documentation specialist. Generate a detailed, professional SOAP note for a mental health or primary care visit.

Based on the following observations provided by the clinician:

**Patient Observations:**
- Subjective complaints: ${sessionData.subjective || 'General follow-up visit'}
- Objective findings: ${sessionData.objective || 'To be assessed'}
- Key symptoms noted: ${sessionData.symptoms.join(', ') || 'None specified'}
- Initial clinical impression: ${sessionData.assessment || 'Stable condition'}

**Instructions:**
1. EXPAND on each observation with appropriate clinical detail and professional language
2. Add realistic vital signs and mental status exam findings to the Objective section
3. Include relevant ICD-10 codes in the Assessment
4. Create a comprehensive treatment Plan with specific interventions
5. Make the note sound natural and varied - avoid repetitive phrasing
6. The note should be 200-400 words total, professionally formatted

Format with clear **SUBJECTIVE**, **OBJECTIVE**, **ASSESSMENT**, and **PLAN** sections.`;

        try {
            const response = await this.client!.chat.completions.create({
                model: this.deploymentName,
                messages: [
                    {
                        role: "system",
                        content: "You are an expert clinical documentation specialist who writes detailed, professional SOAP notes. Each note should be unique with varied phrasing. Never generate identical notes."
                    },
                    { role: "user", content: prompt }
                ],
                max_tokens: 1500,
                temperature: 0.7,  // Higher temperature for more variety
                top_p: 0.95
            });

            return response.choices[0].message?.content || this.getDemoSOAPNote(sessionData);
        } catch (error) {
            console.error('[Azure OpenAI] SOAP note error:', error);
            return this.getDemoSOAPNote(sessionData);
        }
    }

    // ========== DEMO FALLBACKS ==========

    private getDemoTreatmentPlan() {
        return {
            patientProfile: {
                currentDiagnoses: ['Major Depressive Disorder', 'Generalized Anxiety Disorder'],
                severity: 'Moderate',
                riskFactors: ['Family history of depression', 'Recent stressful life events', 'Sleep disturbance'],
                protectiveFactors: ['Strong social support', 'Employed', 'Engaged in treatment', 'No substance use']
            },
            recommendations: {
                recommended: 'moderate',
                rationale: 'Based on moderate depression severity (PHQ-9: 18) with co-occurring anxiety, combined medication and psychotherapy approach offers optimal response rates. Patient\'s strong social support and treatment engagement are positive prognostic factors.',
                alternativeConsiderations: 'If patient prefers non-pharmacological approach initially, intensive psychotherapy-only track may be considered with close monitoring for adequate response.'
            },
            options: [
                {
                    id: 'conservative',
                    name: 'Conservative',
                    description: 'Psychotherapy-focused approach with lifestyle modifications. Preferred for patients who want to avoid or minimize medication use.',
                    predictedEfficacy: 65,
                    timeToImprovement: '8-12 weeks',
                    successRate: '55-65%',
                    medications: [
                        { name: 'None initially', dosage: 'N/A', cost: '$0', rationale: 'Trial of psychotherapy alone before considering medication' }
                    ],
                    therapy: { type: 'Cognitive Behavioral Therapy (CBT)', frequency: 'Weekly sessions', duration: '12-16 weeks' },
                    lifestyle: ['Establish consistent sleep schedule (10pm-6am)', 'Daily exercise 30 minutes (walking, swimming, yoga)', 'Social engagement at least 3x per week', 'Limit caffeine and alcohol', 'Mindfulness practice 10 min daily'],
                    pros: ['No medication side effects', 'Develops long-term coping skills', 'Lower cost if uninsured', 'Patient-empowered approach'],
                    cons: ['Slower response time', 'Requires high patient commitment', 'May not be sufficient for moderate-severe cases', 'Weekly time commitment required']
                },
                {
                    id: 'moderate',
                    name: 'Moderate',
                    description: 'Combined medication and psychotherapy approach. Evidence-based standard of care for moderate depression with anxiety.',
                    predictedEfficacy: 82,
                    timeToImprovement: '4-6 weeks',
                    successRate: '70-80%',
                    medications: [
                        { name: 'Escitalopram (Lexapro)', dosage: 'Start 5mg x 1 week, then 10mg daily', cost: '$$', rationale: 'First-line SSRI with excellent tolerability and efficacy for MDD + GAD. Low drug interaction potential.' },
                        { name: 'Hydroxyzine (Vistaril)', dosage: '25mg as needed for acute anxiety', cost: '$', rationale: 'PRN for anxiety peaks during SSRI initiation. Non-habit forming.' }
                    ],
                    therapy: { type: 'Cognitive Behavioral Therapy (CBT)', frequency: 'Weekly sessions', duration: '12-16 weeks' },
                    lifestyle: ['Consistent sleep schedule', 'Aerobic exercise 30 min 4x/week', 'Limit caffeine to morning only', 'Social activities 2-3x per week', 'Relaxation techniques daily'],
                    pros: ['Fastest symptom improvement', 'Synergistic effects of therapy + medication', 'Well-established evidence base', 'Flexible PRN option for anxiety'],
                    cons: ['Potential medication side effects', 'Higher total cost', 'Requires medication adherence', '4-6 weeks for SSRI effect onset']
                },
                {
                    id: 'intensive',
                    name: 'Intensive',
                    description: 'Aggressive treatment approach for faster response. Recommended if symptoms significantly impair function.',
                    predictedEfficacy: 88,
                    timeToImprovement: '2-4 weeks',
                    successRate: '75-85%',
                    medications: [
                        { name: 'Venlafaxine XR (Effexor XR)', dosage: 'Start 37.5mg x 4 days, increase to 75mg, target 150mg', cost: '$$$', rationale: 'SNRI provides dual mechanism for combined depression and anxiety. Faster onset than SSRIs for some patients.' },
                        { name: 'Buspirone (Buspar)', dosage: '5mg TID, titrate to 15mg TID', cost: '$$', rationale: 'Augmentation for anxiety without sedation or dependence risk.' },
                        { name: 'Trazodone', dosage: '25-50mg at bedtime PRN', cost: '$', rationale: 'For sleep initiation without benzodiazepine risks.' }
                    ],
                    therapy: { type: 'Intensive CBT + Behavioral Activation', frequency: '2x weekly sessions', duration: '8-12 weeks' },
                    lifestyle: ['Structured daily schedule', 'Exercise 5x/week', 'Sleep restriction therapy if insomnia persists', 'Weekly activity logging', 'Support group participation'],
                    pros: ['Fastest response rates', 'Comprehensive symptom coverage', 'More intensive monitoring', 'Best for severe functional impairment'],
                    cons: ['More side effect management', 'Higher medication burden', 'Requires more frequent visits', 'Higher total cost']
                }
            ],
            monitoring: {
                initialFollowUp: '1-2 weeks',
                regularFollowUp: 'Weekly x 4, then biweekly, then monthly',
                assessments: ['PHQ-9 at each visit', 'GAD-7 at each visit', 'Suicide risk screening', 'Side effect assessment']
            },
            fromCache: false,
            modelUsed: 'demo-mode',
            processingTime: '0.8s'
        };
    }


    private getDemoSOAPNote(sessionData: any): string {
        // Add variability with random elements
        const timestamp = Date.now();
        const variationSeed = timestamp % 5;

        // Vital sign variations
        const vitals = [
            'BP 118/76 mmHg, HR 72 bpm, RR 16, Temp 98.4°F',
            'BP 122/78 mmHg, HR 68 bpm, RR 14, Temp 98.6°F',
            'BP 116/74 mmHg, HR 74 bpm, RR 15, Temp 98.2°F',
            'BP 120/80 mmHg, HR 70 bpm, RR 16, Temp 98.5°F',
            'BP 124/82 mmHg, HR 76 bpm, RR 14, Temp 98.3°F'
        ][variationSeed];

        // Mental status exam variations
        const mseFindings = [
            'Alert and oriented x4. Cooperative with fair eye contact. Speech normal in rate and rhythm. Mood described as "okay." Affect congruent, mildly restricted range. Thought process linear and goal-directed. No suicidal or homicidal ideation.',
            'Patient is alert, oriented, and cooperative. Good eye contact maintained throughout interview. Speech is coherent with normal prosody. Mood reported as "doing better." Affect is euthymic with appropriate reactivity. Thought content without delusions or perceptual disturbances.',
            'Awake, alert, fully oriented. Dressed appropriately with good hygiene. Speech clear and spontaneous. Reports mood as "managing." Affect is congruent with mild improvement noted. No psychomotor abnormalities. Insight and judgment appear intact.',
            'Alert and attentive throughout session. Engaged appropriately with interviewer. Mood described as "stable." Affect reactive and congruent. Thought process organized. Denies current SI/HI. Judgment and insight are fair.',
            'Oriented to person, place, time, and situation. Cooperative demeanor with adequate eye contact. Speech fluent without pressure or latency. Mood "not bad." Affect full range, appropriate to content. No evidence of thought disorder.'
        ][variationSeed];

        // Plan variations
        const planItems = [
            ['Continue current medication regimen as prescribed', 'Psychotherapy session scheduled for next week', 'Sleep hygiene education reinforced', 'Return to clinic in 2-4 weeks for follow-up', 'Crisis resources reviewed; patient to call 988 if needed'],
            ['Maintain current treatment plan with close monitoring', 'Weekly CBT sessions to continue focusing on cognitive restructuring', 'Encouraged daily physical activity for 30 minutes', 'Follow-up appointment scheduled in 3 weeks', 'Safety plan updated and in place'],
            ['No changes to current medication at this time', 'Continue individual therapy twice monthly', 'Discussed importance of medication adherence', 'Labs ordered for routine monitoring', 'Next visit in 4 weeks unless symptoms worsen'],
            ['Treatment plan reviewed and adjusted as indicated', 'Supportive psychotherapy provided during session', 'Stress reduction techniques reviewed', 'Patient education on condition provided', 'Follow-up in 2 weeks to reassess progress'],
            ['Current interventions appear effective; continue', 'Therapy focusing on behavioral activation strategies', 'Encouraged maintaining regular sleep schedule', 'Discussed warning signs requiring immediate attention', 'Return visit scheduled for 3 weeks']
        ][variationSeed];

        // Expand subjective with clinical context
        const subjectiveBase = sessionData.subjective || 'Patient presents for routine follow-up visit.';
        const subjectiveExpanded = subjectiveBase.length < 50
            ? `${subjectiveBase} Patient was accompanied by family member who confirms reported symptoms. No new medical concerns since last visit. Denies chest pain, shortness of breath, or other acute complaints. Medication compliance has been good.`
            : subjectiveBase;

        // Build assessment with ICD codes
        const assessmentBase = sessionData.assessment || 'Condition stable with ongoing treatment.';
        const assessment = `${assessmentBase}

Primary Diagnosis: Major Depressive Disorder, moderate episode (F32.1)
Secondary: Generalized Anxiety Disorder (F41.1)
Current functional status: Improved from baseline. Patient demonstrates progress toward treatment goals.`;

        return `**SUBJECTIVE**
${subjectiveExpanded}

**OBJECTIVE**
Vital Signs: ${vitals}

Mental Status Examination:
${mseFindings}

${sessionData.symptoms?.length > 0 ? `Key symptoms addressed today: ${sessionData.symptoms.join(', ')}.` : ''}

**ASSESSMENT**
${assessment}

**PLAN**
${planItems.map((item, i) => `${i + 1}. ${item}`).join('\n')}

Time spent: ${15 + (variationSeed * 5)} minutes, greater than 50% in counseling and coordination of care.`;
    }
}

// Export singleton instance
const safeAzureOpenAI = new SafeAzureOpenAIService();
export default safeAzureOpenAI;
