import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route to validate medical codes (ICD-10 for diagnoses and CPT for procedures/billing).
 * This currently uses an internal library/regex-based validation and some mock high-fidelity data.
 */

// Mock database of common valid codes for demo purposes
const VALID_ICD10_CODES = [
    'F32.1', 'F32.9', 'F41.1', 'F43.10', 'E11.9', 'I10', 'J06.9', 'M54.5'
];

const VALID_CPT_CODES = [
    '90834', '90837', '99213', '99214', '90791', '96127', '99404'
];

export async function POST(request: NextRequest) {
    try {
        const { codes } = await request.json();

        if (!Array.isArray(codes)) {
            return NextResponse.json({ error: 'Invalid input: codes must be an array' }, { status: 400 });
        }

        const results = codes.map(codeData => {
            const { code, type } = codeData; // type: 'ICD10' | 'CPT'

            let isValid = false;
            let description = 'Unknown code';

            if (type === 'ICD10') {
                isValid = VALID_ICD10_CODES.includes(code.toUpperCase());
                if (isValid) {
                    // Mock descriptions
                    const descriptions: Record<string, string> = {
                        'F32.1': 'Major depressive disorder, single episode, moderate',
                        'F32.9': 'Major depressive disorder, single episode, unspecified',
                        'F41.1': 'Generalized anxiety disorder',
                        'F43.10': 'Post-traumatic stress disorder, unspecified',
                        'E11.9': 'Type 2 diabetes mellitus without complications',
                        'I10': 'Essential (primary) hypertension',
                        'J06.9': 'Acute upper respiratory infection, unspecified',
                        'M54.5': 'Low back pain'
                    };
                    description = descriptions[code.toUpperCase()] || 'Valid ICD-10 Diagnosis';
                }
            } else if (type === 'CPT') {
                isValid = VALID_CPT_CODES.includes(code);
                if (isValid) {
                    const descriptions: Record<string, string> = {
                        '90834': 'Psychotherapy, 45 minutes with patient',
                        '90837': 'Psychotherapy, 60 minutes with patient',
                        '99213': 'Office or other outpatient visit (moderate complexity)',
                        '99214': 'Office or other outpatient visit (high complexity)',
                        '90791': 'Psychiatric diagnostic evaluation',
                        '96127': 'Brief emotional/behavioral assessment',
                        '99404': 'Preventive medicine counseling, 60 min'
                    };
                    description = descriptions[code] || 'Valid CPT Billing Code';
                }
            }

            return {
                code,
                type,
                isValid,
                description,
                timestamp: new Date().toISOString()
            };
        });

        return NextResponse.json({ results });

    } catch (error: any) {
        console.error('Error in validate-codes API:', error);
        return NextResponse.json({ error: 'Failed to validate codes' }, { status: 500 });
    }
}
