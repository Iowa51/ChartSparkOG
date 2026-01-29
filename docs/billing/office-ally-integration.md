# Office Ally Integration Documentation

## Architecture Overview
Office Ally utilizes a hybrid approach for billing connectivity:
- **Real-time APIs**: Used for Eligibility (270/271) and Claim Status (276/277). Supports REST (JSON/X12) or SOAP.
- **Batch SFTP**: Used for Claim Submission (837P) and Remittance Advice (835).

### 1. Authentication
- **REST API**: OAuth 2.0 (Client ID + Client Secret) to obtain a Bearer token.
- **SFTP**: SSH Username and Password/Key.
  - Base URL: `ftp10officeally.com`
  - Port: `22`

### 2. Transaction Mapping
| Transaction | ID | Method | Format | Workflow |
|-------------|----|--------|--------|----------|
| **Eligibility** | 270/271 | REST API | JSON/X12 | Real-time (sync), 3-5 sec response. |
| **Claim Submission** | 837P | SFTP | ANSI X12 | Nightly batch. Put in `/inbound` folder. |
| **Ack (999)** | 999 | SFTP | ANSI X12 | Within 24 hours of submission. |
| **Payer Ack (277CA)**| 277CA | SFTP | ANSI X12 | 3-5 business days. |
| **Claim Status** | 276/277 | REST API | JSON/X12 | Real-time status inquiry. |
| **ERA** | 835 | SFTP | ANSI X12 | Daily batch. Pull from `/outbound` folder. |

## SFTP Workflow Requirements
- **Test Mode**: Filenames MUST include the keyword `OATEST` (e.g., `837P_OATEST_20260129.txt`).
- **Receiver ID**: Loop 1000B, NM1*40*2, Target: `OFFICE ALLY`.
- **Payer ID**: Loop 2010BB, NM1*PR*2, Target: `[Office Ally Payer ID]`.

## Reliability & Performance
- **Circuit Breaker**: Implement for REST calls (Eligibility/Status).
- **Retry Strategy**: Exponential backoff for 429 (Rate Limit) or 5xx errors.
- **Rate Limits**:
  - Eligibility: 10 req/min.
  - Status: 20 req/min.
  - Submission: 100 claims/day (batch).
