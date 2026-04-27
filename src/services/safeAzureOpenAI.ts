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
import { devLog, devWarn, devError, logError, sanitizeError } from "@/lib/logging/safe-logger";
import { CircuitBreaker, withRetry, withTimeout } from "@/lib/resilience/circuit-breaker";

/**
 * Thrown when an upstream AI provider (Azure OpenAI / Whisper) fails and the
 * caller must NOT receive fabricated demo content. Production code paths
 * fail closed by surfacing this error; the API layer translates it to 503.
 */
export class AIProviderUnavailableError extends Error {
  readonly code = "AI_PROVIDER_UNAVAILABLE";
  readonly upstream: "azure_openai" | "whisper" | "agent_sidecar" | "unknown";
  readonly cause?: unknown;

  constructor(
    upstream: AIProviderUnavailableError["upstream"],
    message: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = "AIProviderUnavailableError";
    this.upstream = upstream;
    this.cause = cause;
  }
}

/**
 * Demo fallback content (synthetic SOAP notes, transcripts) is permitted ONLY
 * in non-production demo mode. Any production environment must fail closed —
 * a clinician must never sign a fabricated note believing it was real AI
 * output. Dev/test environments also fail closed unless explicitly opted in.
 */
function isDemoFallbackAllowed(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

// ─────────────────────────── Resilience config ───────────────────────────
// Per-call timeouts and retry budget. Circuit breakers are separate per
// dependency so that Whisper outages do not trip GPT and vice versa.

const GPT_TIMEOUT_MS = 30_000;
const WHISPER_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1_000;

const gptBreaker = new CircuitBreaker({
  name: "azure-openai-gpt",
  failureThreshold: 5,
  failureWindowMs: 60_000,
  openDurationMs: 30_000,
  onStateChange: (from, to) => {
    devWarn("Azure OpenAI GPT", `Circuit breaker ${from} → ${to}`);
  },
});

const whisperBreaker = new CircuitBreaker({
  name: "azure-openai-whisper",
  failureThreshold: 5,
  failureWindowMs: 60_000,
  openDurationMs: 30_000,
  onStateChange: (from, to) => {
    devWarn("Azure OpenAI Whisper", `Circuit breaker ${from} → ${to}`);
  },
});

/**
 * Run `fn` inside the shared resilience stack:
 *   circuit breaker → retry-with-backoff → timeout → fn
 * Retries live inside the breaker so that a full retry sequence counts
 * as a single failure from the breaker's perspective.
 */
function runResilient<T>(
  breaker: CircuitBreaker,
  timeoutMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  return breaker.execute(() =>
    withRetry(() => withTimeout(fn(), timeoutMs), {
      maxRetries: MAX_RETRIES,
      baseDelayMs: RETRY_BASE_DELAY_MS,
    }),
  );
}

// Exported for tests and admin endpoints that may want to inspect /
// manually reset breaker state.
export const _resilience = {
  gptBreaker,
  whisperBreaker,
  GPT_TIMEOUT_MS,
  WHISPER_TIMEOUT_MS,
};

class SafeAzureOpenAIService {
  private client: AzureOpenAI | null = null;
  private whisperClient: AzureOpenAI | null = null;
  private deploymentName: string = "";
  private isConfigured: boolean = false;
  private isInitialized: boolean = false;

  private _ensureInitialized(): void {
    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;

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
          deployment: deploymentName,
        });
        this.deploymentName = deploymentName;
        this.isConfigured = true;
        devLog("Azure OpenAI", "Service configured successfully");
      } catch (error) {
        devWarn("Azure OpenAI", "Failed to initialize client:", error);
        this.isConfigured = false;
      }
    } else {
      devLog("Azure OpenAI", "Running in DEMO mode - no Azure credentials configured");
      this.isConfigured = false;
    }
  }

  private _getClient(): AzureOpenAI {
    this._ensureInitialized();

    if (!this.client || !this.isConfigured) {
      throw new Error(
        "Azure OpenAI is not configured. Please configure AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_DEPLOYMENT_NAME environment variables.",
      );
    }

    return this.client;
  }

  private normalizeSOAPHeaders(note: string): string {
    // Require header to be on its own line (trailing $) so prose containing
    // "plan", "assessment", etc. is not misinterpreted as a section header.
    return note
      .replace(/^\s*\*?\*?SUBJECTIVE\*?\*?\s*:?\s*$/im, "SUBJECTIVE")
      .replace(/^\s*\*?\*?OBJECTIVE\*?\*?\s*:?\s*$/im, "\nOBJECTIVE")
      .replace(/^\s*\*?\*?ASSESSMENT\*?\*?\s*:?\s*$/im, "\nASSESSMENT")
      .replace(/^\s*\*?\*?PLAN\*?\*?\s*:?\s*$/im, "\nPLAN")
      .trim();
  }

  /**
   * Check if Azure OpenAI is available
   */
  isAvailable(): boolean {
    this._ensureInitialized();
    return this.isConfigured && this.client !== null;
  }

  /**
   * Generate clinical diagnostic analysis
   */
  async diagnose(sessionNotes: string, specialty: string = "mental_health"): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error(
        "Azure OpenAI is not configured. Please configure AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_DEPLOYMENT_NAME environment variables.",
      );
    }

    const client = this._getClient();

    const systemPrompt =
      specialty === "geriatric"
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
      devLog("Azure OpenAI", "Starting diagnosis request...");

      const response = await runResilient(gptBreaker, GPT_TIMEOUT_MS, () =>
        client.chat.completions.create({
          model: this.deploymentName,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Analyze these clinical notes:\n\n${sessionNotes}\n\nProvide your analysis in the following EXACT JSON format. IMPORTANT: confidence values MUST be decimals between 0 and 1 (e.g., 0.85 not 85), and dsm5Criteria MUST be an array of strings.\n\n${jsonStructureExample}`,
            },
          ],
          max_tokens: 2000,
          temperature: 0.3,
          top_p: 0.9,
        }),
      );

      const content = response.choices[0].message?.content || "";
      const processingTime = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;

      devLog("Azure OpenAI", "Response received in", processingTime);
      devLog("Azure OpenAI", "Content length:", content.length);
      // SEC-REMEDIATION: Content preview removed - contains PHI

      // Try to parse as JSON, otherwise return raw content
      try {
        // Extract JSON from markdown code blocks if present
        let jsonContent = content;
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonContent = jsonMatch[1];
          devLog("Azure OpenAI", "Extracted JSON from code block");
        }

        const parsed = JSON.parse(jsonContent);
        devLog("Azure OpenAI", "Successfully parsed JSON");

        // Normalize the response to ensure correct format
        const normalized = this.normalizeDiagnosisResponse(parsed);

        return {
          ...normalized,
          fromCache: false,
          modelUsed: this.deploymentName,
          processingTime,
        };
      } catch (parseError) {
        devError("Azure OpenAI", "JSON parse error:", parseError);
        // SEC-REMEDIATION: Raw content removed from logs - contains PHI
        return {
          rawAnalysis: content,
          fromCache: false,
          modelUsed: this.deploymentName,
          processingTime,
        };
      }
    } catch (error) {
      devError("Azure OpenAI", "Diagnose error:", error);
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
        confidence: s.confidence > 1 ? s.confidence / 100 : s.confidence,
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
          : typeof d.dsm5Criteria === "string"
            ? d.dsm5Criteria
                .split(/[,;]|\.\s+/)
                .map((c: string) => c.trim())
                .filter((c: string) => c.length > 0)
            : [],
        // Ensure evidence field exists
        evidence:
          d.evidence ||
          d.supportingEvidence ||
          d.clinicalEvidence ||
          "Clinical evidence supports this diagnosis based on the presented symptoms.",
        // Ensure treatmentConsiderations field exists
        treatmentConsiderations:
          d.treatmentConsiderations ||
          d.treatment ||
          d.recommendations ||
          "Evidence-based treatment should be tailored to patient presentation and preferences.",
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

    const client = this._getClient();

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
      const response = await runResilient(gptBreaker, GPT_TIMEOUT_MS, () =>
        client.chat.completions.create({
          model: this.deploymentName,
          messages: [
            {
              role: "system",
              content:
                "You are a clinical treatment planning specialist providing evidence-based recommendations.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 2000,
          temperature: 0.4,
          top_p: 0.9,
        }),
      );

      const content = response.choices[0].message?.content || "";
      const processingTime = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;

      try {
        const parsed = JSON.parse(content);
        return { ...parsed, fromCache: false, modelUsed: this.deploymentName, processingTime };
      } catch {
        return {
          rawPlan: content,
          fromCache: false,
          modelUsed: this.deploymentName,
          processingTime,
        };
      }
    } catch (error) {
      devError("Azure OpenAI", "Treatment plan error:", error);
      return this.getDemoTreatmentPlan();
    }
  }

  /**
   * Chat with AI assistant
   */
  async chat(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
  ): Promise<string> {
    if (!this.isAvailable()) {
      return "I'm currently running in demo mode. Azure OpenAI is not configured. In production, I would provide clinical decision support based on your query.";
    }

    const client = this._getClient();

    try {
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        {
          role: "system" as const,
          content:
            "You are ChartSpark AI, a clinical decision support assistant for mental health and geriatric care professionals. Provide evidence-based insights. For emergencies, always recommend contacting emergency services.",
        },
        ...conversationHistory.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user" as const, content: userMessage },
      ];

      const response = await runResilient(gptBreaker, GPT_TIMEOUT_MS, () =>
        client.chat.completions.create({
          model: this.deploymentName,
          messages: messages,
          max_tokens: 1000,
          temperature: 0.7,
          top_p: 0.95,
        }),
      );

      return (
        response.choices[0].message?.content || "I couldn't generate a response. Please try again."
      );
    } catch (error) {
      devError("Azure OpenAI", "Chat error:", error);
      return "I encountered an error processing your request. Please try again.";
    }
  }

  /**
   * OPTIMIZATION: Streaming chat for real-time token display
   * Returns an async generator that yields tokens as they arrive
   */
  async *chatStream(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
  ): AsyncGenerator<string, void, unknown> {
    if (!this.isAvailable()) {
      yield "I'm currently running in demo mode. Azure OpenAI is not configured.";
      return;
    }

    const client = this._getClient();

    try {
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        {
          role: "system" as const,
          content:
            "You are ChartSpark AI, a clinical decision support assistant for mental health and geriatric care professionals. Provide evidence-based insights. For emergencies, always recommend contacting emergency services.",
        },
        ...conversationHistory.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user" as const, content: userMessage },
      ];

      // Resilience wrap only the connection/handshake — mid-stream
      // errors fall through to the catch below and yield a demo message.
      const stream = await runResilient(gptBreaker, GPT_TIMEOUT_MS, () =>
        client.chat.completions.create({
          model: this.deploymentName,
          messages: messages,
          max_tokens: 1000,
          temperature: 0.7,
          top_p: 0.95,
          stream: true, // Enable streaming
        }),
      );

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      devError("Azure OpenAI", "Stream error:", error);
      yield "I encountered an error processing your request.";
    }
  }

  /**
   * OPTIMIZATION: Streaming SOAP note generation
   * Enables real-time display as the note is being generated
   */
  async *generateSOAPNoteStream(sessionData: {
    subjective: string;
    objective: string;
    symptoms: string[];
    assessment: string;
    vitalsContext?: string;
    patientContext?: string;
  }): AsyncGenerator<string, void, unknown> {
    if (!this.isAvailable()) {
      if (isDemoFallbackAllowed()) {
        devWarn(
          "safeAzureOpenAI",
          "Azure OpenAI not configured; yielding DEMO SOAP note (NODE_ENV != production && NEXT_PUBLIC_DEMO_MODE === true)",
        );
        yield this.getDemoSOAPNote(sessionData);
        return;
      }
      throw new AIProviderUnavailableError(
        "azure_openai",
        "Azure OpenAI is not configured for SOAP note streaming",
      );
    }

    const client = this._getClient();

    const patientBlock =
      sessionData.patientContext && sessionData.patientContext.length > 0
        ? `${sessionData.patientContext}\n\n`
        : "";

    const vitalsBlock =
      sessionData.vitalsContext ||
      "Vitals recorded: [Not recorded at this encounter]";

    const prompt = `You are a clinical documentation specialist. Generate a professional SOAP note for a mental health or primary care visit.

Based on the following observations provided by the clinician:

**Patient Observations:**
- Subjective complaints: ${sessionData.subjective || "General follow-up visit"}
- Objective findings: ${sessionData.objective || "To be assessed"}
- Key symptoms noted: ${sessionData.symptoms.join(", ") || "None specified"}
- Initial clinical impression: ${sessionData.assessment || "Stable condition"}

${patientBlock}${vitalsBlock}

**CRITICAL GROUNDING RULES:**
- You are expanding the clinician's shorthand into formal SOAP prose.
- Expansion means: converting brief dictation into professional medical language.
- Expansion does NOT mean: adding facts not stated by the clinician.
- If a section has no clinician input, write exactly: "[Not documented at this encounter — clinician to complete]"
- Do NOT fill in plausible-sounding details to make the note feel complete.
- Vitals rule: if "Vitals recorded" above shows "[Not recorded at this encounter]", write exactly that phrase into the Objective section — do NOT invent vital sign values. If individual vital signs are marked "[Not recorded]", include only the ones that ARE recorded. Do NOT fill in missing values.
- When mentioning medications, use ONLY the medications listed in "Active Medications" above. Do not substitute, invent, or infer alternatives.
- When referencing demographics (age, sex), use ONLY the values in "Demographics". Do not invent.
- When mentioning allergies or problems, use ONLY what is listed. Do not add plausible-sounding additions.
- If a section of Patient Context is empty (e.g., "Active Medications: [None recorded]"), do not invent entries to fill it.

**Instructions:**
1. EXPAND on each observation with appropriate clinical detail and professional language.
2. Use ONLY the clinician-provided observations above. Do NOT invent vital signs, medications, durations, baseline comparisons, diagnoses, historical timelines, mental status exam findings, or any other specific clinical facts not explicitly present in the input.
3. Include relevant ICD-10 codes in the Assessment only if the input supports them; otherwise omit.
4. Create a treatment Plan that reflects the clinician's stated direction — do not invent interventions not implied by the input.
5. The note should be professionally formatted.
6. Output EXACTLY these section headers on their own lines with no markdown and no colons:
SUBJECTIVE
OBJECTIVE
ASSESSMENT
PLAN`;

    try {
      const stream = await runResilient(gptBreaker, GPT_TIMEOUT_MS, () =>
        client.chat.completions.create({
          model: this.deploymentName,
          messages: [
            {
              role: "system",
              content:
                "You are an expert clinical documentation specialist who writes professional SOAP notes. You must not invent any specific clinical fact (medication name, dose, duration, vital sign value, baseline comparison, diagnosis, mental status finding) that is not present in the user-provided observations. Your role is to format and expand, not to generate clinical content. Always return the exact headers SUBJECTIVE, OBJECTIVE, ASSESSMENT, and PLAN on separate lines, without markdown or colons.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 1500,
          temperature: 0.3,
          top_p: 0.8,
          stream: true,
        }),
      );

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      devError("Azure OpenAI", "SOAP stream error:", error);
      if (isDemoFallbackAllowed()) {
        devWarn(
          "safeAzureOpenAI",
          "Azure OpenAI unavailable; yielding DEMO SOAP note (demo mode only)",
        );
        yield this.getDemoSOAPNote(sessionData);
        return;
      }
      throw new AIProviderUnavailableError(
        "azure_openai",
        "Azure OpenAI failed during streaming SOAP note generation",
        error,
      );
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
    vitalsContext?: string;
    patientContext?: string;
  }): Promise<string> {
    if (!this.isAvailable()) {
      if (isDemoFallbackAllowed()) {
        devWarn(
          "safeAzureOpenAI",
          "Azure OpenAI not configured; returning DEMO SOAP note (NODE_ENV != production && NEXT_PUBLIC_DEMO_MODE === true)",
        );
        return this.getDemoSOAPNote(sessionData);
      }
      throw new AIProviderUnavailableError(
        "azure_openai",
        "Azure OpenAI is not configured for SOAP note generation",
      );
    }

    const client = this._getClient();

    const patientBlock =
      sessionData.patientContext && sessionData.patientContext.length > 0
        ? `${sessionData.patientContext}\n\n`
        : "";

    const vitalsBlock =
      sessionData.vitalsContext ||
      "Vitals recorded: [Not recorded at this encounter]";

    const prompt = `You are a clinical documentation specialist. Generate a professional SOAP note for a mental health or primary care visit.

Based on the following observations provided by the clinician:

**Patient Observations:**
- Subjective complaints: ${sessionData.subjective || "General follow-up visit"}
- Objective findings: ${sessionData.objective || "To be assessed"}
- Key symptoms noted: ${sessionData.symptoms.join(", ") || "None specified"}
- Initial clinical impression: ${sessionData.assessment || "Stable condition"}

${patientBlock}${vitalsBlock}

**CRITICAL GROUNDING RULES:**
- You are expanding the clinician's shorthand into formal SOAP prose.
- Expansion means: converting brief dictation into professional medical language.
- Expansion does NOT mean: adding facts not stated by the clinician.
- If a section has no clinician input, write exactly: "[Not documented at this encounter — clinician to complete]"
- Do NOT fill in plausible-sounding details to make the note feel complete.
- Vitals rule: if "Vitals recorded" above shows "[Not recorded at this encounter]", write exactly that phrase into the Objective section — do NOT invent vital sign values. If individual vital signs are marked "[Not recorded]", include only the ones that ARE recorded. Do NOT fill in missing values.
- When mentioning medications, use ONLY the medications listed in "Active Medications" above. Do not substitute, invent, or infer alternatives.
- When referencing demographics (age, sex), use ONLY the values in "Demographics". Do not invent.
- When mentioning allergies or problems, use ONLY what is listed. Do not add plausible-sounding additions.
- If a section of Patient Context is empty (e.g., "Active Medications: [None recorded]"), do not invent entries to fill it.

**Instructions:**
1. EXPAND on each observation with appropriate clinical detail and professional language.
2. Use ONLY the clinician-provided observations above. Do NOT invent vital signs, medications, durations, baseline comparisons, diagnoses, historical timelines, mental status exam findings, or any other specific clinical facts not explicitly present in the input.
3. Include relevant ICD-10 codes in the Assessment only if the input supports them; otherwise omit.
4. Create a treatment Plan that reflects the clinician's stated direction — do not invent interventions not implied by the input.
5. The note should be professionally formatted.
6. Output EXACTLY these section headers on their own lines with no markdown and no colons:
SUBJECTIVE
OBJECTIVE
ASSESSMENT
PLAN`;

    try {
      const response = await runResilient(gptBreaker, GPT_TIMEOUT_MS, () =>
        client.chat.completions.create({
          model: this.deploymentName,
          messages: [
            {
              role: "system",
              content:
                "You are an expert clinical documentation specialist who writes professional SOAP notes. You must not invent any specific clinical fact (medication name, dose, duration, vital sign value, baseline comparison, diagnosis, mental status finding) that is not present in the user-provided observations. Your role is to format and expand, not to generate clinical content. Always return the exact headers SUBJECTIVE, OBJECTIVE, ASSESSMENT, and PLAN on separate lines, without markdown or colons.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 1500,
          temperature: 0.3,
          top_p: 0.8,
        }),
      );

      const content = response.choices[0].message?.content;
      if (content) {
        return this.normalizeSOAPHeaders(content);
      }
      if (isDemoFallbackAllowed()) {
        devWarn(
          "safeAzureOpenAI",
          "Azure OpenAI returned empty content; returning DEMO SOAP note (demo mode only)",
        );
        return this.getDemoSOAPNote(sessionData);
      }
      throw new AIProviderUnavailableError(
        "azure_openai",
        "Azure OpenAI returned empty content for SOAP note",
      );
    } catch (error) {
      if (error instanceof AIProviderUnavailableError) throw error;
      devError("Azure OpenAI", "SOAP note error:", error);
      if (isDemoFallbackAllowed()) {
        devWarn(
          "safeAzureOpenAI",
          "Azure OpenAI unavailable; returning DEMO SOAP note (demo mode only)",
        );
        return this.getDemoSOAPNote(sessionData);
      }
      throw new AIProviderUnavailableError(
        "azure_openai",
        "Azure OpenAI failed during SOAP note generation",
        error,
      );
    }
  }

  // ========== DEMO FALLBACKS ==========

  private getDemoTreatmentPlan() {
    return {
      patientProfile: {
        currentDiagnoses: ["Major Depressive Disorder", "Generalized Anxiety Disorder"],
        severity: "Moderate",
        riskFactors: [
          "Family history of depression",
          "Recent stressful life events",
          "Sleep disturbance",
        ],
        protectiveFactors: [
          "Strong social support",
          "Employed",
          "Engaged in treatment",
          "No substance use",
        ],
      },
      recommendations: {
        recommended: "moderate",
        rationale:
          "Based on moderate depression severity (PHQ-9: 18) with co-occurring anxiety, combined medication and psychotherapy approach offers optimal response rates. Patient's strong social support and treatment engagement are positive prognostic factors.",
        alternativeConsiderations:
          "If patient prefers non-pharmacological approach initially, intensive psychotherapy-only track may be considered with close monitoring for adequate response.",
      },
      options: [
        {
          id: "conservative",
          name: "Conservative",
          description:
            "Psychotherapy-focused approach with lifestyle modifications. Preferred for patients who want to avoid or minimize medication use.",
          predictedEfficacy: 65,
          timeToImprovement: "8-12 weeks",
          successRate: "55-65%",
          medications: [
            {
              name: "None initially",
              dosage: "N/A",
              cost: "$0",
              rationale: "Trial of psychotherapy alone before considering medication",
            },
          ],
          therapy: {
            type: "Cognitive Behavioral Therapy (CBT)",
            frequency: "Weekly sessions",
            duration: "12-16 weeks",
          },
          lifestyle: [
            "Establish consistent sleep schedule (10pm-6am)",
            "Daily exercise 30 minutes (walking, swimming, yoga)",
            "Social engagement at least 3x per week",
            "Limit caffeine and alcohol",
            "Mindfulness practice 10 min daily",
          ],
          pros: [
            "No medication side effects",
            "Develops long-term coping skills",
            "Lower cost if uninsured",
            "Patient-empowered approach",
          ],
          cons: [
            "Slower response time",
            "Requires high patient commitment",
            "May not be sufficient for moderate-severe cases",
            "Weekly time commitment required",
          ],
        },
        {
          id: "moderate",
          name: "Moderate",
          description:
            "Combined medication and psychotherapy approach. Evidence-based standard of care for moderate depression with anxiety.",
          predictedEfficacy: 82,
          timeToImprovement: "4-6 weeks",
          successRate: "70-80%",
          medications: [
            {
              name: "Escitalopram (Lexapro)",
              dosage: "Start 5mg x 1 week, then 10mg daily",
              cost: "$$",
              rationale:
                "First-line SSRI with excellent tolerability and efficacy for MDD + GAD. Low drug interaction potential.",
            },
            {
              name: "Hydroxyzine (Vistaril)",
              dosage: "25mg as needed for acute anxiety",
              cost: "$",
              rationale: "PRN for anxiety peaks during SSRI initiation. Non-habit forming.",
            },
          ],
          therapy: {
            type: "Cognitive Behavioral Therapy (CBT)",
            frequency: "Weekly sessions",
            duration: "12-16 weeks",
          },
          lifestyle: [
            "Consistent sleep schedule",
            "Aerobic exercise 30 min 4x/week",
            "Limit caffeine to morning only",
            "Social activities 2-3x per week",
            "Relaxation techniques daily",
          ],
          pros: [
            "Fastest symptom improvement",
            "Synergistic effects of therapy + medication",
            "Well-established evidence base",
            "Flexible PRN option for anxiety",
          ],
          cons: [
            "Potential medication side effects",
            "Higher total cost",
            "Requires medication adherence",
            "4-6 weeks for SSRI effect onset",
          ],
        },
        {
          id: "intensive",
          name: "Intensive",
          description:
            "Aggressive treatment approach for faster response. Recommended if symptoms significantly impair function.",
          predictedEfficacy: 88,
          timeToImprovement: "2-4 weeks",
          successRate: "75-85%",
          medications: [
            {
              name: "Venlafaxine XR (Effexor XR)",
              dosage: "Start 37.5mg x 4 days, increase to 75mg, target 150mg",
              cost: "$$$",
              rationale:
                "SNRI provides dual mechanism for combined depression and anxiety. Faster onset than SSRIs for some patients.",
            },
            {
              name: "Buspirone (Buspar)",
              dosage: "5mg TID, titrate to 15mg TID",
              cost: "$$",
              rationale: "Augmentation for anxiety without sedation or dependence risk.",
            },
            {
              name: "Trazodone",
              dosage: "25-50mg at bedtime PRN",
              cost: "$",
              rationale: "For sleep initiation without benzodiazepine risks.",
            },
          ],
          therapy: {
            type: "Intensive CBT + Behavioral Activation",
            frequency: "2x weekly sessions",
            duration: "8-12 weeks",
          },
          lifestyle: [
            "Structured daily schedule",
            "Exercise 5x/week",
            "Sleep restriction therapy if insomnia persists",
            "Weekly activity logging",
            "Support group participation",
          ],
          pros: [
            "Fastest response rates",
            "Comprehensive symptom coverage",
            "More intensive monitoring",
            "Best for severe functional impairment",
          ],
          cons: [
            "More side effect management",
            "Higher medication burden",
            "Requires more frequent visits",
            "Higher total cost",
          ],
        },
      ],
      monitoring: {
        initialFollowUp: "1-2 weeks",
        regularFollowUp: "Weekly x 4, then biweekly, then monthly",
        assessments: [
          "PHQ-9 at each visit",
          "GAD-7 at each visit",
          "Suicide risk screening",
          "Side effect assessment",
        ],
      },
      fromCache: false,
      modelUsed: "demo-mode",
      processingTime: "0.8s",
    };
  }

  private getDemoSOAPNote(sessionData: any): string {
    // Add variability with random elements
    const timestamp = Date.now();
    const variationSeed = timestamp % 5;

    // Vital sign variations
    const vitals = [
      "BP 118/76 mmHg, HR 72 bpm, RR 16, Temp 98.4°F",
      "BP 122/78 mmHg, HR 68 bpm, RR 14, Temp 98.6°F",
      "BP 116/74 mmHg, HR 74 bpm, RR 15, Temp 98.2°F",
      "BP 120/80 mmHg, HR 70 bpm, RR 16, Temp 98.5°F",
      "BP 124/82 mmHg, HR 76 bpm, RR 14, Temp 98.3°F",
    ][variationSeed];

    // Mental status exam variations
    const mseFindings = [
      'Alert and oriented x4. Cooperative with fair eye contact. Speech normal in rate and rhythm. Mood described as "okay." Affect congruent, mildly restricted range. Thought process linear and goal-directed. No suicidal or homicidal ideation.',
      'Patient is alert, oriented, and cooperative. Good eye contact maintained throughout interview. Speech is coherent with normal prosody. Mood reported as "doing better." Affect is euthymic with appropriate reactivity. Thought content without delusions or perceptual disturbances.',
      'Awake, alert, fully oriented. Dressed appropriately with good hygiene. Speech clear and spontaneous. Reports mood as "managing." Affect is congruent with mild improvement noted. No psychomotor abnormalities. Insight and judgment appear intact.',
      'Alert and attentive throughout session. Engaged appropriately with interviewer. Mood described as "stable." Affect reactive and congruent. Thought process organized. Denies current SI/HI. Judgment and insight are fair.',
      'Oriented to person, place, time, and situation. Cooperative demeanor with adequate eye contact. Speech fluent without pressure or latency. Mood "not bad." Affect full range, appropriate to content. No evidence of thought disorder.',
    ][variationSeed];

    // Plan variations
    const planItems = [
      [
        "Continue current medication regimen as prescribed",
        "Psychotherapy session scheduled for next week",
        "Sleep hygiene education reinforced",
        "Return to clinic in 2-4 weeks for follow-up",
        "Crisis resources reviewed; patient to call 988 if needed",
      ],
      [
        "Maintain current treatment plan with close monitoring",
        "Weekly CBT sessions to continue focusing on cognitive restructuring",
        "Encouraged daily physical activity for 30 minutes",
        "Follow-up appointment scheduled in 3 weeks",
        "Safety plan updated and in place",
      ],
      [
        "No changes to current medication at this time",
        "Continue individual therapy twice monthly",
        "Discussed importance of medication adherence",
        "Labs ordered for routine monitoring",
        "Next visit in 4 weeks unless symptoms worsen",
      ],
      [
        "Treatment plan reviewed and adjusted as indicated",
        "Supportive psychotherapy provided during session",
        "Stress reduction techniques reviewed",
        "Patient education on condition provided",
        "Follow-up in 2 weeks to reassess progress",
      ],
      [
        "Current interventions appear effective; continue",
        "Therapy focusing on behavioral activation strategies",
        "Encouraged maintaining regular sleep schedule",
        "Discussed warning signs requiring immediate attention",
        "Return visit scheduled for 3 weeks",
      ],
    ][variationSeed];

    // Expand subjective with clinical context
    const subjectiveBase =
      sessionData.subjective || "Patient presents for routine follow-up visit.";
    const subjectiveExpanded =
      subjectiveBase.length < 50
        ? `${subjectiveBase} Patient was accompanied by family member who confirms reported symptoms. No new medical concerns since last visit. Denies chest pain, shortness of breath, or other acute complaints. Medication compliance has been good.`
        : subjectiveBase;

    // Build assessment with ICD codes
    const assessmentBase = sessionData.assessment || "Condition stable with ongoing treatment.";
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

${sessionData.symptoms?.length > 0 ? `Key symptoms addressed today: ${sessionData.symptoms.join(", ")}.` : ""}

**ASSESSMENT**
${assessment}

**PLAN**
${planItems.map((item, i) => `${i + 1}. ${item}`).join("\n")}

Time spent: ${15 + variationSeed * 5} minutes, greater than 50% in counseling and coordination of care.`;
  }

  /**
   * Transcribe audio using Azure OpenAI Whisper
   * Accepts a Buffer of audio data and returns the transcript text.
   * Falls back to a demo transcript if Azure is not configured.
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    fileName: string = "recording.webm",
  ): Promise<{
    transcript: string;
    isDemo: boolean;
    processingTime: string;
  }> {
    const startTime = Date.now();
    const whisperEndpoint = process.env.AZURE_WHISPER_ENDPOINT;
    const whisperApiKey = process.env.AZURE_WHISPER_API_KEY;
    const whisperDeployment = process.env.AZURE_OPENAI_WHISPER_DEPLOYMENT || "whisper";
    const mainEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const mainApiKey = process.env.AZURE_OPENAI_API_KEY;

    // SEC-AUDIT-2026-04-10: Do not log credential presence or raw error
    // objects to stdout/stderr — those streams land in shared platform
    // logs. Route everything through safe-logger, which strips PHI/PII and
    // becomes a no-op in production for dev* helpers.
    try {
      let client: AzureOpenAI;
      if (whisperEndpoint && whisperApiKey) {
        devLog("Azure OpenAI Whisper", "Using dedicated Whisper credentials");
        if (!this.whisperClient) {
          const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview";
          this.whisperClient = new AzureOpenAI({
            endpoint: whisperEndpoint,
            apiKey: whisperApiKey,
            apiVersion,
            deployment: whisperDeployment,
          });
        }
        client = this.whisperClient;
      } else if (mainEndpoint && mainApiKey) {
        devLog("Azure OpenAI Whisper", "Falling back to main Azure OpenAI client");
        client = this._getClient();
      } else {
        if (isDemoFallbackAllowed()) {
          devLog(
            "Azure OpenAI",
            "Transcription running in DEMO mode (NODE_ENV != production && NEXT_PUBLIC_DEMO_MODE === true)",
          );
          return {
            transcript: this.getDemoTranscript(),
            isDemo: true,
            processingTime: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
          };
        }
        throw new AIProviderUnavailableError(
          "whisper",
          "Whisper is not configured for audio transcription",
        );
      }

      devLog(
        "Azure OpenAI",
        `Transcribing audio: ${fileName} (${(audioBuffer.length / 1024).toFixed(1)}KB)`,
      );

      // Create a File-like object from the Buffer for the SDK
      // Use Uint8Array to satisfy TypeScript's BlobPart type requirements
      const uint8 = new Uint8Array(audioBuffer);
      const file = new File([uint8], fileName, {
        type: fileName.endsWith(".ogg")
          ? "audio/ogg"
          : fileName.endsWith(".mp4")
            ? "audio/mp4"
            : fileName.endsWith(".wav")
              ? "audio/wav"
              : "audio/webm",
      });

      const response = await runResilient(whisperBreaker, WHISPER_TIMEOUT_MS, () =>
        client.audio.transcriptions.create({
          model: whisperDeployment,
          file: file,
          language: "en",
          response_format: "text",
        }),
      );

      const processingTime = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
      // The response is a string when response_format is 'text'
      const transcript = typeof response === "string" ? response : (response as any).text || "";

      devLog(
        "Azure OpenAI",
        `Transcription complete in ${processingTime} (${transcript.length} chars)`,
      );

      return {
        transcript: transcript.trim(),
        isDemo: false,
        processingTime,
      };
    } catch (error) {
      if (error instanceof AIProviderUnavailableError) throw error;

      // SEC-AUDIT-2026-04-10: Log sanitized metadata only. sanitizeError
      // strips stack traces and redacts PII/PHI patterns before emission.
      logError({ action: "AZURE_WHISPER_TRANSCRIBE_ERROR", error: sanitizeError(error) });

      if (isDemoFallbackAllowed()) {
        devWarn(
          "safeAzureOpenAI",
          "Whisper unavailable; returning DEMO transcript (demo mode only)",
        );
        return {
          transcript: this.getDemoTranscript(),
          isDemo: true,
          processingTime: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
        };
      }
      throw new AIProviderUnavailableError(
        "whisper",
        "Whisper transcription failed",
        error,
      );
    }
  }

  /**
   * Generate a realistic demo transcript for when Whisper is unavailable.
   * Varies with each call for realistic behavior.
   */
  private getDemoTranscript(): string {
    const variationSeed = Date.now() % 5;

    const transcripts = [
      `So, how have you been feeling since our last visit? I've been doing a bit better actually. My sleep has improved and I've been getting about seven hours a night now. That's a significant improvement from the four to five hours you were reporting. Any changes in appetite or energy levels? My appetite is back to normal. Energy is still lower than I'd like, but definitely better than a month ago. I've started taking short walks in the morning, maybe 15 to 20 minutes. That's wonderful progress. How about the medication? Any side effects with the current dose of sertraline? The first week was rough with some nausea, but that's completely gone now. No other side effects I've noticed. I'd say my mood has been more stable overall. Less of those dips in the afternoon. Good. And any thoughts of self-harm or suicidal ideation? No, none at all. I feel like I have things to look forward to now. My daughter's graduation is coming up and I've been planning for that. I'm glad to hear it. Let's continue with the current medication and dosage. I'd like to see you back in four weeks.`,

      `Patient presents today for medication management follow-up. She reports significant improvement in depressive symptoms since starting escitalopram 10mg daily six weeks ago. Sleep quality has improved from 3-4 hours to 6-7 hours nightly. Appetite has normalized. She reports decreased rumination and improved concentration at work. Patient denies suicidal ideation, homicidal ideation, or self-harm urges. She reports mild initial nausea that resolved after first week. No other adverse effects noted. Patient has been engaging in daily physical activity as recommended, walking 20-30 minutes per day. Mood is described as "much better, about 70 percent of normal." Anxiety symptoms have also decreased but she still reports occasional situational anxiety related to work deadlines. We discussed continuing current medication regimen and adding brief behavioral activation strategies for residual symptoms. Follow up in four weeks.`,

      `Let's check in on how things are going. How's the anxiety been this week? It's been challenging to be honest. I had a panic attack on Tuesday at work. It came out of nowhere. Can you walk me through what happened? I was in a meeting and suddenly felt my heart racing, couldn't catch my breath, felt like the walls were closing in. I had to excuse myself and go to the bathroom. It lasted about 10 minutes. That sounds very distressing. Have you been using the breathing techniques we practiced? I tried but in the moment it was hard to remember. Afterward I used the 4-7-8 breathing and it helped calm me down. How about the buspirone? Are you taking it consistently? Yes, 10mg twice daily as prescribed. I think it helps with the baseline anxiety but doesn't seem to prevent these acute episodes. We might want to consider adjusting the dose or adding a PRN medication for acute episodes. Have you noticed any patterns or triggers? Usually work presentations or high-pressure meetings. Let's work on exposure therapy for those specific situations.`,

      `Good afternoon. How have things been going with the new treatment plan? Honestly, I've been feeling the best I have in probably two years. The combination of the medication and therapy has really made a difference. That's excellent to hear. Tell me more about what's improved. Well, I'm sleeping through the night now, which hasn't happened in a long time. My mood is stable. I'm not having those crying spells anymore. I've reconnected with some friends and actually enjoy going out again. And how about the cognitive symptoms? Concentration and memory? Much better. I went back to reading, which I love. I finished two books this month. At work, I feel like I can focus on tasks without my mind wandering to negative thoughts. Those are really meaningful improvements. Any concerns about the medication? Not really. The dry mouth from the venlafaxine is still there but it's manageable. I drink more water. No weight changes, no sexual side effects. Good. Let's maintain the current regimen. You're clearly responding well.`,

      `So tell me what brought you in today. I've just been feeling really overwhelmed. Between work and taking care of my father who has dementia, I feel like I'm barely keeping it together. When did you first start noticing these feelings? Probably about three months ago when Dad's condition started getting worse. He's needing more help with daily activities and I feel guilty when I'm not there. It sounds like you're carrying a tremendous burden. How is this affecting your daily life? I'm not sleeping well. I wake up at 3 AM and can't fall back asleep, just thinking about everything I need to do. My appetite is down. I've lost about 8 pounds without trying. I've been snapping at my kids which isn't like me. Have you had any thoughts of harming yourself? No, nothing like that. I just feel exhausted and burnt out. I still find joy in things, like playing with my kids, but I have less energy for it. That's important. It sounds like you may be experiencing what we call adjustment disorder with depressive features, possibly with some caregiver burnout. Let's talk about some strategies and whether medication might help support you through this period.`,
    ];

    return transcripts[variationSeed];
  }
}

// Export singleton instance
const safeAzureOpenAI = new SafeAzureOpenAIService();
export default safeAzureOpenAI;
