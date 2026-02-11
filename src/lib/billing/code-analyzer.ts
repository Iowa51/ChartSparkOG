// src/lib/billing/code-analyzer.ts
// Dynamic content-aware billing code analyzer
// Scans clinical note text and suggests the most relevant CPT and ICD-10 codes

import { CPT_CODES, ICD10_CODES, BillingCode } from './code-library';

interface CodeMatch {
    code: string;
    type: 'cpt' | 'icd10';
    title: string;
    description: string;
    score: number;       // Relevance score (higher = more relevant)
    matchedKeywords: string[];
}

interface AnalysisResult {
    cpt: string[];
    icd10: string[];
    // Full details for frontend enrichment
    cptDetails: CodeMatch[];
    icd10Details: CodeMatch[];
}

/**
 * Analyze clinical note content and suggest relevant billing codes.
 * Uses keyword matching with weighted scoring based on:
 * - Number of keyword matches
 * - Keyword specificity (longer/rarer keywords score higher)
 * - Section context (assessment section weighted higher for ICD codes)
 */
export function analyzeNoteForCodes(
    noteContent: {
        subjective?: string;
        objective?: string;
        assessment?: string;
        plan?: string;
        fullContent?: string;
    },
    options?: {
        maxCPT?: number;    // Max CPT codes to return (default 4)
        maxICD10?: number;  // Max ICD-10 codes to return (default 5)
        templateType?: string; // Template type for context (soap, progress, intake, etc.)
        sessionDuration?: number; // Session duration in minutes for CPT selection
    }
): AnalysisResult {
    const maxCPT = options?.maxCPT ?? 4;
    const maxICD10 = options?.maxICD10 ?? 5;
    const templateType = options?.templateType ?? 'soap';

    // Combine all content for analysis, with section weighting
    const subjective = (noteContent.subjective || '').toLowerCase();
    const objective = (noteContent.objective || '').toLowerCase();
    const assessment = (noteContent.assessment || '').toLowerCase();
    const plan = (noteContent.plan || '').toLowerCase();
    const fullText = noteContent.fullContent?.toLowerCase() ||
        `${subjective} ${objective} ${assessment} ${plan}`;

    // Score CPT codes
    const cptMatches = scoreCodes(CPT_CODES, fullText, {
        subjective, objective, assessment, plan
    }, templateType, options?.sessionDuration);

    // Score ICD-10 codes — assessment section gets 3x weight
    const icd10Matches = scoreCodes(ICD10_CODES, fullText, {
        subjective, objective, assessment, plan
    }, templateType);

    // Sort by score descending and take top N
    const topCPT = cptMatches
        .sort((a, b) => b.score - a.score)
        .slice(0, maxCPT);

    const topICD10 = icd10Matches
        .sort((a, b) => b.score - a.score)
        .slice(0, maxICD10);

    return {
        cpt: topCPT.map(c => c.code),
        icd10: topICD10.map(c => c.code),
        cptDetails: topCPT,
        icd10Details: topICD10
    };
}

function scoreCodes(
    codes: BillingCode[],
    fullText: string,
    sections: { subjective: string; objective: string; assessment: string; plan: string },
    templateType: string,
    sessionDuration?: number
): CodeMatch[] {
    const matches: CodeMatch[] = [];

    for (const code of codes) {
        let score = 0;
        const matchedKeywords: string[] = [];

        for (const keyword of code.keywords) {
            const lowerKW = keyword.toLowerCase();

            // Check if keyword appears in the text
            if (fullText.includes(lowerKW)) {
                matchedKeywords.push(keyword);

                // Base score: longer keywords = more specific = higher score
                let keywordScore = Math.max(1, Math.ceil(lowerKW.length / 3));

                // Assessment section gets 3x weight for ICD-10 codes
                if (code.type === 'icd10' && sections.assessment.includes(lowerKW)) {
                    keywordScore *= 3;
                }

                // Plan section gets 2x weight for CPT codes (treatment type)
                if (code.type === 'cpt' && sections.plan.includes(lowerKW)) {
                    keywordScore *= 2;
                }

                // Subjective section gets 2x weight for ICD-10 (symptoms)
                if (code.type === 'icd10' && sections.subjective.includes(lowerKW)) {
                    keywordScore *= 2;
                }

                score += keywordScore;
            }
        }

        // Apply CPT-specific adjustments based on session context
        if (code.type === 'cpt' && score > 0) {
            score = adjustCPTScore(code, score, fullText, templateType, sessionDuration);
        }

        // Only include codes with at least one keyword match
        if (score > 0) {
            matches.push({
                code: code.code,
                type: code.type,
                title: code.title,
                description: code.description,
                score,
                matchedKeywords
            });
        }
    }

    return matches;
}

