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
            return this.getDemoDiagnosis();
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

        try {
            const startTime = Date.now();
            const response = await this.client!.chat.completions.create({
                model: this.deploymentName,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Analyze these clinical notes:\n\n${sessionNotes}\n\nProvide your analysis in JSON format with keys: symptoms, diagnoses, riskScores, recommendations` }
                ],
                max_tokens: 1500,
                temperature: 0.3,
                top_p: 0.9
            });

            const content = response.choices[0].message?.content || '';
            const processingTime = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;

            // Try to parse as JSON, otherwise return raw content
            try {
                const parsed = JSON.parse(content);
                return {
                    ...parsed,
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
            return this.getDemoDiagnosis();
        }
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

        const prompt = `Generate a professional clinical SOAP note based on:

Subjective: ${sessionData.subjective}
Objective: ${sessionData.objective}
Key Symptoms: ${sessionData.symptoms.join(', ')}
Initial Assessment: ${sessionData.assessment}

Format the note professionally with clear S, O, A, P sections.`;

        try {
            const response = await this.client!.chat.completions.create({
                model: this.deploymentName,
                messages: [
                    { role: "system", content: "You are an expert clinical documentation specialist." },
                    { role: "user", content: prompt }
                ],
                max_tokens: 1000,
                temperature: 0.5,
                top_p: 0.9
            });

            return response.choices[0].message?.content || this.getDemoSOAPNote(sessionData);
        } catch (error) {
            console.error('[Azure OpenAI] SOAP note error:', error);
            return this.getDemoSOAPNote(sessionData);
        }
    }

    // ========== DEMO FALLBACKS ==========

    private getDemoDiagnosis() {
        return {
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
                phq9: { score: 18, severity: 'Moderately Severe Depression', interpretation: 'Warrants active treatment' },
                gad7: { score: 12, severity: 'Moderate Anxiety', interpretation: 'Consider further assessment' }
            },
            recommendations: [
                'Consider antidepressant medication (SSRI first-line)',
                'Refer for cognitive behavioral therapy (CBT)',
                'Follow-up in 2 weeks to assess treatment response',
                'Assess suicide risk at each visit'
            ],
            fromCache: false,
            modelUsed: 'demo-mode',
            processingTime: '0.5s'
        };
    }

    private getDemoTreatmentPlan() {
        return {
            recommendedOption: 'moderate',
            options: [
                {
                    name: 'Conservative',
                    description: 'Psychotherapy-focused approach',
                    medications: [],
                    therapy: { type: 'CBT', frequency: 'Weekly', duration: '12-16 weeks' },
                    lifestyle: ['Regular sleep', 'Daily exercise', 'Social activities'],
                    cptCodes: [{ code: '90834', description: 'Psychotherapy 45 min', frequency: 'Weekly' }],
                    predictedEfficacy: 70,
                    timeline: '8-12 weeks'
                },
                {
                    name: 'Moderate',
                    description: 'Combined medication and therapy',
                    medications: [{ name: 'Sertraline', dosage: '50mg daily', duration: '6-12 months' }],
                    therapy: { type: 'CBT', frequency: 'Weekly', duration: '12-16 weeks' },
                    lifestyle: ['Regular sleep', 'Daily exercise', 'Stress management'],
                    cptCodes: [
                        { code: '90834', description: 'Psychotherapy 45 min', frequency: 'Weekly' },
                        { code: '99213', description: 'Med management', frequency: 'Monthly' }
                    ],
                    predictedEfficacy: 85,
                    timeline: '4-6 weeks'
                }
            ],
            monitoring: {
                initialFollowUp: '2 weeks',
                regularFollowUp: 'Monthly then quarterly',
                assessments: ['PHQ-9', 'Suicide risk screening']
            },
            fromCache: false,
            modelUsed: 'demo-mode',
            processingTime: '0.5s'
        };
    }

    private getDemoSOAPNote(sessionData: any): string {
        return `**SUBJECTIVE**
${sessionData.subjective || 'Patient presents for follow-up visit.'}

**OBJECTIVE**
${sessionData.objective || 'Mental Status Exam: Alert and oriented x4. Appearance appropriate.'}
Key symptoms: ${sessionData.symptoms?.join(', ') || 'As noted above'}

**ASSESSMENT**
${sessionData.assessment || 'Condition stable, continue current treatment plan.'}

**PLAN**
- Continue current medication regimen
- Follow-up in 2-4 weeks
- Patient education provided
- Safety plan reviewed if applicable`;
    }
}

// Export singleton instance
const safeAzureOpenAI = new SafeAzureOpenAIService();
export default safeAzureOpenAI;
