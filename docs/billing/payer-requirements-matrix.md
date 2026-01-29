# Payer Requirements Matrix (Week 2)

This matrix defines the scrubbing rules and enrollment requirements for the top 5 payers in the ChartSpark Billing Module.

| Payer | Timely Filing | High-Volume Modifiers | Prior Auth Required? | Office Ally Enrollment |
|-------|---------------|-----------------------|----------------------|-----------------------|
| **Medicare Part B** | 12 Months | 95 (Telehealth), AF (Psychiatrist), AH (Doctorate), AJ (LCSW) | No (Original), Yes (MA) | Standard Office Ally Setup |
| **Iowa Medicaid** | 365 Days* | 95, GT, HE (Mental Health Program) | Yes (for many services) | Required via OA Dashboard |
| **BCBS IA** | 90 - 180 Days | 95, GT, HO (Masters Level) | Variable by Plan | Required (eSign/Availity) |
| **Aetna** | 90 - 120 Days | 95, 25 (if with E/M) | Yes (Often) | Required (Optum/OA eSign) |
| **UnitedHealth (Optum)** | 90 Days | 95, GT | Yes (Mandatory for BH) | Required (Optum Portal) |

## Detailed Payer Profiles

### 1. Medicare Part B
- **Telehealth**: Effective 2026, in-person visit required within 6 months of starting telehealth (with some FQHC/RHC waivers).
- **Diagnosis Codes**: No limit on pointers (Loop 2300, HI), but typically first 4 are prioritized.
- **Modifiers**: Use `HP` for Doctorate, `HO` for Masters.

### 2. Iowa Medicaid (IME)
- **Enrollment**: Providers must be enrolled with IME before submitting via Office Ally.
- **Prior Auth**: Use for specialized psychiatric services or intensive outpatient.
- **Filing**: 12 months from date of service for initial claims.

### 3. Blue Cross Blue Shield (BCBS)
- **Varying Units**: Close monitoring of `90837` (60 min) vs `90834` (45 min) to avoid audits.
- **Modifiers**: Requires `95` for telehealth.

### 4. Aetna / UnitedHealthcare
- **Prior Auth**: "Gold Card" programs may exist for high-performing providers in 2026 to bypass some auth requirements.
- **Mental Health**: UHC (Optum) typically requires an authorization on file for all psychotherapy after the initial evaluation.

## Credentialing & Enrollment Timelines
| Item | Estimated Turnaround | Action Required |
|------|-----------------------|-----------------|
| CAQH Re-attestation | 120 Days | User must attest every 4 months. |
| BCBS Enrollment | 14 - 45 Business Days | Submit OA Availity form. |
| Aetna ERA/EFT | 15 Business Days | Submit OA eSign agreement. |
| Medicare Enrollment| 60 - 90 Days | PECOS application completion. |
