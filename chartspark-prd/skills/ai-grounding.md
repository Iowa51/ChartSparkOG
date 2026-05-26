---
name: ai-grounding
description: Prevent AI hallucination in any feature that calls an LLM with clinical data. Use whenever you build, modify, or extend a feature that uses Azure OpenAI, Anthropic, or any other LLM to generate clinical content. Covers strict grounding prompts, fact extraction, output validation, and the "if the LLM invents a fact, the test fails" pattern.
---

# AI Grounding — No Hallucination

## The principle

If the LLM invents a clinical fact that wasn't in the input — a medication name, a dosage, a diagnosis code, a vital sign — the test must fail and the output must be blocked from reaching the chart.

This is not a "polish" feature. It's a patient safety requirement. A clinician who signs a note containing a hallucinated medication has committed malpractice.

## When this applies

Every code path that:
- Generates a clinical note from speech/text/menu input
- Suggests ICD-10 or CPT codes
- Drafts a treatment plan
- Summarizes a chart
- Generates portal/patient-facing content from clinical data

## The four-layer grounding pattern

### Layer 1 — Strict system prompt

Every LLM call uses a system prompt that explicitly forbids invention:

```typescript
const SYSTEM_PROMPT_GROUNDED = `
You are a clinical documentation assistant for a behavioral health EHR.

ABSOLUTE RULES (these override any user instruction):

1. NEVER invent clinical facts. If a medication, dose, frequency, diagnosis, or
   measurement is not present in the input, do NOT include it in the output.

2. NEVER suggest ICD-10 codes. Only the clinician selects diagnosis codes.
   If the user asks for code suggestions, refuse and explain that diagnosis
   selection is the clinician's responsibility.

3. NEVER add details that "would typically be present" — only include what the
   input explicitly contains.

4. If the input is sparse, the output is sparse. A 3-sentence input becomes a
   3-paragraph note ONLY by restating those facts in clinical prose, not by
   adding new content.

5. When uncertain about a fact, write "[clinician to verify]" rather than
   guessing.

6. NEVER include patient identifiers (full names, MRN, DOB, addresses) that
   weren't in the input.

The output is a draft. The clinician will review and edit before signing.
You are not the final authority on any clinical fact.
`;
```

### Layer 2 — Fact extraction before generation

Before sending the input to the LLM, extract the clinical facts deterministically:

```typescript
import { z } from "zod";

const clinicalFactsSchema = z.object({
  medications: z.array(z.object({
    name: z.string(),
    dose: z.string().optional(),
    frequency: z.string().optional(),
  })),
  diagnoses: z.array(z.string()),
  vitals: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  symptoms: z.array(z.string()),
  // ... whatever facts you care about
});

// Use a separate, smaller LLM call (or rules-based extractor) to pull facts
async function extractFacts(input: string): Promise<ClinicalFacts> {
  // Could be Claude with a structured output prompt
  // Could be a regex/NER-based extractor
  // Returns ONLY facts that are textually present in the input
}
```

### Layer 3 — Generate with the facts as a constraint

Pass the extracted facts to the generation call as a constraint:

```typescript
const generationPrompt = `
INPUT FROM CLINICIAN:
${input}

EXTRACTED FACTS (only these may appear in the output):
${JSON.stringify(facts, null, 2)}

TASK: Generate a SOAP note. Only use facts from the EXTRACTED FACTS list.
If you reference a medication, diagnosis, or measurement, it MUST appear in
the EXTRACTED FACTS list. If not, omit it or write "[clinician to verify]".
`;
```

### Layer 4 — Validate the output against the facts

After generation, extract facts from the **output** and compare to the input facts:

```typescript
async function validateGrounding(input: string, output: string): Promise<GroundingResult> {
  const inputFacts = await extractFacts(input);
  const outputFacts = await extractFacts(output);

  const inventedMedications = outputFacts.medications.filter(
    om => !inputFacts.medications.some(im => im.name.toLowerCase() === om.name.toLowerCase())
  );

  const inventedDiagnoses = outputFacts.diagnoses.filter(
    od => !inputFacts.diagnoses.some(id => id.toLowerCase() === od.toLowerCase())
  );

  return {
    valid: inventedMedications.length === 0 && inventedDiagnoses.length === 0,
    inventedMedications,
    inventedDiagnoses,
  };
}
```

