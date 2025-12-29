export interface Patient {
    id: string;
    name: string;
    initials: string;
    gender: string;
    mrn: string;
    dob: string;
    status: "Active" | "Inactive" | "Pending";
    lastVisit: string;
    avatarColor: string;
    email: string;
    phone: string;
    address: string;
    allergies: string[];
    medications: string[];
    problems: string[];
    insurance: {
        provider: string;
        policyNumber: string;
        groupNumber: string;
    };
}

export const patients: Patient[] = [
    {
        id: "p1",
        name: "Sarah Connor",
        initials: "SC",
        gender: "Female",
        mrn: "#883-921",
        dob: "Jan 14, 1984",
        status: "Active",
        lastVisit: "Oct 22, 2023",
        avatarColor: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300",
        email: "sarah.c@gmail.com",
        phone: "(555) 123-4567",
        address: "123 Cyberdyne Wy, Los Angeles, CA 90210",
        allergies: ["Penicillin", "Sulfa"],
        medications: ["Lisinopril 10mg", "Metformin 500mg"],
        problems: ["Hypertension", "Type 2 Diabetes"],
        insurance: {
            provider: "Empire BlueCross",
            policyNumber: "POL-992811",
            groupNumber: "GRP-5542",
        }
    },
    {
        id: "p2",
        name: "Michael Reese",
        initials: "MR",
        gender: "Male",
        mrn: "#442-109",
        dob: "May 02, 1990",
        status: "Inactive",
        lastVisit: "Sep 15, 2023",
        avatarColor: "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300",
        email: "m.reese@outlook.com",
        phone: "(555) 987-6543",
        address: "456 Tech Plaza, San Francisco, CA 94105",
        allergies: ["Latex"],
        medications: [],
        problems: ["Seasonal Allergies"],
        insurance: {
            provider: "Aetna",
            policyNumber: "AET-77112",
            groupNumber: "GRP-9001",
        }
    },
    {
        id: "p3",
        name: "Elena Fisher",
        initials: "EF",
        gender: "Female",
        mrn: "#992-441",
        dob: "Nov 12, 1988",
        status: "Active",
        lastVisit: "Today, 9:00 AM",
        avatarColor: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300",
        email: "elena.f@journalism.com",
        phone: "(555) 443-2211",
        address: "789 Drake Dr, Seattle, WA 98101",
        allergies: ["None"],
        medications: ["Sertraline 50mg"],
        problems: ["Generalized Anxiety Disorder"],
        insurance: {
            provider: "UnitedHealthcare",
            policyNumber: "UHC-00992",
            groupNumber: "GRP-3321",
        }
    },
    {
        id: "p4",
        name: "Nathan Drake",
        initials: "ND",
        gender: "Male",
        mrn: "#771-002",
        dob: "Feb 14, 1980",
        status: "Active",
        lastVisit: "Aug 10, 2023",
        avatarColor: "bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300",
        email: "nathan.d@adventures.com",
        phone: "(555) 888-7777",
        address: "321 Fortune Ln, Miami, FL 33101",
        allergies: ["Pollen"],
        medications: [],
        problems: ["Chronic Back Pain"],
        insurance: {
            provider: "Cigna",
            policyNumber: "CIG-44332",
            groupNumber: "GRP-7788",
        }
    },
    {
        id: "p5",
        name: "Victor Jones",
        initials: "VJ",
        gender: "Male",
        mrn: "#112-998",
        dob: "Mar 22, 1965",
        status: "Pending",
        lastVisit: "--",
        avatarColor: "bg-teal-100 text-teal-600 dark:bg-teal-900 dark:text-teal-300",
        email: "v.jones@business.com",
        phone: "(555) 111-2222",
        address: "555 Executive Way, New York, NY 10001",
        allergies: ["Shellfish"],
        medications: ["Atorvastatin 20mg"],
        problems: ["High Cholesterol"],
        insurance: {
            provider: "Medicare",
            policyNumber: "MED-112233",
            groupNumber: "N/A",
        }
    }
];

export const getPatientById = (id: string) => patients.find(p => p.id === id);