/**
 * Adjust CPT code scores based on session context clues
 */
function adjustCPTScore(
    code: BillingCode,
    baseScore: number,
    fullText: string,
    templateType: string,
    sessionDuration?: number
): number {
    let score = baseScore;

    // Boost psychotherapy codes when therapy-related content is found
    if (code.category === 'Psychotherapy') {
        const therapyIndicators = [
            'therapeutic intervention', 'coping strategies', 'cognitive behavioral',
            'cbt', 'dbt', 'mindfulness', 'relaxation techniques', 'processing',
            'explored feelings', 'emotional regulation', 'psychoeducation',
            'behavioral activation', 'exposure', 'thought challenging'
        ];
        const therapyMatches = therapyIndicators.filter(t => fullText.includes(t)).length;
        score += therapyMatches * 3;
    }

    // Boost E/M codes when medication management content is found
    if (code.category.includes('E/M')) {
        const medMgmtIndicators = [
            'medication', 'prescribed', 'dosage', 'mg', 'titrate', 'refill',
            'side effects', 'adverse effects', 'lab', 'blood work', 'monitor',
            'increase dose', 'decrease dose', 'medication change', 'new medication',
            'continue current', 'ssri', 'snri', 'antidepressant', 'antipsychotic',
            'benzodiazepine', 'stimulant', 'mood stabilizer'
        ];
        const medMatches = medMgmtIndicators.filter(t => fullText.includes(t)).length;
        score += medMatches * 2;
    }

    // Time-based CPT selection for psychotherapy
    if (sessionDuration && code.category === 'Psychotherapy') {
        if (code.code === '90832' && sessionDuration >= 16 && sessionDuration <= 37) score += 20;
        if (code.code === '90834' && sessionDuration >= 38 && sessionDuration <= 52) score += 20;
        if (code.code === '90837' && sessionDuration >= 53) score += 20;
    }

    // Extract time from note text if no explicit duration
    if (!sessionDuration) {
        const timeMatch = fullText.match(/(\d+)\s*minutes?\s*(face-to-face|session|total|spent)/i);
        const extractedTime = timeMatch ? parseInt(timeMatch[1]) : null;

        if (extractedTime && code.category === 'Psychotherapy') {
            if (code.code === '90832' && extractedTime >= 16 && extractedTime <= 37) score += 15;
            if (code.code === '90834' && extractedTime >= 38 && extractedTime <= 52) score += 15;
            if (code.code === '90837' && extractedTime >= 53) score += 15;
        }
    }

    // Boost initial eval codes for intake templates
    if (templateType === 'intake' || fullText.includes('initial evaluation') || fullText.includes('intake')) {
        if (code.code === '90791' || code.code === '90792') score += 10;
        if (code.code === '99204' || code.code === '99205') score += 8;
    }

    // Boost crisis codes when safety concerns are present
    if (code.category === 'Crisis') {
        const crisisIndicators = [
            'suicidal ideation', 'homicidal ideation', 'self-harm', 'safety plan',
            'crisis', 'emergency', 'acute distress', '988', 'hospitalization'
        ];
        const crisisMatches = crisisIndicators.filter(t => fullText.includes(t)).length;
        if (crisisMatches >= 2) score += 15;
    }

    // Boost screening codes when standardized tools are mentioned
    if (code.code === '96127') {
        const screeningTools = ['phq-9', 'phq9', 'gad-7', 'gad7', 'pcl-5', 'pcl5', 'audit-c', 'moca', 'mmse', 'columbia', 'cssrs'];
        const screeningMatches = screeningTools.filter(t => fullText.includes(t)).length;
        score += screeningMatches * 8;
    }

    // Boost telehealth codes when telehealth is mentioned
    if (code.category === 'Telehealth') {
        const telehealthIndicators = ['telehealth', 'video visit', 'virtual visit', 'telephone', 'phone session'];
        const telehealthMatches = telehealthIndicators.filter(t => fullText.includes(t)).length;
        score += telehealthMatches * 5;
    }

    return score;
}

/**
 * Quick utility: Generate suggested codes from a simple text blob
 * Useful for fallback/demo mode
 */
export function quickSuggestCodes(noteText: string): { cpt: string[]; icd10: string[] } {
    const result = analyzeNoteForCodes({ fullContent: noteText });
    return { cpt: result.cpt, icd10: result.icd10 };
}
