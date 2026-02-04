import { Patient } from "./patients";

// Temporary in-memory store for newly created patients during demo
const newPatients: Patient[] = [];

export const addNewPatient = (patient: Patient) => {
    newPatients.push(patient);
};

export const getNewPatientById = (id: string): Patient | undefined => {
    return newPatients.find(p => p.id === id);
};

export const getAllNewPatients = (): Patient[] => {
    return [...newPatients];
};
