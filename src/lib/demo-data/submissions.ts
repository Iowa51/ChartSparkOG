export interface Submission {
    id: string;
    patientName: string;
    providerName: string;
    dateOfService: string;
    cptCodes: string[];
    icd10Codes: string[];
    billedAmount: number;
    status: 'Pending Approval' | 'Ready to Submit' | 'Submitted' | 'Paid' | 'Rejected';
    payer: string;
    notePreview: string;
}

export const submissions: Submission[] = [
    {
        id: "sub-001",
        patientName: "Sarah Connor",
        providerName: "Dr. Aris",
        dateOfService: "Oct 28, 2023",
        cptCodes: ["99214", "90833"],
        icd10Codes: ["F41.1", "F32.1"],
        billedAmount: 245.00,
        status: "Pending Approval",
        payer: "Empire BlueCross",
        notePreview: "Patient presents for follow-up of GAD. Reports stable mood, sleep improved. Medication tolerated well. MSE: Alert, oriented x4, mood euthymic, affect congruent..."
    },
    {
        id: "sub-002",
        patientName: "Michael Reese",
        providerName: "Dr. Aris",
        dateOfService: "Oct 27, 2023",
        cptCodes: ["99213"],
        icd10Codes: ["I10"],
        billedAmount: 150.00,
        status: "Ready to Submit",
        payer: "Aetna",
        notePreview: "Hypertension follow-up. Blood pressure 138/88. Patient compliant with Lisinopril. No side effects reported. Plan: Continue current regimen..."
    },
    {
        id: "sub-003",
        patientName: "Elena Fisher",
        providerName: "Dr. Aris",
        dateOfService: "Oct 25, 2023",
        cptCodes: ["99214"],
        icd10Codes: ["F41.1"],
        billedAmount: 185.00,
        status: "Paid",
        payer: "UnitedHealthcare",
        notePreview: "Follow-up for anxiety. Patient reports increased stress at work. Cognitive behavioral techniques reviewed. Progressing towards goals..."
    },
    {
        id: "sub-004",
        patientName: "Nathan Drake",
        providerName: "Dr. Aris",
        dateOfService: "Oct 22, 2023",
        cptCodes: ["99214"],
        icd10Codes: ["M54.5"],
        billedAmount: 210.00,
        status: "Rejected",
        payer: "Cigna",
        notePreview: "Chronic back pain evaluation. MRI shows mild disc bulge at L4-L5. Patient referred for physical therapy. Discussed pain management strategies..."
    },
    {
        id: "sub-005",
        patientName: "Victor Jones",
        providerName: "Dr. Aris",
        dateOfService: "Oct 20, 2023",
        cptCodes: ["99214"],
        icd10Codes: ["E78.5"],
        billedAmount: 195.00,
        status: "Submitted",
        payer: "Medicare",
        notePreview: "Hyperlipidemia follow-up. Lipid panel shows improvement. Patient counseling on diet and exercise. Refined Atorvastatin dosage..."
    }
];
