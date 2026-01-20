"use client";

import { useState } from "react";
import {
    BookOpen,
    Brain,
    AlertTriangle,
    Heart,
    Pill,
    FileText,
    Search,
    ExternalLink,
    ChevronDown,
    ChevronRight,
    X,
    CheckCircle,
    ClipboardList,
    Copy,
    ClipboardCheck,
    DollarSign,
    Clock,
} from "lucide-react";

// Assessment questions/content for interactive modals
const assessmentContent: Record<string, {
    questions?: { id: string; text: string; options?: { label: string; score: number }[] }[];
    instructions?: string;
    interpretation?: string[];
}> = {
    "Mini-Mental State Examination (MMSE)": {
        instructions: "Ask each question and score based on patient response. Maximum score is 30 points.",
        questions: [
            { id: "orientation-time", text: "Orientation to Time (5 pts): What is the year, season, date, day, month?", options: [{ label: "0 correct", score: 0 }, { label: "1 correct", score: 1 }, { label: "2 correct", score: 2 }, { label: "3 correct", score: 3 }, { label: "4 correct", score: 4 }, { label: "5 correct", score: 5 }] },
            { id: "orientation-place", text: "Orientation to Place (5 pts): What is the state, county, town, building, floor?", options: [{ label: "0 correct", score: 0 }, { label: "1 correct", score: 1 }, { label: "2 correct", score: 2 }, { label: "3 correct", score: 3 }, { label: "4 correct", score: 4 }, { label: "5 correct", score: 5 }] },
            { id: "registration", text: "Registration (3 pts): Name 3 objects, have patient repeat all 3", options: [{ label: "0 correct", score: 0 }, { label: "1 correct", score: 1 }, { label: "2 correct", score: 2 }, { label: "3 correct", score: 3 }] },
            { id: "attention", text: "Attention (5 pts): Spell 'WORLD' backwards or serial 7s", options: [{ label: "0 correct", score: 0 }, { label: "1 correct", score: 1 }, { label: "2 correct", score: 2 }, { label: "3 correct", score: 3 }, { label: "4 correct", score: 4 }, { label: "5 correct", score: 5 }] },
            { id: "recall", text: "Recall (3 pts): Recall the 3 objects from earlier", options: [{ label: "0 correct", score: 0 }, { label: "1 correct", score: 1 }, { label: "2 correct", score: 2 }, { label: "3 correct", score: 3 }] },
            { id: "language", text: "Language/Praxis (9 pts): Naming, repetition, 3-stage command, reading, writing, copying", options: [{ label: "0-3 pts", score: 2 }, { label: "4-6 pts", score: 5 }, { label: "7-9 pts", score: 9 }] },
        ],
        interpretation: ["24-30: Normal cognition", "19-23: Mild cognitive impairment", "10-18: Moderate cognitive impairment", "<10: Severe cognitive impairment"],
    },
    "Montreal Cognitive Assessment (MoCA)": {
        instructions: "Administer all sections. Maximum score is 30 points. Add 1 point if ≤12 years education.",
        questions: [
            { id: "visuospatial", text: "Visuospatial/Executive (5 pts): Trail making, cube copy, clock drawing", options: [{ label: "0 pts", score: 0 }, { label: "1-2 pts", score: 2 }, { label: "3-4 pts", score: 4 }, { label: "5 pts", score: 5 }] },
            { id: "naming", text: "Naming (3 pts): Lion, rhinoceros, camel", options: [{ label: "0 correct", score: 0 }, { label: "1 correct", score: 1 }, { label: "2 correct", score: 2 }, { label: "3 correct", score: 3 }] },
            { id: "memory", text: "Memory: Read list of 5 words, patient repeats (no points, for delayed recall)", options: [{ label: "Done", score: 0 }] },
            { id: "attention", text: "Attention (6 pts): Digit span, vigilance, serial 7s", options: [{ label: "0-2 pts", score: 1 }, { label: "3-4 pts", score: 4 }, { label: "5-6 pts", score: 6 }] },
            { id: "language", text: "Language (3 pts): Sentence repetition (2), verbal fluency (1)", options: [{ label: "0 pts", score: 0 }, { label: "1-2 pts", score: 2 }, { label: "3 pts", score: 3 }] },
            { id: "abstraction", text: "Abstraction (2 pts): Similarities (train-bicycle, watch-ruler)", options: [{ label: "0 correct", score: 0 }, { label: "1 correct", score: 1 }, { label: "2 correct", score: 2 }] },
            { id: "delayed-recall", text: "Delayed Recall (5 pts): Recall the 5 words from memory section", options: [{ label: "0 correct", score: 0 }, { label: "1-2 correct", score: 2 }, { label: "3-4 correct", score: 4 }, { label: "5 correct", score: 5 }] },
            { id: "orientation", text: "Orientation (6 pts): Date, month, year, day, place, city", options: [{ label: "0-2 correct", score: 1 }, { label: "3-4 correct", score: 4 }, { label: "5-6 correct", score: 6 }] },
        ],
        interpretation: ["26+: Normal cognition", "18-25: Mild cognitive impairment", "<18: Significant cognitive impairment"],
    },
    "Geriatric Depression Scale-15 (GDS-15)": {
        instructions: "Ask the patient to answer YES or NO to each question, referring to how they have felt over the past week.",
        questions: [
            { id: "q1", text: "1. Are you basically satisfied with your life?", options: [{ label: "Yes", score: 0 }, { label: "No", score: 1 }] },
            { id: "q2", text: "2. Have you dropped many of your activities and interests?", options: [{ label: "Yes", score: 1 }, { label: "No", score: 0 }] },
            { id: "q3", text: "3. Do you feel that your life is empty?", options: [{ label: "Yes", score: 1 }, { label: "No", score: 0 }] },
            { id: "q4", text: "4. Do you often get bored?", options: [{ label: "Yes", score: 1 }, { label: "No", score: 0 }] },
            { id: "q5", text: "5. Are you in good spirits most of the time?", options: [{ label: "Yes", score: 0 }, { label: "No", score: 1 }] },
            { id: "q6", text: "6. Are you afraid that something bad is going to happen to you?", options: [{ label: "Yes", score: 1 }, { label: "No", score: 0 }] },
            { id: "q7", text: "7. Do you feel happy most of the time?", options: [{ label: "Yes", score: 0 }, { label: "No", score: 1 }] },
            { id: "q8", text: "8. Do you often feel helpless?", options: [{ label: "Yes", score: 1 }, { label: "No", score: 0 }] },
            { id: "q9", text: "9. Do you prefer to stay at home rather than going out?", options: [{ label: "Yes", score: 1 }, { label: "No", score: 0 }] },
            { id: "q10", text: "10. Do you feel you have more problems with memory than most?", options: [{ label: "Yes", score: 1 }, { label: "No", score: 0 }] },
            { id: "q11", text: "11. Do you think it is wonderful to be alive now?", options: [{ label: "Yes", score: 0 }, { label: "No", score: 1 }] },
            { id: "q12", text: "12. Do you feel pretty worthless the way you are now?", options: [{ label: "Yes", score: 1 }, { label: "No", score: 0 }] },
            { id: "q13", text: "13. Do you feel full of energy?", options: [{ label: "Yes", score: 0 }, { label: "No", score: 1 }] },
            { id: "q14", text: "14. Do you feel that your situation is hopeless?", options: [{ label: "Yes", score: 1 }, { label: "No", score: 0 }] },
            { id: "q15", text: "15. Do you think that most people are better off than you?", options: [{ label: "Yes", score: 1 }, { label: "No", score: 0 }] },
        ],
        interpretation: ["0-4: Normal", "5-9: Mild depression", "10-15: Moderate to severe depression"],
    },
    "Timed Up and Go (TUG)": {
        instructions: "Patient sits in a standard arm chair. On 'Go', patient stands, walks 3 meters (10 feet), turns, walks back, and sits down. Time with stopwatch.",
        questions: [
            { id: "time", text: "Time to complete (seconds):", options: [{ label: "< 10 seconds", score: 0 }, { label: "10-14 seconds", score: 1 }, { label: "15-20 seconds", score: 2 }, { label: "> 20 seconds", score: 3 }] },
            { id: "assistive", text: "Assistive device used?", options: [{ label: "None", score: 0 }, { label: "Cane", score: 1 }, { label: "Walker", score: 2 }] },
            { id: "unsteady", text: "Appeared unsteady during test?", options: [{ label: "No", score: 0 }, { label: "Slightly", score: 1 }, { label: "Yes, significant", score: 2 }] },
        ],
        interpretation: ["<10 sec: Normal mobility", "10-20 sec: Borderline, may have some mobility issues", ">20 sec: High fall risk, requires further evaluation", ">30 sec: Dependent mobility"],
    },
    "Katz Index of Independence in ADL": {
        instructions: "Score each activity. 1 point for independence, 0 for dependence.",
        questions: [
            { id: "bathing", text: "Bathing: Bathes self completely or needs help only with single body part", options: [{ label: "Independent", score: 1 }, { label: "Dependent", score: 0 }] },
            { id: "dressing", text: "Dressing: Gets clothes and dresses without assistance", options: [{ label: "Independent", score: 1 }, { label: "Dependent", score: 0 }] },
            { id: "toileting", text: "Toileting: Goes to toilet, uses it, arranges clothes without help", options: [{ label: "Independent", score: 1 }, { label: "Dependent", score: 0 }] },
            { id: "transferring", text: "Transferring: Moves in/out of bed and chair without assistance", options: [{ label: "Independent", score: 1 }, { label: "Dependent", score: 0 }] },
            { id: "continence", text: "Continence: Controls bladder and bowel completely", options: [{ label: "Independent", score: 1 }, { label: "Dependent", score: 0 }] },
            { id: "feeding", text: "Feeding: Gets food from plate to mouth without help", options: [{ label: "Independent", score: 1 }, { label: "Dependent", score: 0 }] },
        ],
        interpretation: ["6: Full function", "4-5: Moderate impairment", "2-3: Severe impairment", "0-1: Very severe impairment"],
    },
    "PHQ-9": {
        instructions: "Over the last 2 weeks, how often have you been bothered by the following problems?",
        questions: [
            { id: "q1", text: "1. Little interest or pleasure in doing things", options: [{ label: "Not at all", score: 0 }, { label: "Several days", score: 1 }, { label: "More than half the days", score: 2 }, { label: "Nearly every day", score: 3 }] },
            { id: "q2", text: "2. Feeling down, depressed, or hopeless", options: [{ label: "Not at all", score: 0 }, { label: "Several days", score: 1 }, { label: "More than half the days", score: 2 }, { label: "Nearly every day", score: 3 }] },
            { id: "q3", text: "3. Trouble falling/staying asleep, or sleeping too much", options: [{ label: "Not at all", score: 0 }, { label: "Several days", score: 1 }, { label: "More than half the days", score: 2 }, { label: "Nearly every day", score: 3 }] },
            { id: "q4", text: "4. Feeling tired or having little energy", options: [{ label: "Not at all", score: 0 }, { label: "Several days", score: 1 }, { label: "More than half the days", score: 2 }, { label: "Nearly every day", score: 3 }] },
            { id: "q5", text: "5. Poor appetite or overeating", options: [{ label: "Not at all", score: 0 }, { label: "Several days", score: 1 }, { label: "More than half the days", score: 2 }, { label: "Nearly every day", score: 3 }] },
            { id: "q6", text: "6. Feeling bad about yourself — or that you're a failure", options: [{ label: "Not at all", score: 0 }, { label: "Several days", score: 1 }, { label: "More than half the days", score: 2 }, { label: "Nearly every day", score: 3 }] },
            { id: "q7", text: "7. Trouble concentrating on things", options: [{ label: "Not at all", score: 0 }, { label: "Several days", score: 1 }, { label: "More than half the days", score: 2 }, { label: "Nearly every day", score: 3 }] },
            { id: "q8", text: "8. Moving or speaking slowly / being fidgety or restless", options: [{ label: "Not at all", score: 0 }, { label: "Several days", score: 1 }, { label: "More than half the days", score: 2 }, { label: "Nearly every day", score: 3 }] },
            { id: "q9", text: "9. Thoughts of self-harm or being better off dead", options: [{ label: "Not at all", score: 0 }, { label: "Several days", score: 1 }, { label: "More than half the days", score: 2 }, { label: "Nearly every day", score: 3 }] },
        ],
        interpretation: ["0-4: Minimal depression", "5-9: Mild depression", "10-14: Moderate depression", "15-19: Moderately severe depression", "20-27: Severe depression"],
    },
    "Clock Drawing Test": {
        instructions: "Ask patient to draw a clock showing a specific time (e.g., 10 past 11). Score based on the drawing.",
        questions: [
            { id: "circle", text: "Circle: Is the clock face reasonably circular?", options: [{ label: "Yes", score: 1 }, { label: "No", score: 0 }] },
            { id: "numbers", text: "Numbers: Are all 12 numbers present?", options: [{ label: "Yes", score: 1 }, { label: "No", score: 0 }] },
            { id: "sequence", text: "Sequence: Are numbers in correct clockwise order?", options: [{ label: "Yes", score: 1 }, { label: "No", score: 0 }] },
            { id: "hands", text: "Hands: Are both hour and minute hands present?", options: [{ label: "Yes", score: 1 }, { label: "No", score: 0 }] },
        ],
        interpretation: ["4: Normal", "3: Mild impairment", "0-2: Significant impairment - further evaluation needed"],
    },
    "Mini-Cog": {
        instructions: "Step 1: Ask patient to repeat 3 words. Step 2: Clock Drawing Test. Step 3: Ask patient to recall the 3 words.",
        questions: [
            { id: "word1", text: "Word Recall 1: Did patient recall first word?", options: [{ label: "Yes", score: 1 }, { label: "No", score: 0 }] },
            { id: "word2", text: "Word Recall 2: Did patient recall second word?", options: [{ label: "Yes", score: 1 }, { label: "No", score: 0 }] },
            { id: "word3", text: "Word Recall 3: Did patient recall third word?", options: [{ label: "Yes", score: 1 }, { label: "No", score: 0 }] },
            { id: "clock", text: "Clock Drawing: Is the clock normal (all numbers, correct time)?", options: [{ label: "Normal (2 pts)", score: 2 }, { label: "Abnormal (0 pts)", score: 0 }] },
        ],
        interpretation: ["4-5: Lower likelihood of dementia", "3: Possible cognitive impairment", "0-2: High likelihood of dementia - further evaluation needed"],
    },
    "Cornell Scale for Depression in Dementia": {
        instructions: "Interview both patient AND caregiver. Rate each item based on observations from the week prior to interview.",
        questions: [
            { id: "anxiety", text: "Anxiety: Anxious expression, ruminations, worrying", options: [{ label: "Absent", score: 0 }, { label: "Mild/Intermittent", score: 1 }, { label: "Severe", score: 2 }] },
            { id: "sadness", text: "Sadness: Sad expression, sad voice, tearfulness", options: [{ label: "Absent", score: 0 }, { label: "Mild/Intermittent", score: 1 }, { label: "Severe", score: 2 }] },
            { id: "pleasure", text: "Lack of Reactivity: Failure to react to pleasant events", options: [{ label: "Absent", score: 0 }, { label: "Mild/Intermittent", score: 1 }, { label: "Severe", score: 2 }] },
            { id: "irritability", text: "Irritability: Easily annoyed, short-tempered", options: [{ label: "Absent", score: 0 }, { label: "Mild/Intermittent", score: 1 }, { label: "Severe", score: 2 }] },
            { id: "agitation", text: "Agitation: Restlessness, hand-wringing, hair-pulling", options: [{ label: "Absent", score: 0 }, { label: "Mild/Intermittent", score: 1 }, { label: "Severe", score: 2 }] },
            { id: "retardation", text: "Retardation: Slow movements, speech, reactions", options: [{ label: "Absent", score: 0 }, { label: "Mild/Intermittent", score: 1 }, { label: "Severe", score: 2 }] },
            { id: "somatic", text: "Multiple Somatic Complaints", options: [{ label: "Absent", score: 0 }, { label: "Mild/Intermittent", score: 1 }, { label: "Severe", score: 2 }] },
            { id: "interest", text: "Loss of Interest: Less involved in usual activities", options: [{ label: "Absent", score: 0 }, { label: "Mild/Intermittent", score: 1 }, { label: "Severe", score: 2 }] },
            { id: "appetite", text: "Appetite Loss: Eating less than usual", options: [{ label: "Absent", score: 0 }, { label: "Mild/Intermittent", score: 1 }, { label: "Severe", score: 2 }] },
            { id: "weight", text: "Weight Loss: Lost weight in last month", options: [{ label: "Absent", score: 0 }, { label: "Mild/Intermittent", score: 1 }, { label: "Severe", score: 2 }] },
            { id: "energy", text: "Lack of Energy: Fatigues easily, unable to sustain activities", options: [{ label: "Absent", score: 0 }, { label: "Mild/Intermittent", score: 1 }, { label: "Severe", score: 2 }] },
            { id: "sleep", text: "Sleep Disturbance: Trouble falling asleep, multiple awakenings", options: [{ label: "Absent", score: 0 }, { label: "Mild/Intermittent", score: 1 }, { label: "Severe", score: 2 }] },
        ],
        interpretation: ["0-7: No significant depression", "8-10: Mild depression", "11-17: Moderate depression", "18+: Severe depression"],
    },
    "Berg Balance Scale": {
        instructions: "14-item scale assessing static balance and fall risk. Score each item 0-4.",
        questions: [
            { id: "sit-stand", text: "Sitting to Standing: Able to stand without using hands", options: [{ label: "4 - No hands", score: 4 }, { label: "3 - Uses hands", score: 3 }, { label: "2 - Several tries", score: 2 }, { label: "1 - Minimal assist", score: 1 }, { label: "0 - Mod/Max assist", score: 0 }] },
            { id: "standing", text: "Standing Unsupported: Stand safely for 2 minutes", options: [{ label: "4 - 2 min safely", score: 4 }, { label: "3 - 2 min supervised", score: 3 }, { label: "2 - 30 sec", score: 2 }, { label: "1 - Several tries", score: 1 }, { label: "0 - Unable", score: 0 }] },
            { id: "sitting", text: "Sitting Unsupported: Sit safely for 2 minutes", options: [{ label: "4 - 2 min safely", score: 4 }, { label: "3 - 2 min supervised", score: 3 }, { label: "2 - 30 sec", score: 2 }, { label: "1 - 10 sec", score: 1 }, { label: "0 - Unable", score: 0 }] },
            { id: "stand-sit", text: "Standing to Sitting: Sits safely with minimal use of hands", options: [{ label: "4 - No hands", score: 4 }, { label: "3 - Controls with hands", score: 3 }, { label: "2 - Uses back of legs", score: 2 }, { label: "1 - Sits independently", score: 1 }, { label: "0 - Needs assist", score: 0 }] },
            { id: "transfers", text: "Transfers: Able to transfer safely with minor use of hands", options: [{ label: "4 - No hands", score: 4 }, { label: "3 - Minor hand use", score: 3 }, { label: "2 - Verbal cues", score: 2 }, { label: "1 - One person assist", score: 1 }, { label: "0 - Two people", score: 0 }] },
            { id: "eyes-closed", text: "Standing with Eyes Closed: Stand 10 seconds safely", options: [{ label: "4 - 10 sec", score: 4 }, { label: "3 - 10 sec supervised", score: 3 }, { label: "2 - 3 sec", score: 2 }, { label: "1 - Unable but steady", score: 1 }, { label: "0 - Needs help", score: 0 }] },
            { id: "feet-together", text: "Feet Together: Stand with feet together for 1 minute", options: [{ label: "4 - 1 min", score: 4 }, { label: "3 - 1 min supervised", score: 3 }, { label: "2 - 30 sec", score: 2 }, { label: "1 - Needs help positioning", score: 1 }, { label: "0 - Unable", score: 0 }] },
        ],
        interpretation: ["45-56: Low fall risk", "21-44: Medium fall risk", "0-20: High fall risk"],
    },
    "STEADI Algorithm (CDC)": {
        instructions: "Stopping Elderly Accidents, Deaths & Injuries - Fall risk screening algorithm.",
        questions: [
            { id: "fallen", text: "Have you fallen in the past year?", options: [{ label: "No", score: 0 }, { label: "Yes, once", score: 1 }, { label: "Yes, 2+ times", score: 2 }] },
            { id: "unsteady", text: "Do you feel unsteady when standing or walking?", options: [{ label: "No", score: 0 }, { label: "Sometimes", score: 1 }, { label: "Often", score: 2 }] },
            { id: "worried", text: "Are you worried about falling?", options: [{ label: "No", score: 0 }, { label: "Sometimes", score: 1 }, { label: "Often", score: 2 }] },
            { id: "gait", text: "Gait Speed: Walk 4 meters at normal pace", options: [{ label: ">1 m/s (Normal)", score: 0 }, { label: "0.8-1 m/s (Slow)", score: 1 }, { label: "<0.8 m/s (Very slow)", score: 2 }] },
            { id: "tug", text: "Timed Up and Go result:", options: [{ label: "<12 sec", score: 0 }, { label: "12-14 sec", score: 1 }, { label: ">14 sec", score: 2 }] },
            { id: "chair", text: "30-Second Chair Stand: Number of stands", options: [{ label: "Age-appropriate", score: 0 }, { label: "Below average", score: 1 }, { label: "Unable/very low", score: 2 }] },
        ],
        interpretation: ["0-2: Low fall risk - provide education", "3-5: Moderate risk - assess gait, strength, balance", "6+: High risk - comprehensive assessment and intervention"],
    },
    "Morse Fall Scale": {
        instructions: "Rapid fall risk assessment for hospital/nursing home settings.",
        questions: [
            { id: "history", text: "History of falling (immediate or within 3 months)", options: [{ label: "No", score: 0 }, { label: "Yes", score: 25 }] },
            { id: "secondary", text: "Secondary diagnosis (2+ medical diagnoses)", options: [{ label: "No", score: 0 }, { label: "Yes", score: 15 }] },
            { id: "ambulatory", text: "Ambulatory aid", options: [{ label: "None/Bed rest/Nurse", score: 0 }, { label: "Crutches/Cane/Walker", score: 15 }, { label: "Furniture for support", score: 30 }] },
            { id: "iv", text: "IV therapy or heparin lock", options: [{ label: "No", score: 0 }, { label: "Yes", score: 20 }] },
            { id: "gait", text: "Gait/Transferring", options: [{ label: "Normal/Bedrest/Immobile", score: 0 }, { label: "Weak", score: 10 }, { label: "Impaired", score: 20 }] },
            { id: "mental", text: "Mental status", options: [{ label: "Oriented to own ability", score: 0 }, { label: "Overestimates/Forgets limitations", score: 15 }] },
        ],
        interpretation: ["0-24: Low risk (Standard precautions)", "25-44: Moderate risk (Implement fall prevention)", "45+: High risk (High-risk interventions required)"],
    },
    "Lawton IADL Scale": {
        instructions: "Assess Instrumental Activities of Daily Living. Score each activity.",
        questions: [
            { id: "phone", text: "Ability to Use Telephone", options: [{ label: "Operates independently", score: 1 }, { label: "Dials a few known numbers", score: 1 }, { label: "Answers but does not dial", score: 1 }, { label: "Does not use telephone", score: 0 }] },
            { id: "shopping", text: "Shopping", options: [{ label: "Shops independently", score: 1 }, { label: "Shops for small purchases", score: 0 }, { label: "Needs accompaniment", score: 0 }, { label: "Completely unable", score: 0 }] },
            { id: "food", text: "Food Preparation", options: [{ label: "Plans and prepares meals", score: 1 }, { label: "Prepares if supplied ingredients", score: 0 }, { label: "Heats and serves prepared meals", score: 0 }, { label: "Needs meals prepared", score: 0 }] },
            { id: "housekeeping", text: "Housekeeping", options: [{ label: "Maintains house alone", score: 1 }, { label: "Performs light daily tasks", score: 1 }, { label: "Needs help with all tasks", score: 0 }, { label: "Does not participate", score: 0 }] },
            { id: "laundry", text: "Laundry", options: [{ label: "Does laundry completely", score: 1 }, { label: "Washes small items", score: 1 }, { label: "All laundry done by others", score: 0 }] },
            { id: "transport", text: "Mode of Transportation", options: [{ label: "Travels independently", score: 1 }, { label: "Arranges own travel via taxi", score: 1 }, { label: "Uses public transport with assist", score: 1 }, { label: "Travels only with arrange", score: 0 }, { label: "Does not travel", score: 0 }] },
            { id: "meds", text: "Responsibility for Medications", options: [{ label: "Takes meds correctly", score: 1 }, { label: "Takes if prepared in advance", score: 0 }, { label: "Cannot take own meds", score: 0 }] },
            { id: "finances", text: "Ability to Handle Finances", options: [{ label: "Manages independently", score: 1 }, { label: "Manages day-to-day", score: 1 }, { label: "Unable to handle money", score: 0 }] },
        ],
        interpretation: ["8: High function (independent)", "4-7: Moderate function (needs some assistance)", "0-3: Low function (needs significant assistance)"],
    },
    "Barthel Index": {
        instructions: "Assess basic ADLs. Score each activity based on level of independence.",
        questions: [
            { id: "feeding", text: "Feeding", options: [{ label: "Independent", score: 10 }, { label: "Needs help cutting", score: 5 }, { label: "Dependent", score: 0 }] },
            { id: "bathing", text: "Bathing", options: [{ label: "Independent", score: 5 }, { label: "Dependent", score: 0 }] },
            { id: "grooming", text: "Grooming (face, hair, teeth, shaving)", options: [{ label: "Independent", score: 5 }, { label: "Needs help", score: 0 }] },
            { id: "dressing", text: "Dressing", options: [{ label: "Independent", score: 10 }, { label: "Needs help", score: 5 }, { label: "Dependent", score: 0 }] },
            { id: "bowels", text: "Bowel Control", options: [{ label: "Continent", score: 10 }, { label: "Occasional accident", score: 5 }, { label: "Incontinent", score: 0 }] },
            { id: "bladder", text: "Bladder Control", options: [{ label: "Continent", score: 10 }, { label: "Occasional accident", score: 5 }, { label: "Incontinent", score: 0 }] },
            { id: "toilet", text: "Toilet Use", options: [{ label: "Independent", score: 10 }, { label: "Needs some help", score: 5 }, { label: "Dependent", score: 0 }] },
            { id: "transfers", text: "Transfers (bed to chair)", options: [{ label: "Independent", score: 15 }, { label: "Minor help", score: 10 }, { label: "Major help", score: 5 }, { label: "Unable", score: 0 }] },
            { id: "mobility", text: "Mobility (on level surfaces)", options: [{ label: "Independent 50 yards", score: 15 }, { label: "With help 50 yards", score: 10 }, { label: "Wheelchair independent", score: 5 }, { label: "Immobile", score: 0 }] },
            { id: "stairs", text: "Stairs", options: [{ label: "Independent", score: 10 }, { label: "Needs help", score: 5 }, { label: "Unable", score: 0 }] },
        ],
        interpretation: ["80-100: Independent", "60-79: Minimal dependence", "40-59: Moderate dependence", "20-39: Severe dependence", "0-19: Total dependence"],
    },
    "Beers Criteria": {
        instructions: "Review patient medications against AGS Beers Criteria 2023 categories.",
        questions: [
            { id: "anticholinergics", text: "Anticholinergics (antihistamines, antispasmodics)", options: [{ label: "None identified", score: 0 }, { label: "1 medication", score: 1 }, { label: "2+ medications", score: 2 }] },
            { id: "benzos", text: "Benzodiazepines", options: [{ label: "None", score: 0 }, { label: "Short-acting PRN", score: 1 }, { label: "Regular use", score: 2 }] },
            { id: "nsaids", text: "NSAIDs (chronic use)", options: [{ label: "None/PRN only", score: 0 }, { label: "Regular use", score: 2 }] },
            { id: "ppis", text: "PPIs (>8 weeks without indication)", options: [{ label: "None or indicated", score: 0 }, { label: "Prolonged without clear indication", score: 1 }] },
            { id: "opioids", text: "Opioids with benzodiazepines", options: [{ label: "No combination", score: 0 }, { label: "Combined use", score: 2 }] },
            { id: "antipsychotics", text: "Antipsychotics in dementia", options: [{ label: "Not applicable", score: 0 }, { label: "Present", score: 2 }] },
            { id: "sulfonylureas", text: "Long-acting sulfonylureas (glipizide, glyburide)", options: [{ label: "None", score: 0 }, { label: "Present", score: 1 }] },
            { id: "muscle-relaxants", text: "Muscle Relaxants", options: [{ label: "None", score: 0 }, { label: "Present", score: 1 }] },
        ],
        interpretation: ["0: No Beers concerns identified", "1-3: Moderate concern - review medications", "4+: High concern - deprescribing review recommended"],
    },
    "STOPP/START Criteria": {
        instructions: "STOPP: Screening Tool of Older Persons' Prescriptions. START: Screening Tool to Alert to Right Treatment.",
        questions: [
            { id: "stopp-ppi", text: "STOPP: PPI at full dose >8 weeks", options: [{ label: "Not applicable", score: 0 }, { label: "Present - consider reducing", score: 1 }] },
            { id: "stopp-aspirin", text: "STOPP: Aspirin without cardiovascular disease", options: [{ label: "Indicated use", score: 0 }, { label: "Primary prevention only", score: 1 }] },
            { id: "stopp-duplicate", text: "STOPP: Duplicate drug classes", options: [{ label: "None identified", score: 0 }, { label: "Present", score: 1 }] },
            { id: "stopp-nsaid", text: "STOPP: NSAID with heart failure/CKD/hypertension", options: [{ label: "No concern", score: 0 }, { label: "Present", score: 2 }] },
            { id: "start-osteo", text: "START: Vitamin D/Calcium in osteoporosis", options: [{ label: "Present or not indicated", score: 0 }, { label: "Missing in osteoporosis", score: 1 }] },
            { id: "start-statin", text: "START: Statin in diabetes with CVD risk", options: [{ label: "Present or not indicated", score: 0 }, { label: "Missing with indication", score: 1 }] },
            { id: "start-acei", text: "START: ACE inhibitor in heart failure", options: [{ label: "Present or not indicated", score: 0 }, { label: "Missing with indication", score: 1 }] },
            { id: "start-vaccine", text: "START: Influenza/Pneumococcal vaccines", options: [{ label: "Up to date", score: 0 }, { label: "Not up to date", score: 1 }] },
        ],
        interpretation: ["0: No STOPP/START concerns", "1-3: Minor interventions recommended", "4+: Significant optimization opportunities"],
    },
    "Anticholinergic Burden Scale": {
        instructions: "Sum the anticholinergic scores for all current medications. Score 1-3 per medication.",
        questions: [
            { id: "score1-meds", text: "Score 1 meds (mild): hydrocortisone, ranitidine, fentanyl", options: [{ label: "0 medications", score: 0 }, { label: "1-2 medications", score: 2 }, { label: "3+ medications", score: 3 }] },
            { id: "score2-meds", text: "Score 2 meds (moderate): amantadine, carbamazepine, cyclobenzaprine", options: [{ label: "0 medications", score: 0 }, { label: "1 medication", score: 2 }, { label: "2+ medications", score: 4 }] },
            { id: "score3-meds", text: "Score 3 meds (high): amitriptyline, diphenhydramine, oxybutynin, paroxetine", options: [{ label: "0 medications", score: 0 }, { label: "1 medication", score: 3 }, { label: "2+ medications", score: 6 }] },
            { id: "symptoms", text: "Are anticholinergic symptoms present? (dry mouth, constipation, confusion, urinary retention)", options: [{ label: "No", score: 0 }, { label: "Mild", score: 1 }, { label: "Moderate/Severe", score: 2 }] },
        ],
        interpretation: ["0-2: Low anticholinergic burden", "3-5: Moderate burden - monitor for side effects", "6+: High burden - significant cognitive and fall risk"],
    },
    "High-Risk Fall Medications": {
        instructions: "Identify medications associated with increased fall risk in older adults.",
        questions: [
            { id: "sedatives", text: "Sedatives/Hypnotics (benzodiazepines, z-drugs)", options: [{ label: "None", score: 0 }, { label: "PRN use", score: 1 }, { label: "Daily use", score: 2 }] },
            { id: "antihypertensives", text: "Antihypertensives causing orthostatic hypotension", options: [{ label: "None/BP stable", score: 0 }, { label: "Present, symptomatic", score: 2 }] },
            { id: "opioids", text: "Opioid analgesics", options: [{ label: "None", score: 0 }, { label: "Low-dose/PRN", score: 1 }, { label: "Regular high-dose", score: 2 }] },
            { id: "antidepressants", text: "Antidepressants (especially TCAs, SSRIs)", options: [{ label: "None or well-tolerated", score: 0 }, { label: "Present", score: 1 }] },
            { id: "antipsychotics", text: "Antipsychotics", options: [{ label: "None", score: 0 }, { label: "Present", score: 2 }] },
            { id: "anticonvulsants", text: "Anticonvulsants causing sedation", options: [{ label: "None", score: 0 }, { label: "Present", score: 1 }] },
            { id: "polypharmacy", text: "Total medications >5", options: [{ label: "5 or fewer", score: 0 }, { label: "6-9 medications", score: 1 }, { label: "10+ medications", score: 2 }] },
        ],
        interpretation: ["0-2: Low medication-related fall risk", "3-5: Moderate risk - review medications", "6+: High risk - medication review and fall prevention essential"],
    },
};

