export interface Encounter {
    id: string;
    patientId: string;
    type: string;
    date: string;
    time: string;
    status: "In Progress" | "Scheduled" | "Completed";
    provider: string;
    chiefComplaint: string;
    vitals?: {
        bp: string;
        hr: string;
        temp: string;
        rr: string;
        spo2: string;
    };
    noteId?: string;
}

export const encounters: Encounter[] = [
    {
        id: "e1",
        patientId: "p1",
        type: "Follow-up Visit",
        date: "Oct 28, 2023",
        time: "10:30 AM",
        status: "In Progress",
        provider: "Dr. Sarah K.",
        chiefComplaint: "Blood pressure review",
        vitals: {
            bp: "135/85",
            hr: "72",
            temp: "98.6",
            rr: "16",
            spo2: "98%"
        },
        noteId: "n1"
    },
    {
        id: "e2",
        patientId: "p4", // Nathan Drake
        type: "Initial Consultation",
        date: "Oct 28, 2023",
        time: "11:00 AM",
        status: "Scheduled",
        provider: "Dr. Sarah K.",
        chiefComplaint: "New patient evaluation"
    },
    {
        id: "e3",
        patientId: "p3", // Elena Fisher
        type: "Medication Review",
        date: "Oct 27, 2023",
        time: "2:30 PM",
        status: "Completed",
        provider: "Dr. Sarah K.",
        chiefComplaint: "Anxiety medication adjustment",
        vitals: {
            bp: "120/80",
            hr: "68",
            temp: "98.4",
            rr: "14",
            spo2: "99%"
        },
        noteId: "n2"
    },
    {
        id: "e4",
        patientId: "p2", // Michael Reese
        type: "Follow-up Visit",
        date: "Oct 27, 2023",
        time: "9:00 AM",
        status: "Completed",
        provider: "Dr. Sarah K.",
        chiefComplaint: "Diabetes management",
        vitals: {
            bp: "128/82",
            hr: "75",
            temp: "98.2",
            rr: "18",
            spo2: "97%"
        },
        noteId: "n3"
    },
    {
        id: "e5",
        patientId: "p5", // Victor Jones
        type: "Initial Consultation",
        date: "Oct 29, 2023",
        time: "3:00 PM",
        status: "Scheduled",
        provider: "Dr. Sarah K.",
        chiefComplaint: "Depression screening"
    }
];

export const getEncountersByPatientId = (patientId: string) =>
    encounters.filter(e => e.patientId === patientId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export const getEncounterById = (id: string) => encounters.find(e => e.id === id);
