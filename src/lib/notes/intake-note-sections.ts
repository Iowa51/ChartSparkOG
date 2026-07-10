// Note auto-population from a signed intake (Sprint 2 / P3).
//
// A signed intake_submissions row carries a server-built `signed_snapshot`
// (SM-2): the reconciled problems/medications/allergies, all ROS rows, and the
// full responses JSONB. This pure module turns that snapshot into structured
// note sections (PMH / PSH / meds / allergies / FH / SH / ROS).
//
// NOTE-MODEL FINDING (reported, not forced): clinical_notes has SOAP columns
// (subjective/objective/assessment/plan) + a single `content` TEXT blob and NO
// discrete structured-section columns and NO JSONB sections. Rather than add a
// column nothing renders, we render the structured sections as markdown into
// `content` (with ## headings) and pre-fill `subjective` (history) + `assessment`
// (problem list). The provider edits; the note is created as a DRAFT and is
// NEVER auto-finalized (status stays 'draft').

export interface IntakeNoteSections {
  pmh: string;
  psh: string;
  medications: string;
  allergies: string;
  familyHistory: string;
  socialHistory: string;
  ros: string;
}

export interface IntakeNoteDraft {
  sections: IntakeNoteSections;
  /** Full structured markdown — persisted to clinical_notes.content. */
  content: string;
  /** History narrative — persisted to clinical_notes.subjective. */
  subjective: string;
  /** Reconciled problem list — persisted to clinical_notes.assessment. */
  assessment: string;
}

type Row = Record<string, unknown>;

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function asArray(v: unknown): Row[] {
  return Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Row[]) : [];
}
// The signed snapshot records ALL first-class rows WITH disposition (P3-CRIT-2),
// including provider-REJECTED ones. The clinical note must reflect only the
// accepted clinical picture, so rejected rows are excluded from the draft.
function accepted(rows: Row[]): Row[] {
  return rows.filter((r) => r.rejected !== true);
}
function bullet(lines: string[]): string {
  return lines
    .filter((l) => l.trim() !== "")
    .map((l) => `- ${l}`)
    .join("\n");
}

function problemsSection(problems: Row[]): string {
  return bullet(
    problems.map((p) => {
      const display = str(p.display) || str(p.code);
      const code = str(p.code);
      const system = str(p.code_system);
      return code && system ? `${display} (${system.toUpperCase()}: ${code})` : display;
    }),
  );
}

function surgeriesSection(responses: Row): string {
  const psh = (responses.psh as Row) ?? {};
  const rows = asArray((psh as Row).surgeries);
  return bullet(rows.map((r) => str((r.coded as Row)?.display) || str(r.detail)));
}

function medicationsSection(meds: Row[]): string {
  return bullet(
    meds.map((m) => {
      const name = str(m.name);
      const rx = str(m.rxnorm_code);
      const strength = str(m.strength);
      const parts = [name + (strength ? ` ${strength}` : "")];
      if (rx) parts.push(`(RxNorm ${rx})`);
      return parts.join(" ");
    }),
  );
}

function allergiesSection(allergies: Row[]): string {
  if (allergies.some((a) => a.nkda === true)) return "No known drug allergies (NKDA)";
  return bullet(
    allergies.map((a) => {
      const display = str(a.allergen_display) || str(a.allergen_code);
      const reaction = str(a.reaction);
      const severity = str(a.severity);
      let line = display;
      if (reaction) line += ` — ${reaction}`;
      if (severity) line += ` (${severity})`;
      return line;
    }),
  );
}

function familyHistorySection(responses: Row): string {
  const fh = (responses.family_history as Row) ?? {};
  const rows = asArray((fh as Row).family_history);
  return bullet(
    rows.map((r) => {
      const display = str((r.coded as Row)?.display) || str(r.detail);
      const relative = str(r.relative);
      return relative ? `${relative}: ${display}` : display;
    }),
  );
}

function socialHistorySection(responses: Row): string {
  const sh = (responses.social_history as Row) ?? {};
  const lines: string[] = [];
  if (str(sh.tobacco_status))
    lines.push(
      `Tobacco: ${str(sh.tobacco_status)}${sh.pack_years ? ` (${str(sh.pack_years)} pack-years)` : ""}`,
    );
  if (sh.alcohol_audit_c !== undefined && str(sh.alcohol_audit_c) !== "")
    lines.push(`Alcohol (AUDIT-C): ${str(sh.alcohol_audit_c)}`);
  if (str(sh.occupation)) lines.push(`Occupation: ${str(sh.occupation)}`);
  if (str(sh.living_situation)) lines.push(`Living situation: ${str(sh.living_situation)}`);
  return bullet(lines);
}

function rosSection(ros: Row[]): string {
  const positive = ros.filter((r) => r.finding === "positive").map((r) => str(r.system));
  const negative = ros.filter((r) => r.finding === "negative").map((r) => str(r.system));
  const lines: string[] = [];
  if (positive.length) lines.push(`Positive: ${positive.join(", ")}`);
  if (negative.length) lines.push(`Negative: ${negative.join(", ")}`);
  return lines.join("\n");
}

const SECTION_TITLES: Record<keyof IntakeNoteSections, string> = {
  pmh: "Past Medical History",
  psh: "Past Surgical History",
  medications: "Medications",
  allergies: "Allergies",
  familyHistory: "Family History",
  socialHistory: "Social History",
  ros: "Review of Systems",
};

function toMarkdown(keys: (keyof IntakeNoteSections)[], sections: IntakeNoteSections): string {
  return keys
    .map((k) => (sections[k].trim() === "" ? "" : `## ${SECTION_TITLES[k]}\n${sections[k]}`))
    .filter((s) => s !== "")
    .join("\n\n");
}

/**
 * Build a draft note from a signed intake snapshot. Pure — no I/O. The caller
 * persists the returned fields into a DRAFT clinical_notes row.
 */
export function buildIntakeNoteDraft(signedSnapshot: unknown): IntakeNoteDraft {
  const snap = (signedSnapshot && typeof signedSnapshot === "object" ? signedSnapshot : {}) as Row;
  const responses = (
    snap.responses && typeof snap.responses === "object" ? snap.responses : {}
  ) as Row;
  const problems = accepted(asArray(snap.problems));

  const sections: IntakeNoteSections = {
    pmh: problemsSection(problems),
    psh: surgeriesSection(responses),
    medications: medicationsSection(accepted(asArray(snap.medications))),
    allergies: allergiesSection(accepted(asArray(snap.allergies))),
    familyHistory: familyHistorySection(responses),
    socialHistory: socialHistorySection(responses),
    ros: rosSection(asArray(snap.ros)),
  };

  const content = toMarkdown(
    ["pmh", "psh", "medications", "allergies", "familyHistory", "socialHistory", "ros"],
    sections,
  );
  // History-flavored sections seed the SOAP `subjective`; the reconciled problem
  // list seeds `assessment`. Both remain fully editable by the provider.
  const subjective = toMarkdown(["pmh", "psh", "familyHistory", "socialHistory", "ros"], sections);
  const assessment = sections.pmh.trim() === "" ? "" : `Problem list:\n${sections.pmh}`;

  return { sections, content, subjective, assessment };
}
