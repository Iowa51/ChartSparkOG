// F-052: All monetary values are in CENTS (integers) to avoid floating-point errors
// CPT Code billing rates (approximate Medicare rates for demo)
export const cptRates: Record<string, { description: string; rate: number }> = {
    "99211": { description: "Office visit, minimal", rate: 2500 },
    "99212": { description: "Office visit, straightforward", rate: 5000 },
    "99213": { description: "Office visit, low complexity", rate: 9500 },
    "99214": { description: "Office visit, moderate complexity", rate: 14500 },
    "99215": { description: "Office visit, high complexity", rate: 21000 },
    "99204": { description: "New patient, moderate complexity", rate: 18500 },
    "99205": { description: "New patient, high complexity", rate: 24500 },
    "90791": { description: "Psychiatric diagnostic evaluation", rate: 22500 },
    "90792": { description: "Psych diagnostic eval with medical services", rate: 28000 },
    "90833": { description: "Psychotherapy add-on, 16 min", rate: 6500 },
    "90834": { description: "Individual psychotherapy, 45 min", rate: 14000 },
    "90837": { description: "Individual psychotherapy, 60 min", rate: 18500 },
    "90847": { description: "Family psychotherapy with patient", rate: 15000 },
};

// Calculate billing amount from CPT codes (returns cents)
export function calculateBillingAmount(cptCodes: string[]): number {
    return cptCodes.reduce((total, code) => {
        const rate = cptRates[code];
        return total + (rate ? rate.rate : 0);
    }, 0);
}

// Calculate platform fee (returns cents, integer math)
export function calculatePlatformFee(
    billingAmountCents: number,
    feePercentage: number = 1.0
): number {
    return Math.round(billingAmountCents * (feePercentage / 100));
}

// Get net amount after fee (returns cents)
export function calculateNetAmount(
    billingAmountCents: number,
    feeAmountCents: number
): number {
    return billingAmountCents - feeAmountCents;
}

// Format currency (takes cents, displays as dollars)
export function formatCurrency(amountCents: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(amountCents / 100);
}

// Fee breakdown type (all amounts in cents)
export interface FeeBreakdown {
    billingAmount: number;
    feePercentage: number;
    feeAmount: number;
    netAmount: number;
    codes: { code: string; description: string; rate: number }[];
}

// Generate fee breakdown (all amounts in cents)
export function generateFeeBreakdown(
    cptCodes: string[],
    feePercentage: number = 1.0
): FeeBreakdown {
    const codes = cptCodes.map((code) => ({
        code,
        description: cptRates[code]?.description || "Unknown",
        rate: cptRates[code]?.rate || 0,
    }));

    const billingAmount = calculateBillingAmount(cptCodes);
    const feeAmount = calculatePlatformFee(billingAmount, feePercentage);
    const netAmount = calculateNetAmount(billingAmount, feeAmount);

    return {
        billingAmount,
        feePercentage,
        feeAmount,
        netAmount,
        codes,
    };
}
