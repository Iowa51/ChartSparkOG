# Office Ally Error Codes and Resolution Mapping

## HTTP Status Codes (API Layer)
| Code | Meaning | User Action | System Action |
|------|---------|-------------|---------------|
| 400 | Bad Request | Check data format (DOB, NPI, etc.) | Log payload for debugging. |
| 401 | Unauthorized | Check Sender ID/Credentials. | Refresh OAuth token. |
| 403 | Forbidden | Verify account setup with OA. | Stop requests, alert Admin. |
| 429 | Rate Limit | Wait and try again. | Implement exponential backoff. |
| 500 | Server Error | Contact OA Support if persistent. | Retry after delay. |

## EDI Acknowledgement Codes (999/277CA)
| Code | Meaning | Severity | Fix Action |
|------|---------|----------|------------|
| A3 | Returned as unprocessable | Error | Check formatting/segments in X12. |
| A7 | Rejected for invalid information | Error | Correct Member ID, NPI, or Payer ID. |
| 23 | Returned to Entity | Error | Verify Submitter/Provider details. |
| 41 | Return to Submitter | Error | Verify Submitter ID NM109. |

## CARC (Claim Adjustment Reason Codes) - 835
| Code | Description | Category | User Action |
|------|-------------|----------|-------------|
| 16 | Claim lacks information | Fixable | Add missing clinical/billing data. |
| 22 | This care may be covered by another payer | COB | Submit to secondary insurance. |
| 27 | Expenses incurred after coverage terminated | Final | Verify insurance active date. |
| 29 | The time limit for filing has expired | Denial | Review timely filing dates. |
| 45 | Charge exceeds fee schedule/maximum | Adjustment | Accept adjustment or appeal rate. |
| 197 | Precertification/auth/notification absent | Denial | Add prior auth number and resubmit. |
| 204 | This service/equipment/drug is not covered | Final | Adjust to patient or write off. |

## RARC (Remittance Advice Remark Codes) - 835
| Code | Description | Action |
|------|-------------|--------|
| N30 | Patient is not a member of the plan | Verify Member ID. |
| N257 | Missing/incomplete/invalid provider NPI | Correct NPI in Settings. |
| N522 | This procedure code is not billable | Verify CPT code selection. |
