// src/lib/billing/code-library.ts
// Comprehensive CPT and ICD-10 code library for clinical documentation

export interface BillingCode {
    code: string;
    type: 'cpt' | 'icd10';
    title: string;
    description: string;
    details: string[];
    // Keywords that trigger this code when found in note content
    keywords: string[];
    // Category for grouping
    category: string;
}

// ============================================================
// CPT CODES — Evaluation & Management
// ============================================================
export const CPT_CODES: BillingCode[] = [
    // E/M — New Patient
    {
        code: '99201',
        type: 'cpt',
        title: 'New Patient E/M — Level 1',
        description: 'Office or other outpatient visit for new patient, straightforward medical decision making.',
        details: ['Time: ~15 minutes', 'Straightforward decision making', 'Self-limited or minor problem'],
        keywords: ['new patient', 'initial visit', 'straightforward', 'minor complaint'],
        category: 'E/M New Patient'
    },
    {
        code: '99202',
        type: 'cpt',
        title: 'New Patient E/M — Level 2',
        description: 'Office visit for new patient requiring straightforward medical decision making.',
        details: ['Time: 15-29 minutes', 'Straightforward MDM', 'Low complexity problems'],
        keywords: ['new patient', 'initial visit', 'low complexity'],
        category: 'E/M New Patient'
    },
    {
        code: '99203',
        type: 'cpt',
        title: 'New Patient E/M — Level 3',
        description: 'Office visit for new patient requiring low level of medical decision making.',
        details: ['Time: 30-44 minutes', 'Low MDM complexity', '2+ self-limited problems or 1 chronic illness'],
        keywords: ['new patient', 'initial visit', 'moderate complexity', 'chronic illness'],
        category: 'E/M New Patient'
    },
    {
        code: '99204',
        type: 'cpt',
        title: 'New Patient E/M — Level 4',
        description: 'Office visit for new patient requiring moderate level of medical decision making.',
        details: ['Time: 45-59 minutes', 'Moderate MDM complexity', 'Multiple chronic conditions or acute illness'],
        keywords: ['new patient', 'initial evaluation', 'multiple diagnoses', 'comprehensive assessment'],
        category: 'E/M New Patient'
    },
    {
        code: '99205',
        type: 'cpt',
        title: 'New Patient E/M — Level 5',
        description: 'Office visit for new patient requiring high level of medical decision making.',
        details: ['Time: 60-74 minutes', 'High MDM complexity', 'Severe or life-threatening conditions'],
        keywords: ['new patient', 'complex evaluation', 'severe', 'life-threatening', 'high risk'],
        category: 'E/M New Patient'
    },

    // E/M — Established Patient
    {
        code: '99211',
        type: 'cpt',
        title: 'Established Patient E/M — Level 1',
        description: 'Office visit for established patient that may not require the presence of a physician.',
        details: ['Time: ~5 minutes', 'Minimal decision making', 'Nurse visits, BP checks, med refills'],
        keywords: ['brief visit', 'nurse visit', 'blood pressure check', 'refill only', 'medication refill'],
        category: 'E/M Established Patient'
    },
    {
        code: '99212',
        type: 'cpt',
        title: 'Established Patient E/M — Level 2',
        description: 'Office visit for established patient requiring straightforward medical decision making.',
        details: ['Time: 10-19 minutes', 'Straightforward MDM', 'Self-limited or minor problem'],
        keywords: ['follow-up', 'brief follow-up', 'minor problem', 'stable condition'],
        category: 'E/M Established Patient'
    },
    {
        code: '99213',
        type: 'cpt',
        title: 'Established Patient E/M — Level 3',
        description: 'Office visit for established patient requiring low level of medical decision making.',
        details: ['Time: 20-29 minutes', 'Low MDM', 'Stable chronic disease management'],
        keywords: ['follow-up', 'routine follow-up', 'stable', 'chronic disease', 'management'],
        category: 'E/M Established Patient'
    },
    {
        code: '99214',
        type: 'cpt',
        title: 'Established Patient E/M — Level 4',
        description: 'Office visit for established patient requiring moderate level of medical decision making.',
        details: ['Time: 30-39 minutes', 'Moderate MDM', 'Prescription drug management, moderate risk'],
        keywords: ['follow-up', 'medication management', 'moderate complexity', 'medication adjustment', 'chronic condition'],
        category: 'E/M Established Patient'
    },
    {
        code: '99215',
        type: 'cpt',
        title: 'Established Patient E/M — Level 5',
        description: 'Office visit for established patient requiring high level of medical decision making.',
        details: ['Time: 40-54 minutes', 'High MDM', 'Severe exacerbation, drug therapy requiring intensive monitoring'],
        keywords: ['complex follow-up', 'high risk', 'intensive monitoring', 'severe exacerbation', 'drug toxicity'],
        category: 'E/M Established Patient'
    },

    // Psychiatry — Diagnostic Evaluations
    {
        code: '90791',
        type: 'cpt',
        title: 'Psychiatric Diagnostic Evaluation',
        description: 'Psychiatric diagnostic evaluation (no medical services).',
        details: ['Initial evaluation without medical component', 'Comprehensive psychiatric history and MSE', 'Diagnosis formulation and treatment planning'],
        keywords: ['initial evaluation', 'diagnostic evaluation', 'psychiatric evaluation', 'intake assessment', 'initial assessment', 'biopsychosocial'],
        category: 'Psychiatry'
    },
    {
        code: '90792',
        type: 'cpt',
        title: 'Psychiatric Diagnostic Evaluation with Medical Services',
        description: 'Psychiatric diagnostic evaluation with medical services.',
        details: ['Initial evaluation with medication consideration', 'Includes physical examination component', 'Can only bill once per patient for initial eval'],
        keywords: ['initial evaluation', 'diagnostic evaluation', 'medication evaluation', 'psychiatric evaluation', 'medical services', 'physical exam'],
        category: 'Psychiatry'
    },

    // Psychotherapy
    {
        code: '90832',
        type: 'cpt',
        title: 'Psychotherapy, 30 minutes',
        description: 'Psychotherapy, 30 minutes with patient.',
        details: ['Duration: 16-37 minutes', 'Individual psychotherapy', 'Brief therapy session'],
        keywords: ['psychotherapy', 'therapy session', 'brief therapy', '30 min', 'counseling session'],
        category: 'Psychotherapy'
    },
    {
        code: '90833',
        type: 'cpt',
        title: 'Psychotherapy Add-on, 30 minutes',
        description: 'Psychotherapy, 30 minutes with patient when performed with an E/M service (add-on).',
        details: ['Duration: 16-37 minutes', 'Must be billed WITH an E/M code', 'Common pairing: 99214 + 90833'],
        keywords: ['psychotherapy add-on', 'combined visit', 'therapy with med check', 'medication management with therapy'],
        category: 'Psychotherapy'
    },
    {
        code: '90834',
        type: 'cpt',
        title: 'Psychotherapy, 45 minutes',
        description: 'Psychotherapy, 45 minutes with patient.',
        details: ['Duration: 38-52 minutes', 'Standard individual therapy session', 'Most common psychotherapy code'],
        keywords: ['psychotherapy', 'therapy session', '45 min', 'individual therapy', 'counseling', 'therapeutic intervention'],
        category: 'Psychotherapy'
    },
    {
        code: '90836',
        type: 'cpt',
        title: 'Psychotherapy Add-on, 45 minutes',
        description: 'Psychotherapy, 45 minutes with patient when performed with an E/M service (add-on).',
        details: ['Duration: 38-52 minutes', 'Must be billed WITH an E/M code', 'Extended therapy during med management visit'],
        keywords: ['psychotherapy add-on', 'extended combined visit', 'therapy with med management'],
        category: 'Psychotherapy'
    },
    {
        code: '90837',
        type: 'cpt',
        title: 'Psychotherapy, 60 minutes',
        description: 'Psychotherapy, 60 minutes with patient.',
        details: ['Duration: 53+ minutes', 'Extended individual therapy session', 'Highest level psychotherapy time code'],
        keywords: ['psychotherapy', 'therapy session', '60 min', 'extended therapy', 'intensive therapy'],
        category: 'Psychotherapy'
    },
    {
        code: '90838',
        type: 'cpt',
        title: 'Psychotherapy Add-on, 60 minutes',
        description: 'Psychotherapy, 60 minutes with patient when performed with an E/M service (add-on).',
        details: ['Duration: 53+ minutes', 'Must be billed WITH an E/M code', 'Extends combined med-management/therapy visit'],
        keywords: ['psychotherapy add-on', 'extended combined', 'intensive combined visit'],
        category: 'Psychotherapy'
    },

    // Group / Family / Crisis
    {
        code: '90847',
        type: 'cpt',
        title: 'Family Psychotherapy with Patient Present',
        description: 'Family psychotherapy (conjoint psychotherapy) with patient present, 50 minutes.',
        details: ['Duration: ~50 minutes', 'Family therapy with identified patient present', 'Focuses on family dynamics and patient interaction'],
        keywords: ['family therapy', 'family session', 'conjoint therapy', 'family counseling', 'couples therapy'],
        category: 'Psychotherapy'
    },
    {
        code: '90846',
        type: 'cpt',
        title: 'Family Psychotherapy without Patient',
        description: 'Family psychotherapy (without the patient present), 50 minutes.',
        details: ['Duration: ~50 minutes', 'Family therapy without patient', 'Caregiver/family education and support'],
        keywords: ['family therapy', 'caregiver session', 'collateral session', 'parent session', 'family meeting'],
        category: 'Psychotherapy'
    },
    {
        code: '90853',
        type: 'cpt',
        title: 'Group Psychotherapy',
        description: 'Group psychotherapy (other than of a multiple-family group).',
        details: ['Group therapy session', 'Multiple patients in session', 'Bill per patient in group'],
        keywords: ['group therapy', 'group session', 'group counseling', 'group psychotherapy'],
        category: 'Psychotherapy'
    },
    {
        code: '90839',
        type: 'cpt',
        title: 'Psychotherapy for Crisis — First 60 minutes',
        description: 'Psychotherapy for crisis; first 60 minutes.',
        details: ['Crisis intervention', 'Urgent/emergent mental health session', 'Life-threatening situations'],
        keywords: ['crisis', 'crisis intervention', 'suicidal', 'emergency', 'acute distress', 'self-harm', 'safety plan'],
        category: 'Crisis'
    },

    // Testing & Assessment
    {
        code: '96127',
        type: 'cpt',
        title: 'Brief Emotional/Behavioral Assessment',
        description: 'Brief emotional/behavioral assessment with scoring and documentation.',
        details: ['Standardized screening instruments (PHQ-9, GAD-7, etc.)', 'Per standardized instrument', 'Quick mental health screening'],
        keywords: ['phq-9', 'gad-7', 'screening', 'assessment tool', 'behavioral assessment', 'depression screening', 'anxiety screening', 'pcl-5', 'audit-c', 'moca'],
        category: 'Testing & Assessment'
    },
    {
        code: '96130',
        type: 'cpt',
        title: 'Psychological Testing Evaluation — First Hour',
        description: 'Psychological testing evaluation services by physician or QHP, first hour.',
        details: ['First hour of testing evaluation', 'Interpretation and report writing', 'Cognitive or psychological testing'],
        keywords: ['psychological testing', 'cognitive testing', 'neuropsychological', 'psych eval', 'testing evaluation'],
        category: 'Testing & Assessment'
    },
    {
        code: '96156',
        type: 'cpt',
        title: 'Health Behavior Assessment',
        description: 'Health behavior assessment, or re-assessment.',
        details: ['Biopsychosocial assessment', 'Health behavior factors', 'Initial or follow-up health behavior evaluation'],
        keywords: ['health behavior', 'biopsychosocial', 'behavioral health', 'health assessment', 'lifestyle assessment'],
        category: 'Testing & Assessment'
    },

    // Care Management
    {
        code: '99490',
        type: 'cpt',
        title: 'Chronic Care Management — 20 minutes',
        description: 'Chronic care management services, at least 20 minutes of clinical staff time.',
        details: ['20+ minutes per calendar month', 'Requires 2+ chronic conditions expected to last 12+ months', 'Coordination of care activities'],
        keywords: ['chronic care', 'care coordination', 'multiple chronic conditions', 'care management'],
        category: 'Care Management'
    },
    {
        code: '99484',
        type: 'cpt',
        title: 'Behavioral Health Integration — 20 minutes',
        description: 'Care management services for behavioral health conditions, at least 20 minutes.',
        details: ['20+ minutes per calendar month', 'Behavioral health care integration', 'Systematic assessment and monitoring'],
        keywords: ['behavioral health integration', 'care management', 'behavioral health care', 'integrated care'],
        category: 'Care Management'
    },

    // Medication Management (E/M focused)
    {
        code: '99404',
        type: 'cpt',
        title: 'Preventive Medicine Counseling, 60 min',
        description: 'Preventive medicine counseling and/or risk factor reduction intervention, approximately 60 minutes.',
        details: ['~60 minute counseling session', 'Risk factor reduction', 'Health promotion and disease prevention'],
        keywords: ['preventive counseling', 'risk reduction', 'health promotion', 'disease prevention', 'wellness counseling'],
        category: 'Preventive Medicine'
    },

    // Telehealth Modifier
    {
        code: '99441',
        type: 'cpt',
        title: 'Telephone E/M — 5-10 minutes',
        description: 'Telephone evaluation and management service, 5-10 minutes of medical discussion.',
        details: ['5-10 minutes phone call', 'Medical discussion with patient', 'Not a simple phone message'],
        keywords: ['telephone', 'phone call', 'phone visit', 'telehealth call'],
        category: 'Telehealth'
    },
    {
        code: '99442',
        type: 'cpt',
        title: 'Telephone E/M — 11-20 minutes',
        description: 'Telephone evaluation and management service, 11-20 minutes of medical discussion.',
        details: ['11-20 minutes phone call', 'Moderate medical discussion', 'Established patient phone follow-up'],
        keywords: ['telephone', 'phone visit', 'phone follow-up', 'telehealth'],
        category: 'Telehealth'
    },
    {
        code: '99443',
        type: 'cpt',
        title: 'Telephone E/M — 21-30 minutes',
        description: 'Telephone evaluation and management service, 21-30 minutes of medical discussion.',
        details: ['21-30 minutes phone call', 'Extended medical discussion', 'Complex phone consultation'],
        keywords: ['telephone', 'phone consultation', 'extended phone visit', 'telehealth'],
        category: 'Telehealth'
    },
];

