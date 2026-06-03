// Canonical scale-id -> human label map. The sidecar's responses (scale
// projection, patient-assessment rows, assignment rows) carry only the
// scale_id; OG renders these labels so the UI never shows a raw id like
// "phq9". Keep ids in sync with the sidecar registry
// (chartspark-assessments/src/lib/scale-registry.ts). See
// planning/ASSESSMENTS-CONTRACT.md.

// Map (not a plain object) so dynamic-key lookups don't trip
// security/detect-object-injection and so iteration order is stable.
const SCALE_LABELS = new Map<string, string>([
  ["phq9", "PHQ-9 — Patient Health Questionnaire-9"],
  ["gad7", "GAD-7 — Generalized Anxiety Disorder-7"],
  ["cssrs", "C-SSRS — Columbia Suicide Severity Rating Scale"],
  ["auditc", "AUDIT-C — Alcohol Use Disorders Identification (Concise)"],
  ["cage", "CAGE — Alcohol Use Screen"],
  ["dast10", "DAST-10 — Drug Abuse Screening Test"],
  ["ace", "ACE — Adverse Childhood Experiences"],
  ["ciwaar", "CIWA-Ar — Clinical Institute Withdrawal Assessment (Alcohol)"],
  ["cows", "COWS — Clinical Opiate Withdrawal Scale"],
  ["dass21", "DASS-21 — Depression Anxiety Stress Scales"],
  ["pcl5", "PCL-5 — PTSD Checklist for DSM-5"],
  ["hama", "HAM-A — Hamilton Anxiety Rating Scale"],
  ["hamd", "HAM-D — Hamilton Depression Rating Scale (17-item)"],
  ["mdq", "MDQ — Mood Disorder Questionnaire"],
  ["asrs", "ASRS — Adult ADHD Self-Report Scale"],
]);

// Administer-dropdown order (rough clinical priority). These are exactly the
// scale ids the sidecar registry implements — no hyphens, no unimplemented
// scales. NOTE: `hamd` matches the prod DB CHECK value; the sidecar registry
// key is aligned to `hamd` in the separate #7 fix.
export const KNOWN_SCALE_IDS: readonly string[] = [
  "phq9",
  "gad7",
  "cssrs",
  "auditc",
  "cage",
  "dast10",
  "pcl5",
  "mdq",
  "ace",
  "asrs",
  "dass21",
  "hama",
  "hamd",
  "ciwaar",
  "cows",
];

/** Human label for a scale id; falls back to the raw id if unknown. */
export function scaleLabel(scaleId: string): string {
  return SCALE_LABELS.get(scaleId) ?? scaleId;
}
