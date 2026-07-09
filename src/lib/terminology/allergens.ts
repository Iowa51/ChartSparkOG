// Curated common-allergen list (P2). Free text is always allowed too (the picker
// falls back), and NKDA is a separate boolean. allergen_code is nullable in the
// schema; these curated codes are convenience slugs replaced by proper coded
// allergens (RxNorm/UNII/SNOMED) at P3 reconciliation / P4.

import type { TerminologyResult, CodedValue } from "./types";

interface CuratedAllergen {
  code: string;
  display: string;
  type: "drug" | "food" | "environmental";
}

export const CURATED_ALLERGENS: CuratedAllergen[] = [
  { code: "penicillin", display: "Penicillin", type: "drug" },
  { code: "amoxicillin", display: "Amoxicillin", type: "drug" },
  { code: "cephalosporins", display: "Cephalosporins", type: "drug" },
  { code: "sulfa", display: "Sulfa drugs (sulfonamides)", type: "drug" },
  { code: "aspirin", display: "Aspirin", type: "drug" },
  { code: "nsaids", display: "NSAIDs (ibuprofen, naproxen)", type: "drug" },
  { code: "codeine", display: "Codeine", type: "drug" },
  { code: "morphine", display: "Morphine", type: "drug" },
  { code: "iodine_contrast", display: "Iodine / contrast dye", type: "drug" },
  { code: "peanut", display: "Peanuts", type: "food" },
  { code: "tree_nuts", display: "Tree nuts", type: "food" },
  { code: "shellfish", display: "Shellfish", type: "food" },
  { code: "fish", display: "Fish", type: "food" },
  { code: "eggs", display: "Eggs", type: "food" },
  { code: "milk", display: "Milk / dairy", type: "food" },
  { code: "soy", display: "Soy", type: "food" },
  { code: "wheat_gluten", display: "Wheat / gluten", type: "food" },
  { code: "sesame", display: "Sesame", type: "food" },
  { code: "latex", display: "Latex", type: "environmental" },
  { code: "bee_sting", display: "Bee / wasp stings", type: "environmental" },
  { code: "pollen", display: "Pollen", type: "environmental" },
  { code: "dust_mites", display: "Dust mites", type: "environmental" },
  { code: "pet_dander", display: "Pet dander", type: "environmental" },
  { code: "mold", display: "Mold", type: "environmental" },
];

export function searchAllergens(query: string): TerminologyResult {
  const q = query.trim().toLowerCase();
  const results: CodedValue[] = CURATED_ALLERGENS.filter((a) =>
    a.display.toLowerCase().includes(q),
  ).map((a) => ({
    code: a.code,
    display: a.display,
    system: "allergen",
  }));
  return { ok: true, results };
}
