// CPT Code billing rates (approximate Medicare rates for demo)
export const cptRates: Record<string, { description: string; rate: number }> = {
    "99211": { description: "Office visit, minimal", rate: 25.00 },
    "99212": { description: "Office visit, straightforward", rate: 50.00 },
    "99213": { description: "Office visit, low complexity", rate: 95.00 },
    "99214": { description: "Office visit, moderate complexity", rate: 145.00 },
    "99215": { description: "Office visit, high complexity", rate: 210.00 },
    "99204": { description: "New patient, moderate complexity", rate: 185.00 },
    "99205": { description: "New patient, high complexity", rate: 245.00 },
    "90791": { description: "Psychiatric diagnostic evaluation", rate: 225.00 },
    "90792": { description: "Psych diagnostic eval with medical services", rate: 280.00 },
    "90833": { description: "Psychotherapy add-on, 16 min", rate: 65.00 },
    "90834": { description: "Individual psychotherapy, 45 min", rate: 140.00 },
    "90837": { description: "Individual psychotherapy, 60 min", rate: 185.00 },
    "90847": { description: "Family psychotherapy with patient", rate: 150.00 },
};

// Calculate billing amount from CPT codes
export function calculateBillingAmount(cptCodes: string[]): number {
    return cptCodes.reduce((total, code) => {
        const rate = cptRates[code];
        return total + (rate ? rate.rate : 0);
    }, 0);
}

// Calculate platform fee
export function calculatePlatformFee(
    billingAmount: number,
    feePercentage: number = 1.0
): number {
    return Math.round(billingAmount * (feePercentage / 100) * 100) / 100;
}

// Get net amount after fee
export function calculateNetAmount(
    billingAmount: number,
    feeAmount: number
): number {
    return Math.round((billingAmount - feeAmount) * 100) / 100;
}

// Format currency
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(amount);
}

// Fee breakdown type
export interface FeeBreakdown {
    billingAmount: number;
    feePercentage: number;
    feeAmount: number;
    netAmount: number;
    codes: { code: string; description: string; rate: number }[];
}

// Generate fee breakdown
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