// Geriatric reference data
const referenceCategories = [
    {
        id: "cognitive",
        title: "Cognitive Assessments",
        icon: Brain,
        color: "purple",
        items: [
            { title: "Mini-Mental State Examination (MMSE)", description: "30-point questionnaire for cognitive impairment screening", scoring: "24-30 = Normal, 19-23 = Mild, 10-18 = Moderate, <10 = Severe", link: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3532551/", hasAssessment: true },
            { title: "Montreal Cognitive Assessment (MoCA)", description: "Detects mild cognitive impairment, more sensitive than MMSE", scoring: "26+ = Normal, 18-25 = MCI, <18 = Significant impairment", link: "https://www.mocatest.org/", hasAssessment: true },
            { title: "Clock Drawing Test", description: "Quick screening for visuospatial and executive function", scoring: "4-point scale: 4 = Normal, <3 = Impairment suspected", link: null, hasAssessment: true },
            { title: "Mini-Cog", description: "3-minute dementia screening combining word recall and clock draw", scoring: "0-2 = High dementia risk, 3-5 = Lower risk", link: "https://mini-cog.com/", hasAssessment: true },
        ],
    },
    {
        id: "depression",
        title: "Depression Screening",
        icon: Heart,
        color: "pink",
        items: [
            { title: "Geriatric Depression Scale-15 (GDS-15)", description: "Self-report measure designed for older adults", scoring: "0-4 = Normal, 5-9 = Mild, 10-15 = Moderate/Severe", link: "https://web.stanford.edu/~yesavage/GDS.html", hasAssessment: true },
            { title: "PHQ-9", description: "9-item depression severity measure", scoring: "0-4 = Minimal, 5-9 = Mild, 10-14 = Moderate, 15-19 = Mod-Severe, 20+ = Severe", link: "https://www.phqscreeners.com/", hasAssessment: true },
            { title: "Cornell Scale for Depression in Dementia", description: "Depression assessment for patients with cognitive impairment", scoring: "Clinician-administered, considers caregiver input", link: null, hasAssessment: true },
        ],
    },
    {
        id: "fall-risk",
        title: "Fall Risk Assessment",
        icon: AlertTriangle,
        color: "amber",
        items: [
            { title: "Timed Up and Go (TUG)", description: "Measures mobility and fall risk", scoring: "<10s = Normal, 10-20s = Borderline, >20s = High risk", link: null, hasAssessment: true },
            { title: "Berg Balance Scale", description: "14-item objective measure of balance ability", scoring: "45-56 = Low risk, 21-44 = Medium, 0-20 = High fall risk", link: null, hasAssessment: true },
            { title: "STEADI Algorithm (CDC)", description: "Stopping Elderly Accidents, Deaths & Injuries toolkit", scoring: "Comprehensive fall prevention protocol", link: "https://www.cdc.gov/steadi/", hasAssessment: true },
            { title: "Morse Fall Scale", description: "Quick assessment for hospital/nursing home settings", scoring: "0-24 = Low, 25-44 = Moderate, 45+ = High risk", link: null, hasAssessment: true },
        ],
    },
    {
        id: "functional",
        title: "Functional Status",
        icon: FileText,
        color: "teal",
        items: [
            { title: "Katz Index of Independence in ADL", description: "Basic Activities of Daily Living assessment", scoring: "6 = Full function, 4 = Moderate, 2 or less = Severe impairment", link: null, hasAssessment: true },
            { title: "Lawton IADL Scale", description: "Instrumental Activities of Daily Living", scoring: "8 = High function, 0 = Low function (gender-adjusted)", link: null, hasAssessment: true },
            { title: "Barthel Index", description: "ADL and mobility assessment, 10 items", scoring: "80-100 = Independent, 60-79 = Minimal assistance, <60 = Dependent", link: null, hasAssessment: true },
        ],
    },
    {
        id: "medications",
        title: "Medication Safety",
        icon: Pill,
        color: "red",
        items: [
            { title: "Beers Criteria", description: "Potentially inappropriate medications for older adults", scoring: "Updated 2023 by American Geriatrics Society", link: "https://geriatricscareonline.org/ProductAbstract/american-geriatrics-society-beers-criteria-2023-update/CL001", hasAssessment: true },
            { title: "STOPP/START Criteria", description: "European screening tool for medication review", scoring: "STOPP = Meds to avoid, START = Meds to consider", link: null, hasAssessment: true },
            { title: "Anticholinergic Burden Scale", description: "Risk scoring for anticholinergic medications", scoring: "Score 3+ indicates significant cognitive risk", link: null, hasAssessment: true },
            { title: "High-Risk Fall Medications", description: "Medications associated with increased fall risk", scoring: "Sedatives, antihypertensives, opioids, antidepressants", link: null, hasAssessment: true },
        ],
    },
];

const geriatricCodes = [
    {
        code: "G0438",
        description: "Initial Annual Wellness Visit (IAWV)",
        details: "First-time Medicare AWV for new patients or those who haven't had one in the practice.",
        requirements: ["Health Risk Assessment", "Review of functional ability and safety", "Detection of cognitive impairment", "Personalized prevention plan"],
        time: "45-60 minutes typical",
        reimbursement: "~$175-$185"
    },
    {
        code: "G0439",
        description: "Subsequent Annual Wellness Visit",
        details: "Follow-up AWV for patients who have previously had an Initial AWV.",
        requirements: ["Update Health Risk Assessment", "Review and update prevention plan", "Cognitive and depression screening", "Advance care planning discussion"],
        time: "30-45 minutes typical",
        reimbursement: "~$125-$135"
    },
    {
        code: "99483",
        description: "Cognitive Assessment and Care Plan",
        details: "Comprehensive evaluation for patients with cognitive impairment. Can be billed same day as E/M.",
        requirements: ["Cognition-focused evaluation", "Functional assessment", "Safety evaluation", "Caregiver needs assessment", "Written care plan"],
        time: "50+ minutes required",
        reimbursement: "~$280-$300"
    },
    {
        code: "99490",
        description: "Chronic Care Management (20+ min)",
        details: "Non-face-to-face care coordination for patients with 2+ chronic conditions expected to last 12+ months.",
        requirements: ["2+ chronic conditions", "20+ minutes/month", "Comprehensive care plan", "Patient consent required"],
        time: "20+ minutes/month",
        reimbursement: "~$62-$65/month"
    },
    {
        code: "99491",
        description: "CCM by Clinical Staff (30+ min)",
        details: "CCM services provided personally by physician or qualified health professional.",
        requirements: ["30+ minutes by physician/QHP", "Direct patient management", "Care plan development/revision"],
        time: "30+ minutes/month",
        reimbursement: "~$85-$90/month"
    },
    {
        code: "99487",
        description: "Complex CCM (60+ min)",
        details: "For patients requiring substantially more complex medical decision-making.",
        requirements: ["60+ minutes/month", "Complex medical decisions", "Care team conferences", "Substantial care plan changes"],
        time: "60+ minutes/month",
        reimbursement: "~$135-$145/month"
    },
    {
        code: "96116",
        description: "Neurobehavioral Status Exam",
        details: "Clinical assessment of thinking, reasoning, and judgment with interpretation and report.",
        requirements: ["Face-to-face assessment", "Standardized instruments", "Clinical interpretation", "Written report"],
        time: "Per hour of face-to-face",
        reimbursement: "~$150-$165/hour"
    },
    {
        code: "96132",
        description: "Neuropsychological Testing Eval",
        details: "Evaluation of neuropsychological test results, integration of data, and clinical decision-making.",
        requirements: ["Test administration", "Score interpretation", "Integration with history", "Report generation"],
        time: "Per hour of service",
        reimbursement: "~$140-$155/hour"
    },
    {
        code: "G2211",
        description: "Complexity Add-on (Primary Care)",
        details: "Add-on for E/M visits involving ongoing care of serious or complex conditions.",
        requirements: ["Longitudinal relationship", "Serious/complex condition", "Ongoing care coordination", "Cannot bill with CCM same month"],
        time: "Add-on to E/M",
        reimbursement: "~$16-$18 (add-on)"
    },
    {
        code: "99497",
        description: "Advance Care Planning (first 30 min)",
        details: "Face-to-face discussion of advance directives with patient, family, or surrogate.",
        requirements: ["Voluntary patient participation", "Discussion of goals of care", "Review/completion of advance directives", "Documentation of discussion"],
        time: "First 30 minutes",
        reimbursement: "~$85-$95"
    },
    {
        code: "99498",
        description: "Advance Care Planning (each add'l 30 min)",
        details: "Additional time beyond initial 30 minutes for advance care planning discussions.",
        requirements: ["Add-on to 99497", "Additional 30 minutes", "Extended discussion documentation"],
        time: "Each additional 30 min",
        reimbursement: "~$75-$80 each"
    },
];

export default function GeriatricReferencesPage() {
    const [expandedCategory, setExpandedCategory] = useState<string | null>("cognitive");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedAssessment, setSelectedAssessment] = useState<string | null>(null);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [showResults, setShowResults] = useState(false);
    const [selectedCode, setSelectedCode] = useState<typeof geriatricCodes[0] | null>(null);

    const filteredCategories = referenceCategories.map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description.toLowerCase().includes(searchQuery.toLowerCase())
        ),
    })).filter(cat => cat.items.length > 0);

    const getColorClasses = (color: string) => {
        const colors: Record<string, { bg: string; text: string; border: string }> = {
            purple: { bg: "bg-purple-100 dark:bg-purple-900/40", text: "text-purple-600 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800" },
            pink: { bg: "bg-pink-100 dark:bg-pink-900/40", text: "text-pink-600 dark:text-pink-400", border: "border-pink-200 dark:border-pink-800" },
            amber: { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-600 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800" },
            teal: { bg: "bg-teal-100 dark:bg-teal-900/40", text: "text-teal-600 dark:text-teal-400", border: "border-teal-200 dark:border-teal-800" },
            red: { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-600 dark:text-red-400", border: "border-red-200 dark:border-red-800" },
        };
        return colors[color] || colors.purple;
    };

    const openAssessment = (title: string) => {
        if (assessmentContent[title]) {
            setSelectedAssessment(title);
            setAnswers({});
            setShowResults(false);
        }
    };

    const calculateScore = () => {
        return Object.values(answers).reduce((sum, score) => sum + score, 0);
    };

    const getInterpretation = (score: number, interpretations: string[]) => {
        for (const interp of interpretations) {
            const match = interp.match(/^(\d+)-?(\d*)\s*:?\s*(.*)/);
            if (match) {
                const min = parseInt(match[1]);
                const max = match[2] ? parseInt(match[2]) : min;
                if (score >= min && score <= max) return interp;
            }
            if (interp.startsWith("<") || interp.startsWith(">")) {
                const numMatch = interp.match(/[<>]=?\s*(\d+)/);
                if (numMatch) {
                    const threshold = parseInt(numMatch[1]);
                    if (interp.includes("<") && score < threshold) return interp;
                    if (interp.includes(">") && score > threshold) return interp;
                }
            }
        }
        return interpretations[interpretations.length - 1];
    };

    const [copied, setCopied] = useState(false);

    const copyResultsToClipboard = () => {
        if (!selectedAssessment) return;
        const score = calculateScore();
        const interpretation = getInterpretation(score, assessmentContent[selectedAssessment]?.interpretation || []);
        const date = new Date().toLocaleDateString();

        const resultText = `GERIATRIC ASSESSMENT RESULTS
Assessment: ${selectedAssessment}
Date: ${date}
Score: ${score}
Interpretation: ${interpretation}

Individual Responses:
${Object.entries(answers).map(([questionId, answerScore]) => {
            const question = assessmentContent[selectedAssessment]?.questions?.find(q => q.id === questionId);
            const selectedOption = question?.options?.find(o => o.score === answerScore);
            return `- ${question?.text?.split(':')[0] || questionId}: ${selectedOption?.label || answerScore}`;
        }).join('\n')}
`;

        navigator.clipboard.writeText(resultText).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-8">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-12 w-12 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                            <BookOpen className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                Geriatric Care References
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400">
                                Clinical tools, scoring guides, and billing codes for geriatric care
                            </p>
                        </div>
                    </div>
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search assessments and tools..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content - Assessment Tools */}
                    <div className="lg:col-span-2 space-y-4">
                        {(searchQuery ? filteredCategories : referenceCategories).map((category) => {
                            const colors = getColorClasses(category.color);
                            const Icon = category.icon;
                            const isExpanded = expandedCategory === category.id;

                            return (
                                <div
                                    key={category.id}
                                    className={`bg-white dark:bg-slate-900 rounded-2xl border ${colors.border} overflow-hidden`}
                                >
                                    <button
                                        onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
                                                <Icon className={`h-5 w-5 ${colors.text}`} />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="font-bold text-slate-900 dark:text-white">{category.title}</h3>
                                                <p className="text-xs text-slate-500">{category.items.length} tools</p>
                                            </div>
                                        </div>
                                        {isExpanded ? (
                                            <ChevronDown className="h-5 w-5 text-slate-400" />
                                        ) : (
                                            <ChevronRight className="h-5 w-5 text-slate-400" />
                                        )}
                                    </button>
                                    {isExpanded && (
                                        <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-4">
                                            {category.items.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => item.hasAssessment && openAssessment(item.title)}
                                                    className={`p-4 bg-slate-50 dark:bg-slate-800 rounded-xl ${item.hasAssessment ? 'cursor-pointer hover:ring-2 hover:ring-teal-500 transition-all' : ''}`}
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-semibold text-slate-900 dark:text-white">
                                                                {item.title}
                                                            </h4>
                                                            {item.hasAssessment && (
                                                                <span className="px-2 py-0.5 bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 text-[10px] font-bold rounded-full uppercase">
                                                                    Interactive
                                                                </span>
                                                            )}
                                                        </div>
                                                        {item.link && (
                                                            <a
                                                                href={item.link}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className={`p-1 rounded ${colors.text} hover:${colors.bg}`}
                                                            >
                                                                <ExternalLink className="h-4 w-4" />
                                                            </a>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                                        {item.description}
                                                    </p>
                                                    <div className={`px-3 py-2 rounded-lg ${colors.bg} ${colors.text} text-sm font-medium`}>
                                                        {item.scoring}
                                                    </div>
                                                    {item.hasAssessment && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openAssessment(item.title); }}
                                                            className="mt-3 w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                                                        >
                                                            <ClipboardList className="h-4 w-4" />
                                                            Start Assessment
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Sidebar - Billing Codes */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-teal-600" />
                                Geriatric CPT Codes
                            </h3>
                            <div className="space-y-2">
                                {geriatricCodes.map((code) => (
                                    <button
                                        key={code.code}
                                        onClick={() => setSelectedCode(code)}
                                        className="w-full flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors text-left group"
                                    >
                                        <span className="px-2 py-1 bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 text-xs font-mono font-bold rounded group-hover:bg-teal-200 dark:group-hover:bg-teal-800/50 transition-colors">
                                            {code.code}
                                        </span>
                                        <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
                                            {code.description}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl p-6 text-white">
                            <h3 className="font-bold mb-2">Quick Tip</h3>
                            <p className="text-sm opacity-90">
                                Use <strong>G2211</strong> complexity add-on code when providing
                                longitudinal care for patients with chronic conditions requiring
                                care coordination.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Assessment Modal */}
            {selectedAssessment && assessmentContent[selectedAssessment] && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-teal-50 dark:bg-teal-900/20">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                                    <ClipboardList className="h-5 w-5 text-teal-600" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-slate-900 dark:text-white">{selectedAssessment}</h2>
                                    <p className="text-xs text-slate-500">Interactive Assessment</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedAssessment(null)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {assessmentContent[selectedAssessment].instructions && (
                                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                                    <p className="text-sm text-blue-800 dark:text-blue-300">
                                        <strong>Instructions:</strong> {assessmentContent[selectedAssessment].instructions}
                                    </p>
                                </div>
                            )}

                            {!showResults ? (
                                <div className="space-y-6">
                                    {assessmentContent[selectedAssessment].questions?.map((q, idx) => (
                                        <div key={q.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                            <p className="font-medium text-slate-900 dark:text-white mb-3">{q.text}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {q.options?.map((opt) => (
                                                    <button
                                                        key={opt.label}
                                                        onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.score }))}
                                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${answers[q.id] === opt.score
                                                            ? 'bg-teal-600 text-white'
                                                            : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-teal-500'
                                                            }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="h-20 w-20 mx-auto rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center mb-4">
                                        <CheckCircle className="h-10 w-10 text-teal-600" />
                                    </div>
                                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                                        Score: {calculateScore()}
                                    </h3>
                                    <p className="text-lg text-teal-600 dark:text-teal-400 font-medium mb-6">
                                        {getInterpretation(calculateScore(), assessmentContent[selectedAssessment].interpretation || [])}
                                    </p>
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-left">
                                        <h4 className="font-bold text-slate-900 dark:text-white mb-2">Interpretation Guide:</h4>
                                        <ul className="space-y-1">
                                            {assessmentContent[selectedAssessment].interpretation?.map((interp, idx) => (
                                                <li key={idx} className="text-sm text-slate-600 dark:text-slate-400">• {interp}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Copy to Clipboard Button */}
                                    <button
                                        onClick={copyResultsToClipboard}
                                        className={`mt-6 w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${copied
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
                                            }`}
                                    >
                                        {copied ? (
                                            <>
                                                <ClipboardCheck className="h-4 w-4" />
                                                Copied to Clipboard!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-4 w-4" />
                                                Copy Results for Patient Chart
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex gap-3 justify-end">
                            <button
                                onClick={() => { setAnswers({}); setShowResults(false); }}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                Reset
                            </button>
                            {!showResults ? (
                                <button
                                    onClick={() => setShowResults(true)}
                                    disabled={Object.keys(answers).length === 0}
                                    className="px-6 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition-colors"
                                >
                                    Calculate Score
                                </button>
                            ) : (
                                <button
                                    onClick={() => setSelectedAssessment(null)}
                                    className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold transition-colors"
                                >
                                    Done
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* CPT Code Modal */}
            {selectedCode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                                    <span className="text-emerald-700 dark:text-emerald-400 font-mono font-bold text-sm">
                                        {selectedCode.code}
                                    </span>
                                </div>
                                <div>
                                    <h2 className="font-bold text-slate-900 dark:text-white">{selectedCode.description}</h2>
                                    <p className="text-xs text-slate-500">CPT/HCPCS Code</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedCode(null)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-5">
                            {/* Description */}
                            <div>
                                <p className="text-slate-700 dark:text-slate-300">{selectedCode.details}</p>
                            </div>

                            {/* Time & Reimbursement */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Clock className="h-4 w-4 text-blue-600" />
                                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Time</span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedCode.time}</p>
                                </div>
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                                    <div className="flex items-center gap-2 mb-1">
                                        <DollarSign className="h-4 w-4 text-emerald-600" />
                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Reimbursement</span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedCode.reimbursement}</p>
                                </div>
                            </div>

                            {/* Requirements */}
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                                <h4 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-teal-600" />
                                    Documentation Requirements
                                </h4>
                                <ul className="space-y-2">
                                    {selectedCode.requirements.map((req, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                                            <span className="h-1.5 w-1.5 rounded-full bg-teal-500 mt-2 shrink-0" />
                                            {req}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                            <button
                                onClick={() => setSelectedCode(null)}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

