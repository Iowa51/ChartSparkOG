// ============================================================================
// GERIATRIC ASSESSMENT TOOLS
// MMSE, GDS-15, Fall Risk Calculator
// ============================================================================

export const MMSE_SECTIONS = [
    {
        category: 'Orientation to Time',
        questions: ['What is the year?', 'What is the season?', 'What is the date?', 'What is the day?', 'What is the month?'],
        maxScore: 5
    },
    {
        category: 'Orientation to Place',
        questions: ['What state?', 'What county?', 'What city?', 'What building?', 'What floor?'],
        maxScore: 5
    },
    {
        category: 'Registration',
        instruction: 'Name 3 objects (apple, table, penny)',
        maxScore: 3
    },
    {
        category: 'Attention & Calculation',
        instruction: 'Serial 7s OR spell WORLD backwards',
        maxScore: 5
    },
    {
        category: 'Recall',
        instruction: 'Recall the 3 objects',
        maxScore: 3
    },
    {
        category: 'Language',
        tasks: ['Name pencil/watch (2pt)', 'Repeat phrase (1pt)', '3-stage command (3pt)', 'Read/obey (1pt)', 'Write sentence (1pt)'],
        maxScore: 8
    },
    {
        category: 'Visual Construction',
        instruction: 'Copy pentagons',
        maxScore: 1
    }
];

export function interpretMMSE(score: number): {
    category: string;
    interpretation: string;
    recommendations: string[];
} {
    if (score >= 24) {
        return {
            category: 'Normal',
            interpretation: 'No cognitive impairment detected',
            recommendations: [
                'Continue routine monitoring',
                'Encourage cognitive engagement',
                'Address modifiable risk factors (hypertension, diabetes)',
                'Annual screening recommended'
            ]
        };
    } else if (score >= 18) {
        return {
            category: 'Mild Cognitive Impairment',
            interpretation: 'Mild cognitive impairment - requires evaluation',
            recommendations: [
                'Diagnostic workup: Labs (B12, TSH, CBC, CMP)',
                'Consider brain imaging (MRI preferred)',
                'Comprehensive medication review',
                'Monitor for progression (re-test in 6 months)',
                'Caregiver education and support',
                'Consider referral to neurology',
                'Assess driving safety'
            ]
        };
    } else {
        return {
            category: 'Moderate to Severe Impairment',
            interpretation: 'Significant cognitive impairment - likely dementia',
            recommendations: [
                '🚨 URGENT: Comprehensive dementia evaluation',
                'Neurology or geriatric psychiatry referral',
                'Brain MRI to rule out reversible causes',
                'Safety assessment (driving, living situation)',
                'Consider cholinesterase inhibitors (donepezil, rivastigmine)',
                'Advanced care planning discussions',
                'Caregiver support and respite services',
                'Consider adult day programs'
            ]
        };
    }
}

export const GDS_15_QUESTIONS = [
    { question: 'Are you basically satisfied with your life?', scoring: 'no_is_1' },
    { question: 'Have you dropped many activities and interests?', scoring: 'yes_is_1' },
    { question: 'Do you feel your life is empty?', scoring: 'yes_is_1' },
    { question: 'Do you often get bored?', scoring: 'yes_is_1' },
    { question: 'Are you in good spirits most of the time?', scoring: 'no_is_1' },
    { question: 'Are you afraid something bad will happen?', scoring: 'yes_is_1' },
    { question: 'Do you feel happy most of the time?', scoring: 'no_is_1' },
    { question: 'Do you often feel helpless?', scoring: 'yes_is_1' },
    { question: 'Do you prefer to stay home rather than go out?', scoring: 'yes_is_1' },
    { question: 'Do you feel you have more memory problems than most?', scoring: 'yes_is_1' },
    { question: 'Do you think it is wonderful to be alive now?', scoring: 'no_is_1' },
    { question: 'Do you feel pretty worthless the way you are now?', scoring: 'yes_is_1' },
    { question: 'Do you feel full of energy?', scoring: 'no_is_1' },
    { question: 'Do you feel your situation is hopeless?', scoring: 'yes_is_1' },
    { question: 'Do you think most people are better off than you?', scoring: 'yes_is_1' }
];

export function interpretGDS15(score: number): {
    category: string;
    interpretation: string;
    recommendations: string[];
} {
    if (score <= 4) {
        return {
            category: 'Normal',
            interpretation: 'No significant depression',
            recommendations: [
                'Continue routine screening annually',
                'Encourage social engagement',
                'Monitor for life changes that may trigger depression',
                'Promote healthy lifestyle'
            ]
        };
    } else if (score <= 9) {
        return {
            category: 'Mild Depression',
            interpretation: 'Mild depressive symptoms present',
            recommendations: [
                'Psychotherapy (CBT, problem-solving therapy)',
                'Increase social activities and exercise',
                'Structured exercise program (150 min/week)',
                'Screen for medical causes (thyroid, B12, medication side effects)',
                'Re-screen in 2-4 weeks',
                'Consider support groups',
                'Address sleep hygiene'
            ]
        };
    } else {
        return {
            category: 'Moderate to Severe Depression',
            interpretation: 'Significant depression - treatment indicated',
            recommendations: [
                'Initiate antidepressant (SSRI: sertraline, escitalopram)',
                'Psychotherapy referral (evidence-based for elderly)',
                '🚨 ASSESS SUICIDE RISK immediately',
                'Rule out medical causes (labs, medication review)',
                'Close follow-up (2 weeks initially)',
                'Engage caregiver/family support',
                'Consider psychiatric consultation if severe',
                'Monitor for medication side effects (falls, hyponatremia)'
            ]
        };
    }
}

