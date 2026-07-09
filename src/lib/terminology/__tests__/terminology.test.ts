// Unit tests for the terminology proxy response shaping. The external JSON
// shapes are error-prone, so we lock the mapping (and the fail-soft path) here.

import { describe, it, expect, vi, beforeEach } from "vitest";

const { fetchWithTimeout } = vi.hoisted(() => ({ fetchWithTimeout: vi.fn() }));
vi.mock("@/lib/utils/fetch-with-timeout", () => ({ fetchWithTimeout }));

import { searchRxNorm } from "@/lib/terminology/rxnav";
import { searchIcd10 } from "@/lib/terminology/clinical-tables";
import { searchAllergens } from "@/lib/terminology/allergens";
import { isTerminologySystem } from "@/lib/terminology/types";

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 502, json: async () => body } as unknown as Response;
}

beforeEach(() => fetchWithTimeout.mockReset());

describe("isTerminologySystem", () => {
  it("accepts only the allowlisted systems", () => {
    expect(isTerminologySystem("rxnorm")).toBe(true);
    expect(isTerminologySystem("icd10")).toBe(true);
    expect(isTerminologySystem("allergen")).toBe(true);
    expect(isTerminologySystem("users")).toBe(false);
  });
});

describe("searchAllergens (curated, pure)", () => {
  it("matches case-insensitively", () => {
    const res = searchAllergens("pen");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.results.some((r) => r.display === "Penicillin")).toBe(true);
      expect(res.results.every((r) => r.system === "allergen")).toBe(true);
    }
  });

  it("returns nothing for a non-match", () => {
    const res = searchAllergens("zzzznotanallergen");
    expect(res.ok && res.results).toEqual([]);
  });
});

describe("searchRxNorm", () => {
  it("maps + dedupes RxNav drug concepts", async () => {
    fetchWithTimeout.mockResolvedValue(
      jsonResponse({
        drugGroup: {
          conceptGroup: [
            { tty: "SBD", conceptProperties: [{ rxcui: "860975", name: "Metformin 500 MG" }] },
            {
              tty: "SCD",
              conceptProperties: [
                { rxcui: "860975", name: "dup" },
                { rxcui: "999", name: "Other" },
              ],
            },
          ],
        },
      }),
    );
    const res = await searchRxNorm("metformin");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.results).toEqual([
        { code: "860975", display: "Metformin 500 MG", system: "rxnorm" },
        { code: "999", display: "Other", system: "rxnorm" },
      ]);
    }
  });

  it("fails soft when the upstream returns a non-2xx", async () => {
    fetchWithTimeout.mockResolvedValue(jsonResponse(null, false));
    const res = await searchRxNorm("x");
    expect(res.ok).toBe(false);
  });
});

describe("searchIcd10", () => {
  it("maps the Clinical Tables tuple response", async () => {
    fetchWithTimeout.mockResolvedValue(
      jsonResponse([
        2,
        ["E11.9", "I10"],
        null,
        [
          ["E11.9", "Type 2 diabetes"],
          ["I10", "Hypertension"],
        ],
      ]),
    );
    const res = await searchIcd10("diab");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.results).toEqual([
        { code: "E11.9", display: "Type 2 diabetes", system: "icd10" },
        { code: "I10", display: "Hypertension", system: "icd10" },
      ]);
    }
  });

  it("returns [] (ok) when the upstream shape is empty", async () => {
    fetchWithTimeout.mockResolvedValue(jsonResponse([0, [], null, []]));
    const res = await searchIcd10("zzz");
    expect(res.ok && res.results).toEqual([]);
  });
});
