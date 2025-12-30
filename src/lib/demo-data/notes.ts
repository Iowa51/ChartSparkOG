// Demo AI-generated SOAP notes for different templates
export const demoSOAPNotes: Record<string, {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    suggestedCodes: { cpt: string[]; icd10: string[] };
}> = {
    "tpl-progress-note": {
        subjective: `Patient is a 45-year-old male presenting for follow-up visit. Reports persistent headache for 3 days, described as a "tight band" around forehead (pressure-like). Denies throbbing or sharp pain. Notes photophobia. Denies aura, visual disturbances, nausea, or vomiting. Reports OTC Tylenol provided no relief.

Current Medications: Lisinopril 10mg daily, Metformin 500mg BID
Allergies: NKDA
Social History: Non-smoker, occasional alcohol use`,
        objective: `Vitals: BP 120/80 mmHg, HR 72 bpm, RR 16, Temp 98.6°F, SpO2 99% on RA

General: Alert and oriented x3. No acute distress, though appears uncomfortable due to light.

HEENT: PERRLA. EOM intact. Fundoscopic exam normal. No sinus tenderness to palpation. Neck supple, no nuchal rigidity.

Neuro: CN II-XII grossly intact. Strength 5/5 upper and lower extremities. Gait normal. No focal deficits.`,
        assessment: `1. Tension-type headache (G44.209) - Primary, likely exacerbated by stress
2. Rule out Migraine without aura - Less likely given description, but photophobia present
3. Hypertension - Well controlled on current regimen
4. Type 2 Diabetes - Stable`,
        plan: `1. Initiate Naproxen 500mg BID with food for 5 days
2. Advise rest in a dark, quiet room during acute episodes
3. Encourage adequate hydration and regular sleep schedule
4. Patient education on tension headache triggers and lifestyle modifications
5. Follow up in 2 weeks if symptoms persist or worsen
6. Return precautions discussed: Seek ED if sudden severe headache ("thunderclap") or neurological changes occur

Time spent: 25 minutes, greater than 50% in counseling and coordination of care.`,
        suggestedCodes: {
            cpt: ["99214"],
            icd10: ["G44.209", "I10", "E11.9"],
        },
    },
    "tpl-follow-up-med": {
        subjective: `Patient returns for medication management follow-up. Reports significant improvement in depressive symptoms since starting Sertraline 50mg 6 weeks ago. PHQ-9 today: 8 (down from 16). Denies suicidal ideation. Sleep improved, now averaging 7 hours/night. Appetite normalized.

Side effects: Mild nausea first 2 weeks, now resolved. Denies sexual dysfunction.

Current Medications: Sertraline 50mg daily
Allergies: Penicillin (hives)`,
        objective: `Vitals: BP 118/76 mmHg, HR 68 bpm

Mental Status Exam:
- Appearance: Well-groomed, appropriate dress
- Behavior: Cooperative, good eye contact
- Speech: Normal rate and rhythm
- Mood: "Much better"
- Affect: Euthymic, congruent, reactive
- Thought Process: Linear, goal-directed
- Thought Content: No SI/HI, no delusions
- Cognition: Alert and oriented x4
- Insight/Judgment: Good`,
        assessment: `1. Major Depressive Disorder, single episode, moderate - Responding well to treatment (F32.1)
2. Generalized Anxiety Disorder - Improved (F41.1)`,
        plan: `1. Continue Sertraline 50mg daily - good response, no need for dose adjustment at this time
2. Continue individual therapy with Dr. Smith weekly
3. Sleep hygiene education reinforced
4. Return in 4 weeks for medication check
5. PHQ-9 and GAD-7 at next visit
6. Safety plan reviewed and updated

Psychotherapy add-on: 16 minutes spent on supportive therapy and cognitive restructuring techniques.`,
        suggestedCodes: {
            cpt: ["99214", "90833"],
            icd10: ["F32.1", "F41.1"],
        },
    },
    "tpl-intake-eval": {
        subjective: `Patient is a new referral presenting for a comprehensive bio-psychosocial assessment. John reports a long history of intermittent mood fluctuations, characterized by periods of low energy, social withdrawal, and lack of motivation. He notes these symptoms have worsened over the last 6 months following a significant career transition.

John identifies as a cisgender male, currently living with his partner of 4 years. He describes his childhood as relatively stable but notes a distant relationship with his father. Family history is significant for maternal depression.

Clinically, John appears well-groomed but exhibits a restricted affect. He is articulate and cooperative. No evidence of psychosis or active suicidal ideation is noted today. Insight is fair, and he is motivated to engage in both medication management and psychotherapy.`,
        objective: `Detailed mental status exam performed. Speech is normal in rate and volume. Thought processes are linear and goal-directed. Insight and judgment appear intact for age and situation. Physical exam deferred to primary care.`,
        assessment: `1. Major Depressive Disorder, recurrent, moderate (F33.1)
2. Adjustment Disorder with depressed mood (F43.21)
3. Occupational stress (Z56.9)`,
        plan: `1. Initiate Sertraline 25mg daily for 7 days, then increase to 50mg daily.
2. Refer for CBT focusing on career transition and cognitive restructuring.
3. Schedule follow-up in 2 weeks for med check.
4. Patient provided with crisis resources and emergency contacts.`,
        suggestedCodes: {
            cpt: ["90792"],
            icd10: ["F33.1", "F43.21"],
        },
    },
};

export function generateDemoNote(templateId: string): typeof demoSOAPNotes[string] {
    return demoSOAPNotes[templateId] || demoSOAPNotes["tpl-progress-note"];
}

// Demo transcript for voice recording simulation
export const demoTranscript = [
    { speaker: "NP", time: "00:01", text: "Hello John, good to see you again. How are you feeling today since our last visit?" },
    { speaker: "Patient", time: "00:05", text: "Well, honestly, I've had this nagging headache for about three days now. It just won't go away with Tylenol." },
    { speaker: "NP", time: "00:12", text: "I'm sorry to hear that. Can you describe the pain? Is it throbbing, sharp, or more of a pressure?" },
    { speaker: "Patient", time: "00:18", text: "It feels like a tight band around my forehead. Definitely pressure. And I'm a bit sensitive to light." },
    { speaker: "NP", time: "00:25", text: "Okay, noted. Have you noticed any visual disturbances, like an aura or flashing lights before it starts?" },
    { speaker: "Patient", time: "00:32", text: "No, nothing like that. Just the pain and the light sensitivity." },
    { speaker: "NP", time: "00:38", text: "Any nausea or vomiting with the headaches?" },
    { speaker: "Patient", time: "00:42", text: "No, just the head pain." },
    { speaker: "NP", time: "00:45", text: "And how would you rate the pain on a scale of 1 to 10?" },
    { speaker: "Patient", time: "00:50", text: "About a 6 or 7, especially in the afternoons." },
];