export const FALL_RISK_FACTORS = [
    { factor: 'Age > 80 years', points: 2 },
    { factor: 'History of falls (past 6 months)', points: 3 },
    { factor: 'Gait or balance impairment', points: 2 },
    { factor: 'Use of assistive device (cane, walker)', points: 1 },
    { factor: 'Dizziness or vertigo', points: 1 },
    { factor: 'Visual impairment', points: 1 },
    { factor: 'Cognitive impairment (MMSE < 24)', points: 2 },
    { factor: 'Taking 4+ medications (polypharmacy)', points: 1 },
    { factor: 'Psychoactive medications (sedatives, antipsychotics)', points: 2 },
    { factor: 'Orthostatic hypotension', points: 1 },
    { factor: 'Environmental hazards at home', points: 1 },
    { factor: 'Fear of falling', points: 1 },
    { factor: 'Previous fracture from fall', points: 2 },
    { factor: 'Urinary incontinence', points: 1 },
    { factor: 'Arthritis or musculoskeletal disorder', points: 1 }
];

export function calculateFallRisk(selectedFactors: string[]): {
    score: number;
    level: 'low' | 'moderate' | 'high';
    interpretation: string;
    recommendations: string[];
} {
    const score = selectedFactors.reduce((total, factor) => {
        const item = FALL_RISK_FACTORS.find(f => f.factor === factor);
        return total + (item?.points || 0);
    }, 0);

    if (score <= 3) {
        return {
            score,
            level: 'low',
            interpretation: 'Low fall risk',
            recommendations: [
                'Encourage regular exercise (tai chi, balance training)',
                'Annual vision exam',
                'Home safety review (lighting, remove tripping hazards)',
                'Adequate lighting in hallways and stairs',
                'Review medications annually',
                'Educate on fall prevention'
            ]
        };
    } else if (score <= 7) {
        return {
            score,
            level: 'moderate',
            interpretation: 'Moderate fall risk - intervention needed',
            recommendations: [
                'Physical therapy for strength and balance training',
                'Comprehensive medication review (reduce/eliminate fall-risk meds)',
                'Home safety assessment (OT referral)',
                'Vision correction (ophthalmology referral)',
                'Consider assistive device (PT evaluation)',
                'Vitamin D 800-1000 IU daily + calcium 1200mg',
                'Podiatry evaluation for foot problems',
                'Review footwear (proper, non-slip)',
                'Follow-up in 1 month'
            ]
        };
    } else {
        return {
            score,
            level: 'high',
            interpretation: '🚨 HIGH FALL RISK - urgent intervention required',
            recommendations: [
                '🚨 URGENT: Enroll in fall prevention program',
                'PT/OT evaluation within 1 week',
                'STOP high-risk medications (sedatives, muscle relaxants)',
                'Home modifications NOW (grab bars, remove rugs, improve lighting)',
                'Medical alert system (Life Alert, etc.)',
                'Consider hip protectors',
                'Vitamin D 1000-2000 IU daily',
                'Frequent monitoring (weekly initially)',
                'Consider supervised living if very high risk',
                'Educate family on fall prevention',
                'Address underlying causes (vision, strength, medications)'
            ]
        };
    }
}

export const ADL_ACTIVITIES = [
    { name: 'Bathing', description: 'Ability to bathe independently' },
    { name: 'Dressing', description: 'Ability to dress independently' },
    { name: 'Toileting', description: 'Ability to use toilet independently' },
    { name: 'Transferring', description: 'Ability to move from bed to chair' },
    { name: 'Continence', description: 'Control of bladder and bowel' },
    { name: 'Feeding', description: 'Ability to feed self' }
];

export const IADL_ACTIVITIES = [
    { name: 'Using telephone', description: 'Ability to use phone independently' },
    { name: 'Shopping', description: 'Ability to shop for groceries' },
    { name: 'Food preparation', description: 'Ability to prepare meals' },
    { name: 'Housekeeping', description: 'Ability to do light housework' },
    { name: 'Laundry', description: 'Ability to do laundry' },
    { name: 'Transportation', description: 'Ability to drive or use transport' },
    { name: 'Managing medications', description: 'Ability to take meds correctly' },
    { name: 'Managing finances', description: 'Ability to manage money and bills' }
];

export function assessFunctionalStatus(
    adlIndependent: string[],
    iadlIndependent: string[]
): {
    adlScore: number;
    iadlScore: number;
    interpretation: string;
    recommendations: string[];
} {
    const adlScore = adlIndependent.length;
    const iadlScore = iadlIndependent.length;

    const totalADL = ADL_ACTIVITIES.length;
    const totalIADL = IADL_ACTIVITIES.length;

    if (adlScore === totalADL && iadlScore === totalIADL) {
        return {
            adlScore,
            iadlScore,
            interpretation: 'Fully independent',
            recommendations: [
                'Continue to monitor functional status',
                'Encourage continued independence',
                'Preventive measures for maintaining function'
            ]
        };
    } else if (adlScore >= 4 && iadlScore >= 5) {
        return {
            adlScore,
            iadlScore,
            interpretation: 'Mostly independent - some assistance needed',
            recommendations: [
                'Assess specific areas of difficulty',
                'Consider adaptive equipment',
                'Home health aide for limited assistance',
                'Monitor for decline'
            ]
        };
    } else {
        return {
            adlScore,
            iadlScore,
            interpretation: 'Significant functional impairment - substantial assistance needed',
            recommendations: [
                'Comprehensive geriatric assessment',
                'Home health services',
                'Caregiver support and training',
                'Consider assisted living or skilled nursing',
                'Physical and occupational therapy evaluation',
                'Medical equipment and home modifications'
            ]
        };
    }
}
