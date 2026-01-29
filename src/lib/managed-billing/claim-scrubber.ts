/**
 * Claim Scrubber Engine
 * 
 * Performs real-time validation of billing data before submission
 * to minimize clearinghouse and payer rejections.
 */

export interface ScrubberIssue {
    field: string;
    severity: 'error' | 'warning';
    code: string;
    message: string;
    fixAction: string;
}

export interface ClaimData {
    billingProvider: {
        npi: string;
        tin: string;
    };
    renderingProvider: {
        npi: string;
        taxonomyCode?: string;
    };
    patient: {
        firstName: string;
        lastName: string;
        dob: string;
        gender: string;
    };
    coverage: {
        memberId: string;
        payerId: string;
    };
    serviceLines: Array<{
        cptCode: string;
        units: number;
        charge: number;
        modifiers?: string[];
    }>;
}

export class ClaimScrubber {
    /**
     * Scrub a claim and return all found issues
     */
    static scrub(data: ClaimData): ScrubberIssue[] {
        const issues: ScrubberIssue[] = [];

        // 1. Provider Validation
        if (!this.isValidNPI(data.billingProvider.npi)) {
            issues.push({
                field: 'billingProvider.npi',
                severity: 'error',
                code: 'INVALID_BILLING_NPI',
                message: 'Billing NPI is missing or invalid.',
                fixAction: 'Verify Billing NPI in Settings.'
            });
        }

        if (!this.isValidNPI(data.renderingProvider.npi)) {
            issues.push({
                field: 'renderingProvider.npi',
                severity: 'error',
                code: 'INVALID_RENDERING_NPI',
                message: 'Rendering NPI is missing or invalid.',
                fixAction: 'Verify Rendering NPI in Settings.'
            });
        }

        if (!data.renderingProvider.taxonomyCode) {
            issues.push({
                field: 'renderingProvider.taxonomyCode',
                severity: 'error',
                code: 'MISSING_TAXONOMY',
                message: 'Provider Taxonomy Code is required for EDI submission.',
                fixAction: 'Select Taxonomy Code in Provider Profile.'
            });
        }

        if (!data.billingProvider.tin || data.billingProvider.tin.length < 9) {
            issues.push({
                field: 'billingProvider.tin',
                severity: 'error',
                code: 'MISSING_TIN',
                message: 'Tax ID (TIN) is required.',
                fixAction: 'Add TIN in Billing Setup.'
            });
        }

        // 2. Patient Validation
        if (!data.patient.firstName || !data.patient.lastName) {
            issues.push({
                field: 'patient.name',
                severity: 'error',
                code: 'MISSING_PATIENT_NAME',
                message: 'Patient full name is required.',
                fixAction: 'Update patient demographics.'
            });
        }

        if (!this.isValidDOB(data.patient.dob)) {
            issues.push({
                field: 'patient.dob',
                severity: 'error',
                code: 'INVALID_DOB',
                message: 'Patient Date of Birth is invalid.',
                fixAction: 'Verify DOB in patient chart.'
            });
        }

        // 3. Coverage Validation
        if (!data.coverage.memberId) {
            issues.push({
                field: 'coverage.memberId',
                severity: 'error',
                code: 'MISSING_MEMBER_ID',
                message: 'Insurance Member ID is missing.',
                fixAction: 'Enter Member ID in Insurance tab.'
            });
        }

        // 4. Service Line Validation
        if (data.serviceLines.length === 0) {
            issues.push({
                field: 'serviceLines',
                severity: 'error',
                code: 'EMPTY_CLAIM',
                message: 'Claim must contain at least one service line.',
                fixAction: 'Add CPT codes to the superbill.'
            });
        }

        data.serviceLines.forEach((line, index) => {
            if (!line.cptCode) {
                issues.push({
                    field: `serviceLines[${index}].cptCode`,
                    severity: 'error',
                    code: 'MISSING_CPT',
                    message: `Service line ${index + 1} is missing a CPT code.`,
                    fixAction: 'Select a CPT code.'
                });
            }

            if (line.charge <= 0) {
                issues.push({
                    field: `serviceLines[${index}].charge`,
                    severity: 'warning',
                    code: 'ZERO_CHARGE',
                    message: `Service line ${index + 1} has a $0.00 charge.`,
                    fixAction: 'Verify the fee schedule amount.'
                });
            }
        });

        return issues;
    }

    private static isValidNPI(npi: string): boolean {
        return /^\d{10}$/.test(npi);
    }

    private static isValidDOB(dob: string): boolean {
        const date = new Date(dob);
        return !isNaN(date.getTime()) && date < new Date();
    }
}
