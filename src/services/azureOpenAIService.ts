/**
 * Azure OpenAI Service for ChartSpark
 * Handles all AI-powered features including clinical notes, treatment recommendations
 *
 * Migrated to openai v4+ AzureOpenAI client (from deprecated @azure/openai v1.x)
 */

import { AzureOpenAI } from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";

interface SessionData {
    patientName: string;
    sessionDate: string;
    sessionType: string;
    chiefComplaint: string;
    observations: string;
    assessments: string;
}

interface PatientData {
    diagnosis: string;
    symptoms: string;
    history: string;
    previousTreatments: string;
}

interface HomeworkSessionData {
    treatmentGoals: string;
    sessionFocus: string;
    patientCapabilities: string;
}

interface SentimentResult {
    success: boolean;
    analysis: string | null;
}

class AzureOpenAIService {
    private endpoint: string | undefined;
    private apiKey: string | undefined;
    private deploymentName: string | undefined;
    private apiVersion: string;
    private isConfigured: boolean;
    private client: AzureOpenAI | null;

    constructor() {
        this.endpoint = process.env.AZURE_OPENAI_ENDPOINT;
        this.apiKey = process.env.AZURE_OPENAI_API_KEY;
        this.deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
        this.apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview";
        this.isConfigured = !!(this.endpoint && this.apiKey && this.deploymentName);
        this.client = null;
    }

    private _ensureClient(): AzureOpenAI {
        if (!this.isConfigured) {
            throw new Error(
                "Running in DEMO mode - no Azure credentials configured"
            );
        }

        if (!this.client) {
            this.client = new AzureOpenAI({
                endpoint: this.endpoint,
                apiKey: this.apiKey,
                apiVersion: this.apiVersion,
                deployment: this.deploymentName
            });
        }
        return this.client;
    }

    async generateClinicalNote(sessionData: SessionData): Promise<string | null> {
        const { patientName, sessionDate, sessionType, chiefComplaint, observations, assessments } = sessionData;

        const prompt = `You are a mental health professional assistant. Generate a professional clinical note based on the following session information:

Patient: ${patientName}
Date: ${sessionDate}
Session Type: ${sessionType}
Chief Complaint: ${chiefComplaint}
Observations: ${observations}
Assessment: ${assessments}

Generate a comprehensive SOAP (Subjective, Objective, Assessment, Plan) note that is professional, concise, and clinically appropriate.`;

        try {
            const response = await this._ensureClient().chat.completions.create({
                model: this.deploymentName!,
                messages: [
                    {
                        role: "system",
                        content: "You are an experienced mental health professional assistant specialized in clinical documentation."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 1000,
                temperature: 0.7,
                top_p: 0.95
            });

            return response.choices[0].message.content;
        } catch (error) {
            logError({ action: 'AI_GENERATE_NOTE_ERROR', error: sanitizeError(error) });
            throw new Error("Failed to generate clinical note. Please try again.");
        }
    }

    async generateTreatmentRecommendations(patientData: PatientData): Promise<string | null> {
        const { diagnosis, symptoms, history, previousTreatments } = patientData;

        const prompt = `Based on the following patient information, provide evidence-based treatment recommendations:

Diagnosis: ${diagnosis}
Symptoms: ${symptoms}
History: ${history}
Previous Treatments: ${previousTreatments}

Provide 3-5 evidence-based treatment recommendations with brief rationale for each.`;

        try {
            const response = await this._ensureClient().chat.completions.create({
                model: this.deploymentName!,
                messages: [
                    {
                        role: "system",
                        content: "You are a clinical psychologist providing evidence-based treatment recommendations. Base your suggestions on current clinical practice guidelines."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 800,
                temperature: 0.6,
                top_p: 0.9
            });

            return response.choices[0].message.content;
        } catch (error) {
            logError({ action: 'AI_TREATMENT_REC_ERROR', error: sanitizeError(error) });
            throw new Error("Failed to generate treatment recommendations. Please try again.");
        }
    }

    async analyzeSentiment(sessionNotes: string): Promise<SentimentResult> {
        const prompt = `Analyze the emotional tone and sentiment of the following patient session notes. Provide:
1. Overall sentiment (positive, neutral, negative, mixed)
2. Key emotional indicators
3. Risk factors if any
4. Therapeutic progress indicators

Session Notes: ${sessionNotes}`;

        try {
            const response = await this._ensureClient().chat.completions.create({
                model: this.deploymentName!,
                messages: [
                    {
                        role: "system",
                        content: "You are a mental health professional analyzing patient session notes for emotional content and clinical insights."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 500,
                temperature: 0.5,
                top_p: 0.9
            });

            return {
                success: true,
                analysis: response.choices[0].message.content
            };
        } catch (error) {
            logError({ action: 'AI_SENTIMENT_ERROR', error: sanitizeError(error) });
            throw new Error("Failed to analyze sentiment. Please try again.");
        }
    }

    async generateHomework(sessionData: HomeworkSessionData): Promise<string | null> {
        const { treatmentGoals, sessionFocus, patientCapabilities } = sessionData;

        const prompt = `Generate 2-3 appropriate therapy homework assignments for a patient with the following information:

Treatment Goals: ${treatmentGoals}
Session Focus: ${sessionFocus}
Patient Capabilities: ${patientCapabilities}

Provide practical, achievable homework assignments that support the treatment goals.`;

        try {
            const response = await this._ensureClient().chat.completions.create({
                model: this.deploymentName!,
                messages: [
                    {
                        role: "system",
                        content: "You are a therapist creating practical homework assignments that support treatment goals."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 600,
                temperature: 0.7,
                top_p: 0.9
            });

            return response.choices[0].message.content;
        } catch (error) {
            logError({ action: 'AI_HOMEWORK_ERROR', error: sanitizeError(error) });
            throw new Error("Failed to generate homework assignments. Please try again.");
        }
    }

    async chat(userMessage: string, conversationHistory: ChatCompletionMessageParam[] = []): Promise<string | null> {
        try {
            const messages: ChatCompletionMessageParam[] = [
                {
                    role: "system",
                    content: "You are an AI assistant for mental health professionals. Provide evidence-based clinical insights and support. Never provide emergency crisis intervention - always recommend contacting appropriate emergency services for crisis situations."
                },
                ...conversationHistory,
                {
                    role: "user",
                    content: userMessage
                }
            ];

            const response = await this._ensureClient().chat.completions.create({
                model: this.deploymentName!,
                messages: messages,
                max_tokens: 800,
                temperature: 0.7,
                top_p: 0.95
            });

            return response.choices[0].message.content;
        } catch (error) {
            logError({ action: 'AI_CHAT_ERROR', error: sanitizeError(error) });
            throw new Error("Failed to get AI response. Please try again.");
        }
    }
}

// Export singleton instance
export default new AzureOpenAIService();