// ============================================================
// ICD-10 CODES — Psychiatric and Common Medical
// ============================================================
export const ICD10_CODES: BillingCode[] = [
    // ---- Depressive Disorders ----
    {
        code: 'F32.0',
        type: 'icd10',
        title: 'Major Depressive Disorder, Single Episode, Mild',
        description: 'A single episode of major depression with mild symptom severity and minimal functional impairment.',
        details: ['5+ symptoms for 2+ weeks', 'Mild functional impairment', 'Symptoms manageable with outpatient treatment'],
        keywords: ['depression', 'depressive', 'depressed mood', 'sad', 'low mood', 'mild depression', 'single episode'],
        category: 'Depressive Disorders'
    },
    {
        code: 'F32.1',
        type: 'icd10',
        title: 'Major Depressive Disorder, Single Episode, Moderate',
        description: 'A single episode of major depression with moderate symptom severity.',
        details: ['5+ symptoms for 2+ weeks', 'Moderate functional impairment', 'Clinically significant distress'],
        keywords: ['depression', 'depressive', 'depressed mood', 'moderate depression', 'single episode', 'anhedonia', 'low energy'],
        category: 'Depressive Disorders'
    },
    {
        code: 'F32.2',
        type: 'icd10',
        title: 'Major Depressive Disorder, Single Episode, Severe',
        description: 'A single episode of major depression with severe symptom severity without psychotic features.',
        details: ['Severe symptoms with significant distress', 'Major functional impairment', 'May require intensive treatment'],
        keywords: ['severe depression', 'major depression severe', 'hopelessness', 'inability to function', 'vegetative symptoms'],
        category: 'Depressive Disorders'
    },
    {
        code: 'F32.9',
        type: 'icd10',
        title: 'Major Depressive Disorder, Single Episode, Unspecified',
        description: 'Major depressive disorder, single episode, unspecified severity.',
        details: ['Used when severity is not yet determined', 'Single depressive episode', 'Further evaluation needed to specify severity'],
        keywords: ['depression', 'depressive disorder', 'unspecified depression', 'NOS depression'],
        category: 'Depressive Disorders'
    },
    {
        code: 'F33.0',
        type: 'icd10',
        title: 'Major Depressive Disorder, Recurrent, Mild',
        description: 'Recurrent major depressive disorder with mild current episode.',
        details: ['History of 2+ depressive episodes', 'Current episode mild', 'Separated by ≥2 months remission'],
        keywords: ['recurrent depression', 'chronic depression', 'repeated depressive episodes', 'mild recurrent'],
        category: 'Depressive Disorders'
    },
    {
        code: 'F33.1',
        type: 'icd10',
        title: 'Major Depressive Disorder, Recurrent, Moderate',
        description: 'Recurrent major depressive disorder with moderate current episode.',
        details: ['History of 2+ depressive episodes', 'Current episode moderate', 'Often requires pharmacotherapy + psychotherapy'],
        keywords: ['recurrent depression', 'chronic depression', 'moderate recurrent', 'ongoing depression', 'relapse depression'],
        category: 'Depressive Disorders'
    },
    {
        code: 'F33.2',
        type: 'icd10',
        title: 'Major Depressive Disorder, Recurrent, Severe',
        description: 'Recurrent major depressive disorder with severe current episode without psychotic features.',
        details: ['History of 2+ episodes', 'Current episode severe', 'May require intensive outpatient or inpatient treatment'],
        keywords: ['severe recurrent depression', 'treatment-resistant', 'chronic severe depression'],
        category: 'Depressive Disorders'
    },
    {
        code: 'F34.1',
        type: 'icd10',
        title: 'Dysthymic Disorder (Persistent Depressive Disorder)',
        description: 'Chronic depressive mood lasting at least 2 years (1 year in children/adolescents).',
        details: ['Duration: 2+ years of chronic depression', 'Less severe than MDD but persistent', 'May have double depression (MDD + dysthymia)'],
        keywords: ['dysthymia', 'persistent depressive', 'chronic depression', 'low-grade depression', 'persistent low mood'],
        category: 'Depressive Disorders'
    },

    // ---- Anxiety Disorders ----
    {
        code: 'F41.0',
        type: 'icd10',
        title: 'Panic Disorder',
        description: 'Recurrent unexpected panic attacks with persistent concern about additional attacks.',
        details: ['Recurrent panic attacks', 'Persistent worry about attacks', 'May include agoraphobia'],
        keywords: ['panic', 'panic attack', 'panic disorder', 'palpitations', 'chest tightness', 'fear of dying', 'agoraphobia'],
        category: 'Anxiety Disorders'
    },
    {
        code: 'F41.1',
        type: 'icd10',
        title: 'Generalized Anxiety Disorder',
        description: 'Excessive anxiety and worry occurring more days than not for at least 6 months.',
        details: ['Duration: 6+ months', 'Difficulty controlling worry', 'Restlessness, fatigue, poor concentration, irritability, muscle tension, sleep disturbance'],
        keywords: ['anxiety', 'generalized anxiety', 'gad', 'worry', 'anxious', 'nervousness', 'restlessness', 'tension'],
        category: 'Anxiety Disorders'
    },
    {
        code: 'F41.8',
        type: 'icd10',
        title: 'Other Specified Anxiety Disorders',
        description: 'Other specified anxiety disorders not meeting full criteria for specific anxiety diagnoses.',
        details: ['Mixed anxiety and depressive features', 'Anxiety features present', 'Does not meet full criteria for GAD or other specific disorder'],
        keywords: ['mixed anxiety', 'anxiety disorder', 'anxious distress', 'subthreshold anxiety'],
        category: 'Anxiety Disorders'
    },
    {
        code: 'F40.10',
        type: 'icd10',
        title: 'Social Anxiety Disorder (Social Phobia)',
        description: 'Marked fear or anxiety about social situations in which the individual is exposed to scrutiny.',
        details: ['Fear of social/performance situations', 'Avoidance behavior', 'Duration: 6+ months'],
        keywords: ['social anxiety', 'social phobia', 'social fear', 'performance anxiety', 'public speaking fear', 'social avoidance'],
        category: 'Anxiety Disorders'
    },
    {
        code: 'F42.2',
        type: 'icd10',
        title: 'Obsessive-Compulsive Disorder, Mixed',
        description: 'OCD with both obsessional thoughts and compulsive behaviors.',
        details: ['Recurrent obsessions and/or compulsions', 'Time-consuming (>1 hr/day)', 'Causes significant distress'],
        keywords: ['ocd', 'obsessive', 'compulsive', 'obsessions', 'compulsions', 'intrusive thoughts', 'rituals'],
        category: 'Anxiety Disorders'
    },

    // ---- Trauma & Stress ----
    {
        code: 'F43.10',
        type: 'icd10',
        title: 'Post-Traumatic Stress Disorder, Unspecified',
        description: 'PTSD following exposure to actual or threatened death, serious injury, or sexual violence.',
        details: ['Intrusion symptoms', 'Avoidance', 'Negative cognitions/mood changes', 'Arousal and reactivity changes'],
        keywords: ['ptsd', 'post-traumatic', 'trauma', 'traumatic event', 'flashbacks', 'nightmares', 'hypervigilance', 'startle', 'avoidance'],
        category: 'Trauma & Stress'
    },
    {
        code: 'F43.11',
        type: 'icd10',
        title: 'Post-Traumatic Stress Disorder, Acute',
        description: 'PTSD with symptom duration of less than 3 months.',
        details: ['Symptom duration < 3 months', 'Recent traumatic exposure', 'Active PTSD symptoms'],
        keywords: ['acute ptsd', 'recent trauma', 'acute stress', 'new trauma'],
        category: 'Trauma & Stress'
    },
    {
        code: 'F43.12',
        type: 'icd10',
        title: 'Post-Traumatic Stress Disorder, Chronic',
        description: 'PTSD with symptom duration of 3 months or more.',
        details: ['Symptom duration ≥ 3 months', 'Chronic trauma response', 'May be treatment-resistant'],
        keywords: ['chronic ptsd', 'long-standing trauma', 'persistent ptsd', 'complex trauma'],
        category: 'Trauma & Stress'
    },
    {
        code: 'F43.20',
        type: 'icd10',
        title: 'Adjustment Disorder, Unspecified',
        description: 'Development of emotional or behavioral symptoms in response to an identifiable stressor.',
        details: ['Within 3 months of stressor onset', 'Marked distress out of proportion to stressor', 'Symptoms resolve within 6 months after stressor ends'],
        keywords: ['adjustment disorder', 'adjustment reaction', 'life stressor', 'situational distress', 'coping difficulty'],
        category: 'Trauma & Stress'
    },
    {
        code: 'F43.21',
        type: 'icd10',
        title: 'Adjustment Disorder with Depressed Mood',
        description: 'Adjustment disorder with predominantly depressed mood.',
        details: ['Depressive symptoms predominate', 'Related to identifiable stressor', 'Does not meet criteria for MDD'],
        keywords: ['adjustment with depression', 'situational depression', 'reactive depression', 'grief-related depression'],
        category: 'Trauma & Stress'
    },
    {
        code: 'F43.22',
        type: 'icd10',
        title: 'Adjustment Disorder with Anxiety',
        description: 'Adjustment disorder with predominantly anxious features.',
        details: ['Anxiety symptoms predominate', 'Related to identifiable stressor', 'Does not meet criteria for GAD'],
        keywords: ['adjustment with anxiety', 'situational anxiety', 'reactive anxiety', 'stress-related anxiety'],
        category: 'Trauma & Stress'
    },
    {
        code: 'F43.23',
        type: 'icd10',
        title: 'Adjustment Disorder with Mixed Anxiety and Depression',
        description: 'Adjustment disorder with both anxious and depressive symptoms.',
        details: ['Both anxiety and depressive symptoms', 'Related to identifiable stressor', 'Mixed emotional features'],
        keywords: ['mixed adjustment', 'adjustment mixed', 'anxiety and depression', 'mixed mood disturbance'],
        category: 'Trauma & Stress'
    },

    // ---- Bipolar Disorders ----
    {
        code: 'F31.0',
        type: 'icd10',
        title: 'Bipolar I Disorder, Current Episode Hypomanic',
        description: 'Bipolar I disorder, currently experiencing a hypomanic episode.',
        details: ['Elevated/expansive/irritable mood', 'Increased activity/energy for 4+ days', 'Does not require hospitalization'],
        keywords: ['bipolar', 'hypomania', 'hypomanic', 'elevated mood', 'expansive mood', 'pressured speech', 'decreased sleep need'],
        category: 'Bipolar Disorders'
    },
    {
        code: 'F31.31',
        type: 'icd10',
        title: 'Bipolar I Disorder, Current Episode Depressed, Mild',
        description: 'Bipolar disorder, current episode depressed, mild severity.',
        details: ['Bipolar depression', 'Mild depressive symptoms', 'History of manic episodes'],
        keywords: ['bipolar depression', 'bipolar depressed', 'manic-depressive', 'bipolar low'],
        category: 'Bipolar Disorders'
    },
    {
        code: 'F31.32',
        type: 'icd10',
        title: 'Bipolar I Disorder, Current Episode Depressed, Moderate',
        description: 'Bipolar disorder, current episode depressed, moderate severity.',
        details: ['Bipolar depression, moderate', 'Moderate functional impairment', 'May require medication adjustment'],
        keywords: ['bipolar depression moderate', 'bipolar mood episode', 'moderate bipolar depressed'],
        category: 'Bipolar Disorders'
    },
    {
        code: 'F31.81',
        type: 'icd10',
        title: 'Bipolar II Disorder',
        description: 'Bipolar II disorder characterized by hypomanic and major depressive episodes.',
        details: ['Hypomanic episodes (not full mania)', 'Major depressive episodes', 'No history of full manic episodes'],
        keywords: ['bipolar ii', 'bipolar 2', 'bipolar type 2', 'hypomania with depression'],
        category: 'Bipolar Disorders'
    },

    // ---- Substance Use ----
    {
        code: 'F10.10',
        type: 'icd10',
        title: 'Alcohol Use Disorder, Mild',
        description: 'Alcohol use disorder, mild, uncomplicated.',
        details: ['2-3 DSM-5 criteria met', 'Mild impairment', 'Problematic alcohol use pattern'],
        keywords: ['alcohol', 'drinking', 'alcohol use', 'mild alcohol', 'alcohol abuse', 'alcohol misuse'],
        category: 'Substance Use'
    },
    {
        code: 'F10.20',
        type: 'icd10',
        title: 'Alcohol Use Disorder, Moderate/Severe',
        description: 'Alcohol dependence, uncomplicated.',
        details: ['4-5 criteria (moderate) or 6+ criteria (severe)', 'Significant impairment', 'May include tolerance and withdrawal'],
        keywords: ['alcohol dependence', 'alcoholism', 'severe drinking', 'alcohol addiction', 'alcohol withdrawal'],
        category: 'Substance Use'
    },
    {
        code: 'F12.10',
        type: 'icd10',
        title: 'Cannabis Use Disorder, Mild',
        description: 'Cannabis abuse, uncomplicated.',
        details: ['Mild cannabis use disorder', '2-3 DSM-5 criteria', 'Problematic cannabis use'],
        keywords: ['cannabis', 'marijuana', 'thc', 'weed', 'cannabis use', 'marijuana use'],
        category: 'Substance Use'
    },
    {
        code: 'F11.10',
        type: 'icd10',
        title: 'Opioid Use Disorder, Mild',
        description: 'Opioid abuse, uncomplicated.',
        details: ['Mild opioid use disorder', 'Problematic opioid use', 'May benefit from early intervention'],
        keywords: ['opioid', 'opioid use', 'pain pill', 'opiate', 'opioid abuse'],
        category: 'Substance Use'
    },
    {
        code: 'F11.20',
        type: 'icd10',
        title: 'Opioid Use Disorder, Moderate/Severe',
        description: 'Opioid dependence, uncomplicated.',
        details: ['Moderate to severe opioid use disorder', 'May require MAT (Suboxone, Methadone)', 'Significant functional impairment'],
        keywords: ['opioid dependence', 'opioid addiction', 'heroin', 'fentanyl', 'mat', 'suboxone', 'methadone'],
        category: 'Substance Use'
    },

    // ---- ADHD ----
    {
        code: 'F90.0',
        type: 'icd10',
        title: 'ADHD, Predominantly Inattentive Type',
        description: 'Attention-deficit hyperactivity disorder, predominantly inattentive presentation.',
        details: ['6+ inattention symptoms', 'Fewer hyperactivity/impulsivity symptoms', 'Often missed in adults'],
        keywords: ['adhd', 'add', 'attention deficit', 'inattentive', 'difficulty concentrating', 'easily distracted', 'forgetful'],
        category: 'ADHD'
    },
    {
        code: 'F90.1',
        type: 'icd10',
        title: 'ADHD, Predominantly Hyperactive-Impulsive Type',
        description: 'Attention-deficit hyperactivity disorder, predominantly hyperactive-impulsive presentation.',
        details: ['6+ hyperactivity-impulsivity symptoms', 'Fewer inattention symptoms', 'Often diagnosed in childhood'],
        keywords: ['adhd', 'hyperactive', 'impulsive', 'restless', 'fidgeting', 'cannot sit still'],
        category: 'ADHD'
    },
    {
        code: 'F90.2',
        type: 'icd10',
        title: 'ADHD, Combined Type',
        description: 'Attention-deficit hyperactivity disorder, combined presentation.',
        details: ['6+ inattention AND 6+ hyperactivity-impulsivity symptoms', 'Most common ADHD type', 'Both inattentive and hyperactive features'],
        keywords: ['adhd combined', 'adhd combined type', 'inattentive and hyperactive'],
        category: 'ADHD'
    },

    // ---- Sleep Disorders ----
    {
        code: 'G47.00',
        type: 'icd10',
        title: 'Insomnia, Unspecified',
        description: 'Insomnia disorder, unspecified type.',
        details: ['Difficulty falling asleep, staying asleep, or early awakening', 'At least 3 nights per week for 3+ months', 'Causes daytime impairment'],
        keywords: ['insomnia', 'sleep difficulty', 'cannot sleep', 'sleep disturbance', 'trouble sleeping', 'sleep problems'],
        category: 'Sleep Disorders'
    },
    {
        code: 'F51.01',
        type: 'icd10',
        title: 'Primary Insomnia',
        description: 'Insomnia not due to a substance or other medical/mental condition.',
        details: ['Not caused by substance or medical condition', 'Psychophysiological or idiopathic insomnia', 'Behaviorally-mediated sleep difficulty'],
        keywords: ['primary insomnia', 'psychophysiological insomnia', 'chronic insomnia', 'insomnia disorder'],
        category: 'Sleep Disorders'
    },

    // ---- Eating Disorders ----
    {
        code: 'F50.00',
        type: 'icd10',
        title: 'Anorexia Nervosa, Unspecified',
        description: 'Anorexia nervosa, unspecified restricting or binge-eating/purging type.',
        details: ['Restriction of energy intake', 'Intense fear of gaining weight', 'Body image disturbance'],
        keywords: ['anorexia', 'eating disorder', 'restriction', 'weight loss', 'fear of weight gain', 'body image'],
        category: 'Eating Disorders'
    },
    {
        code: 'F50.2',
        type: 'icd10',
        title: 'Bulimia Nervosa',
        description: 'Bulimia nervosa characterized by binge eating and compensatory behaviors.',
        details: ['Recurrent binge eating episodes', 'Compensatory behaviors (purging, fasting, exercise)', 'At least once a week for 3 months'],
        keywords: ['bulimia', 'binge eating', 'purging', 'compensatory behaviors', 'binge-purge'],
        category: 'Eating Disorders'
    },
    {
        code: 'F50.81',
        type: 'icd10',
        title: 'Binge Eating Disorder',
        description: 'Recurrent episodes of binge eating without regular compensatory behaviors.',
        details: ['Binge eating without purging', 'Eating rapidly, until uncomfortably full', 'Marked distress about binge eating'],
        keywords: ['binge eating', 'overeating', 'binge eating disorder', 'compulsive eating'],
        category: 'Eating Disorders'
    },

    // ---- Personality Disorders ----
    {
        code: 'F60.3',
        type: 'icd10',
        title: 'Borderline Personality Disorder',
        description: 'A pervasive pattern of instability in interpersonal relationships, self-image, and affects.',
        details: ['Unstable relationships', 'Identity disturbance', 'Impulsivity, self-harm, fear of abandonment'],
        keywords: ['borderline', 'bpd', 'personality disorder', 'identity disturbance', 'fear of abandonment', 'self-harm', 'emotional dysregulation'],
        category: 'Personality Disorders'
    },

    // ---- Common Medical Comorbidities ----
    {
        code: 'I10',
        type: 'icd10',
        title: 'Essential (Primary) Hypertension',
        description: 'High blood pressure without identifiable secondary cause.',
        details: ['BP ≥130/80 mmHg on multiple occasions', 'Requires ongoing monitoring', 'Lifestyle modification ± medication'],
        keywords: ['hypertension', 'high blood pressure', 'elevated bp', 'htn'],
        category: 'Medical Comorbidities'
    },
    {
        code: 'E11.9',
        type: 'icd10',
        title: 'Type 2 Diabetes Mellitus Without Complications',
        description: 'Type 2 diabetes without documented micro- or macrovascular complications.',
        details: ['HbA1c ≥6.5%', 'Lifestyle modification + oral hypoglycemics', 'Regular glucose monitoring'],
        keywords: ['diabetes', 'type 2 diabetes', 'dm2', 'blood sugar', 'glucose', 'a1c', 'hyperglycemia'],
        category: 'Medical Comorbidities'
    },
    {
        code: 'E78.5',
        type: 'icd10',
        title: 'Hyperlipidemia, Unspecified',
        description: 'Elevated blood lipid levels, unspecified.',
        details: ['Elevated cholesterol or triglycerides', 'Statin therapy commonly used', 'Cardiovascular risk factor'],
        keywords: ['cholesterol', 'hyperlipidemia', 'high cholesterol', 'lipids', 'triglycerides', 'statin'],
        category: 'Medical Comorbidities'
    },
    {
        code: 'E66.01',
        type: 'icd10',
        title: 'Morbid Obesity due to Excess Calories',
        description: 'Morbid (severe) obesity due to excess calories, BMI ≥40.',
        details: ['BMI ≥40', 'Significant health risk factor', 'May qualify for surgical intervention'],
        keywords: ['obesity', 'morbid obesity', 'bmi', 'overweight', 'weight management'],
        category: 'Medical Comorbidities'
    },
    {
        code: 'G43.909',
        type: 'icd10',
        title: 'Migraine, Unspecified, Not Intractable',
        description: 'Migraine headache, unspecified, without status migrainosus.',
        details: ['Recurrent headaches', 'May include aura', 'Responsive to treatment'],
        keywords: ['migraine', 'headache', 'head pain', 'migraine headache'],
        category: 'Medical Comorbidities'
    },
    {
        code: 'G44.209',
        type: 'icd10',
        title: 'Tension-type Headache, Unspecified',
        description: 'Tension-type headache, not intractable.',
        details: ['Mild-moderate bilateral pressing pain', 'Not aggravated by physical activity', 'Duration: 30 min to 7 days'],
        keywords: ['tension headache', 'headache', 'head pain', 'stress headache'],
        category: 'Medical Comorbidities'
    },
    {
        code: 'M54.5',
        type: 'icd10',
        title: 'Low Back Pain',
        description: 'Low back pain, unspecified laterality.',
        details: ['Lumbago NOS', 'Common chronic pain complaint', 'Often comorbid with depression/anxiety'],
        keywords: ['back pain', 'low back pain', 'lumbago', 'lumbar pain', 'chronic pain'],
        category: 'Medical Comorbidities'
    },
    {
        code: 'R45.851',
        type: 'icd10',
        title: 'Suicidal Ideation',
        description: 'Presence of suicidal thoughts or ideation.',
        details: ['Suicidal thoughts present', 'Requires safety assessment', 'Document lethality, plan, intent, means'],
        keywords: ['suicidal ideation', 'suicidal thoughts', 'si', 'wanting to die', 'death wish', 'suicidality'],
        category: 'Safety & Risk'
    },
    {
        code: 'Z91.5',
        type: 'icd10',
        title: 'Personal History of Self-Harm',
        description: 'Personal history of self-harm behavior.',
        details: ['History of self-injurious behavior', 'Important for risk stratification', 'Document even if currently denied'],
        keywords: ['self-harm', 'self-injury', 'cutting', 'history of self-harm', 'non-suicidal self-injury', 'nssi'],
        category: 'Safety & Risk'
    },

    // ---- Neurocognitive ----
    {
        code: 'F06.70',
        type: 'icd10',
        title: 'Mild Neurocognitive Disorder, Unspecified',
        description: 'Mild neurocognitive disorder due to unknown or unspecified etiology.',
        details: ['Modest cognitive decline from prior level', 'Does not interfere with independence', 'Formerly: Mild Cognitive Impairment'],
        keywords: ['cognitive decline', 'memory loss', 'mild cognitive impairment', 'mci', 'forgetfulness', 'cognitive disorder'],
        category: 'Neurocognitive'
    },
    {
        code: 'G30.9',
        type: 'icd10',
        title: "Alzheimer's Disease, Unspecified",
        description: "Alzheimer's disease, unspecified onset.",
        details: ['Progressive cognitive decline', 'Memory loss, language, executive function', 'Most common cause of dementia'],
        keywords: ['alzheimer', 'dementia', 'cognitive decline', 'memory impairment', 'neurodegenerative'],
        category: 'Neurocognitive'
    },

    // ---- Schizophrenia Spectrum ----
    {
        code: 'F20.9',
        type: 'icd10',
        title: 'Schizophrenia, Unspecified',
        description: 'Schizophrenia, unspecified type.',
        details: ['Delusions, hallucinations, disorganized speech/behavior', 'Negative symptoms (flat affect, avolition)', 'Duration: 6+ months'],
        keywords: ['schizophrenia', 'psychosis', 'hallucinations', 'delusions', 'voices', 'paranoia', 'thought disorder'],
        category: 'Schizophrenia Spectrum'
    },
    {
        code: 'F25.0',
        type: 'icd10',
        title: 'Schizoaffective Disorder, Bipolar Type',
        description: 'Schizoaffective disorder with manic or mixed features.',
        details: ['Psychotic symptoms + mood episodes', 'Manic/bipolar type features', 'Psychosis persists outside mood episodes'],
        keywords: ['schizoaffective', 'schizoaffective bipolar', 'psychosis with mania'],
        category: 'Schizophrenia Spectrum'
    },
    {
        code: 'F25.1',
        type: 'icd10',
        title: 'Schizoaffective Disorder, Depressive Type',
        description: 'Schizoaffective disorder with depressive features.',
        details: ['Psychotic symptoms + depressive episodes', 'Depressive type features', 'Psychosis persists outside mood episodes'],
        keywords: ['schizoaffective', 'schizoaffective depressive', 'psychosis with depression'],
        category: 'Schizophrenia Spectrum'
    },
];

// Combined lookup for quick access by code
export const ALL_CODES: Record<string, BillingCode> = {};
[...CPT_CODES, ...ICD10_CODES].forEach(c => { ALL_CODES[c.code] = c; });

// Get code info by code string
export function getCodeInfo(code: string): BillingCode | undefined {
    return ALL_CODES[code];
}
