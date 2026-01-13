/**
 * Azure OpenAI Service for ChartSpark
 * Handles all AI-powered features including clinical notes, treatment recommendations
 * 
 * Migrated to openai v4+ AzureOpenAI client (from deprecated @azure/openai v1.x)
 */

import { AzureOpenAI } from "openai";

class AzureOpenAIService {
    constructor() {
        this.endpoint = process.env.AZURE_OPENAI_ENDPOINT;
        this.apiKey = process.env.AZURE_OPENAI_API_KEY;
        this.deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
        this.apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview";

        if (!this.endpoint || !this.apiKey || !this.deploymentName) {
            throw new Error(
                "Missing required Azure OpenAI configuration. Please check your .env file."
            );
        }

        this.client = new AzureOpenAI({
            endpoint: this.endpoint,
            apiKey: this.apiKey,
            apiVersion: this.apiVersion,
            deployment: this.deploymentName
        });
    }

    /**
     * Generate clinical notes from session data
     * @param {Object} sessionData - Patient session information
     * @returns {Promise<string>} Generated clinical note
     */
    async generateClinicalNote(sessionData) {
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
            const response = await this.client.chat.completions.create({
                model: this.deploymentName,
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
            console.error("Error generating clinical note:", error);
            throw new Error("Failed to generate clinical note. Please try again.");
        }
    }

    /**
     * Generate treatment recommendations based on patient data
     * @param {Object} patientData - Patient information and history
     * @returns {Promise<string>} Treatment recommendations
     */
    async generateTreatmentRecommendations(patientData) {
        const { diagnosis, symptoms, history, previousTreatments } = patientData;

        const prompt = `Based on the following patient information, provide evidence-based treatment recommendations:

Diagnosis: ${diagnosis}
Symptoms: ${symptoms}
History: ${history}
Previous Treatments: ${previousTreatments}

Provide 3-5 evidence-based treatment recommendations with brief rationale for each.`;

        try {
            const response = await this.client.chat.completions.create({
                model: this.deploymentName,
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
            console.error("Error generating treatment recommendations:", error);
            throw new Error("Failed to generate treatment recommendations. Please try again.");
        }
    }

    /**
     * Analyze patient sentiment from session notes
     * @param {string} sessionNotes - Raw session notes
     * @returns {Promise<Object>} Sentiment analysis results
     */
    async analyzeSentiment(sessionNotes) {
        const prompt = `Analyze the emotional tone and sentiment of the following patient session notes. Provide:
1. Overall sentiment (positive, neutral, negative, mixed)
2. Key emotional indicators
3. Risk factors if any
4. Therapeutic progress indicators

Session Notes: ${sessionNotes}`;

        try {
            const response = await this.client.chat.completions.create({
                model: this.deploymentName,
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
            console.error("Error analyzing sentiment:", error);
            throw new Error("Failed to analyze sentiment. Please try again.");
        }
    }

    /**
     * Generate therapy homework assignments
     * @param {Object} sessionData - Current session information
     * @returns {Promise<string>} Homework assignment suggestions
     */
    async generateHomework(sessionData) {
        const { treatmentGoals, sessionFocus, patientCapabilities } = sessionData;

        const prompt = `Generate 2-3 appropriate therapy homework assignments for a patient with the following information:

Treatment Goals: ${treatmentGoals}
Session Focus: ${sessionFocus}
Patient Capabilities: ${patientCapabilities}

Provide practical, achievable homework assignments that support the treatment goals.`;

        try {
            const response = await this.client.chat.completions.create({
                model: this.deploymentName,
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
            console.error("Error generating homework:", error);
            throw new Error("Failed to generate homework assignments. Please try again.");
        }
    }

    /**
     * General AI chat for clinical decision support
     * @param {string} userMessage - User's question or prompt
     * @param {Array} conversationHistory - Previous messages in conversation
     * @returns {Promise<string>} AI response
     */
    async chat(userMessage, conversationHistory = []) {
        try {
            const messages = [
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

            const response = await this.client.chat.completions.create({
                model: this.deploymentName,
                messages: messages,
                max_tokens: 800,
                temperature: 0.7,
                top_p: 0.95
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error("Error in chat:", error);
            throw new Error("Failed to get AI response. Please try again.");
        }
    }
}

// Export singleton instance
export default new AzureOpenAIService();
