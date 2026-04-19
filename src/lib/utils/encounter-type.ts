export const ENCOUNTER_TYPE_VALUES = [
  "initial",
  "follow_up",
  "urgent",
  "telehealth",
  "medication_management",
  "crisis_intervention",
] as const;

export type EncounterType = (typeof ENCOUNTER_TYPE_VALUES)[number];

const ENCOUNTER_TYPE_LABELS: Record<EncounterType, string> = {
  initial: "Initial Evaluation",
  follow_up: "Follow-up Visit",
  urgent: "Urgent Visit",
  telehealth: "Telehealth Visit",
  medication_management: "Medication Management",
  crisis_intervention: "Crisis Intervention",
};

export function formatEncounterType(value: string | null | undefined): string {
  if (!value) return "Unknown";
  return ENCOUNTER_TYPE_LABELS[value as EncounterType] ?? value;
}