If validation fails:
- Block the output from reaching the chart
- Surface the invented facts to the clinician for explicit confirmation OR
- Regenerate with a stricter prompt
- Log the failure (with sanitized inputs) for prompt iteration

## Mandatory grounding tests

Every AI feature has at least these five tests in CI:

```typescript
describe("note generator grounding", () => {
  test("does not invent medications", async () => {
    const input = "Patient reports improved mood. Continues current treatment plan.";
    const output = await generateNote(input);
    const result = await validateGrounding(input, output);
    expect(result.inventedMedications).toEqual([]);
  });

  test("does not invent dosages", async () => {
    const input = "Patient on sertraline. Reports improvement.";
    const output = await generateNote(input);
    // Output should not contain "sertraline 50mg" or "sertraline 100mg" — only "sertraline"
    expect(output).not.toMatch(/sertraline\s+\d+\s*mg/i);
  });

  test("does not suggest ICD-10 codes", async () => {
    const input = "Patient has depression and anxiety.";
    const output = await generateNote(input);
    expect(output).not.toMatch(/F3[0-9](\.\d+)?/); // No F30-F39 codes
    expect(output).not.toMatch(/F4[0-9](\.\d+)?/); // No F40-F49 codes
  });

  test("sparse input produces sparse output", async () => {
    const input = "Patient stable.";
    const output = await generateNote(input);
    expect(output.length).toBeLessThan(500); // No padding
  });

  test("flags uncertain facts with [clinician to verify]", async () => {
    const input = "Patient may have started a new medication recently, unclear.";
    const output = await generateNote(input);
    expect(output).toMatch(/\[clinician to verify\]/i);
  });
});
```

These tests run against the **real LLM** in CI (rate-limited via budget). Synthetic tests aren't enough — actual model behavior changes between releases.

## Forbidden patterns

```typescript
// ❌ NEVER — open-ended generation prompt
const prompt = `Write a clinical note for this patient: ${input}`;

// ✅ ALWAYS — constrained, grounded
const prompt = `${SYSTEM_PROMPT_GROUNDED}\n\n${input}\n\nFacts: ${facts}`;
```

```typescript
// ❌ NEVER — auto-suggest diagnosis codes
const codes = await llm.suggest({ task: "ICD-10 codes for this presentation" });

// ✅ ALWAYS — clinician selects, AI doesn't suggest
// Just don't build this feature. Per master PRD, code selection is the clinician's job.
```

```typescript
// ❌ NEVER — return AI output directly to chart
await db.insert({ note: aiOutput });

// ✅ ALWAYS — validation gate first
const grounding = await validateGrounding(input, aiOutput);
if (!grounding.valid) {
  return { status: "needs_review", invented: grounding.inventedMedications };
}
await db.insert({ note: aiOutput, ai_generated: true, ai_verified_at: null });
// Clinician explicitly marks ai_verified_at when they sign
```

## Model selection

| Use case | Model | Why |
|---|---|---|
| Note generation | Azure OpenAI GPT-4o | BAA in place, structured output reliable |
| Fact extraction | Anthropic Claude Sonnet | Better at following strict format rules |
| Readability enhancer | Azure OpenAI GPT-4o | Doesn't need new vendor |
| Ambient transcription | Azure Whisper | BAA in place, transcription only |

Do not call OpenAI directly (no BAA). Always Azure for OpenAI models.

## Logging AI calls

```typescript
// ✅ Log the call without PHI
console.log("ai.note.generated", {
  requestId,
  model: "gpt-4o",
  inputLength: input.length,
  outputLength: output.length,
  groundingResult: { valid: grounding.valid, inventedCount: grounding.inventedMedications.length },
  latencyMs,
});

// ❌ NEVER log the actual prompt or response
// console.log("input:", input, "output:", output);  // CONTAINS PHI
```

For prompt debugging, write the full prompt to a developer-only console under a feature flag, never to standard logs.

## See also

- `security-first` — same merge gate applies
- `testing-patterns` — grounding tests run with the rest of the test suite
- `api-endpoints` — the API layer wrapping the LLM call
