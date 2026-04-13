# Incident Response Plan — ChartSparkOG

**Version:** 1.0
**Date:** 2026-04-12
**Classification:** Internal — Confidential
**Review cycle:** Annual (next review: 2027-04-12)

---

## 1. Purpose

This plan establishes procedures for detecting, containing, investigating, and recovering from security incidents involving ChartSparkOG, with particular focus on incidents that may constitute a breach of Protected Health Information (PHI) under HIPAA. It implements requirements from the HIPAA Security Rule (45 CFR 164.308(a)(6)) and Breach Notification Rule (45 CFR 164.400-414).

---

## 2. Scope

This plan covers all systems that process, store, or transmit PHI:
- ChartSparkOG web application (Vercel)
- Supabase PostgreSQL database and Storage
- Azure OpenAI services (Whisper and GPT)
- Upstash Redis (rate limiting metadata)
- Resend email service
- Daily.co telehealth service
- Sentry error tracking
- Stripe billing integration

---

## 3. Incident Severity Levels

| Level | Definition | Examples | Response Time |
|-------|-----------|----------|---------------|
| **SEV-1 (Critical)** | Confirmed PHI breach or active compromise | Database exfiltration, unauthorized PHI access at scale, ransomware | Immediate (< 1 hour) |
| **SEV-2 (High)** | Likely PHI exposure or significant security failure | Single-patient unauthorized access, authentication bypass, RLS policy failure | < 4 hours |
| **SEV-3 (Medium)** | Security anomaly with potential PHI impact | Unusual access patterns, failed brute-force attempts, dependency vulnerability | < 24 hours |
| **SEV-4 (Low)** | Security event with no PHI impact | Rate limit triggers, failed login below lockout threshold, non-PHI config exposure | < 72 hours |

---

## 4. Detection

### 4.1 Automated Detection

**Audit Log Monitoring** (`src/lib/security/audit-log.ts`)

The audit system classifies events by risk level and triggers alerts:

| Risk Level | Events | Action |
|-----------|--------|--------|
| **CRITICAL** | `DATA_BREACH_SUSPECTED`, `UNAUTHORIZED_ACCESS` | Immediate email alert via Resend to security team |
| **HIGH** | `PATIENT_DELETE`, `NOTE_DELETE`, `PHI_EXPORT`, `ROLE_CHANGED` | Logged for daily review |
| **MEDIUM** | `PATIENT_VIEW` (bulk), `LOGIN_FAILURE`, PHI read operations | Logged for weekly review |
| **LOW** | `LOGIN_SUCCESS`, `SESSION_EXTENDED` | Retained for forensic use |

**Automated alert mechanism:** CRITICAL events trigger an email via Resend (`src/lib/email/resend.ts`) to the configured security contact. The email contains only:
- Alert code (no PHI)
- Timestamp
- Severity level
- Fixed description text

Full incident details remain only in the `audit_logs` table.

**Rate Limit Alerts** (`src/lib/security/rate-limit.ts`)

- Circuit breaker activation (5+ failures in 60s) indicates potential attack
- Auth endpoint rate limit exceedance logged as `RATE_LIMIT_EXCEEDED`
- Fail-closed behavior on auth endpoints prevents access during anomalies

**Intrusion Detection** (`src/middleware.ts`)

The middleware scans non-safelisted API requests for:
- SQL injection patterns (UNION, SELECT, INSERT, DROP)
- XSS patterns (script tags, event handlers)
- Path traversal sequences (`../`)

Detected patterns are blocked and logged as `SUSPICIOUS_ACTIVITY`.

**Sentry Error Tracking**

- Unexpected 500 errors may indicate exploitation attempts
- Unusual error patterns or spikes warrant investigation
- Server config: `sentry.server.config.ts`, Edge config: `sentry.edge.config.ts`

### 4.2 Manual Detection

| Source | How to check |
|--------|-------------|
| User reports | Users report via support channel (email to `support@chartspark.io`) |
| Audit log review | Query `audit_logs` table filtering by `risk_level = 'CRITICAL'` or `'HIGH'` |
| Access anomalies | Review audit logs for unusual access times, locations, or volumes |
| Supabase dashboard | Monitor database connections, query volume, storage access |
| Vercel dashboard | Monitor function invocations, error rates, deployment logs |
| Azure portal | Monitor OpenAI API usage for unexpected spikes |

---

## 5. Containment

### 5.1 Immediate Containment (SEV-1/SEV-2)

**Step 1: Isolate compromised accounts**
- Deactivate affected user account(s) via Supabase Auth dashboard
- Revoke all active sessions for the account
- If SUPER_ADMIN account is compromised: rotate `SUPABASE_SERVICE_ROLE_KEY` immediately

**Step 2: Block attack vector**
- If brute-force: confirm account lockout is active (`src/lib/auth/lockout.ts` — 5 attempts / 30min lockout)
- If API abuse: add IP to rate limiting blocklist via Upstash Redis
- If RLS bypass: enable Supabase read-only mode or pause the project
- If credential exposure: rotate all affected secrets in Vercel dashboard

**Step 3: Preserve evidence**
- Export `audit_logs` table for the incident timeframe
- Export Vercel function logs
- Export Supabase connection logs
- Screenshot Sentry error dashboard
- Do NOT modify or delete any logs

**Step 4: Notify incident team**
- Alert all contacts listed in Section 10
- Open incident tracking document
- Begin incident timeline log

### 5.2 Extended Containment

- If the database is compromised: engage Supabase support for forensic database snapshot
- If Azure OpenAI credentials are exposed: rotate API keys via Azure portal, update Vercel environment variables
- If Resend credentials are exposed: rotate API key, audit sent emails for unauthorized messages
- If encryption key (`PHI_ENCRYPTION_KEY`) is compromised: plan emergency re-encryption of all PHI fields

---

## 6. Investigation

### 6.1 Investigation Scope

For any incident involving potential PHI exposure, determine:

1. **What data was accessed or exposed?**
   - Query `audit_logs` for the affected time window:
     ```
     Filter: timestamp between [incident_start] and [incident_end]
     Filter: user_id = [suspected_user] OR ip_address = [suspected_ip]
     Filter: phi_accessed = true
     ```
   - Identify all `entity_type` and `entity_id` values (patients, notes, documents accessed)

2. **Who was affected?**
   - List all patients whose records were accessed
   - Determine if encrypted fields (SSN, DOB, address, phone, email) were decrypted during access
   - Check if patient documents were downloaded (signed URL generation logs)

3. **How did the breach occur?**
   - Review authentication logs (was the session valid? was MFA completed?)
   - Check for role escalation attempts (`ROLE_CHANGED` events)
   - Review middleware logs for bypassed security checks
   - Examine Sentry for application errors that may have leaked data

4. **What is the blast radius?**
   - Was access limited to one organization (RLS intact) or cross-organization?
   - Were any API endpoints accessed without proper authentication?
   - Was data exfiltrated (check for bulk access patterns or `PHI_EXPORT` events)?

### 6.2 Forensic Data Sources

| Source | Location | Retention |
|--------|----------|-----------|
| Application audit logs | `audit_logs` table in Supabase | Per retention policy (see data flow diagram) |
| Login attempts | `login_attempts` table in Supabase | Per retention policy |
| Supabase connection logs | Supabase dashboard → Logs | 7 days (Supabase default) |
| Vercel function logs | Vercel dashboard → Logs | Plan-dependent |
| Sentry error events | Sentry dashboard | Plan-dependent |
| Azure OpenAI usage logs | Azure portal → Activity log | 90 days |

### 6.3 Investigation Documentation

Maintain an incident log with:
- Timeline of events (all times in UTC)
- Actions taken and by whom
- Evidence collected and preserved
- Systems and data affected
- Number of individuals affected
- Root cause determination

---

## 7. HIPAA Breach Notification

### 7.1 Breach Determination

Under HIPAA, a breach is the unauthorized acquisition, access, use, or disclosure of PHI that compromises its security or privacy. The following are **not** breaches:

- Unintentional access by an authorized workforce member acting in good faith
- Inadvertent disclosure to another authorized person within the organization
- Unauthorized access where the recipient could not reasonably retain the data

Perform the four-factor risk assessment:
1. Nature and extent of PHI involved (types of identifiers, clinical data)
2. Who accessed or received the PHI
3. Whether PHI was actually acquired or viewed
4. Extent to which the risk has been mitigated

### 7.2 Notification Requirements

**If a breach is confirmed:**

| Recipient | Requirement | Deadline |
|-----------|-------------|----------|
| **Affected individuals** | Written notice via first-class mail or email (if consented) | Within 60 calendar days of breach discovery |
| **HHS Secretary** | Breach report via HHS breach portal | Within 60 days if 500+ individuals; annual log if < 500 |
| **Media** | Press release to prominent media outlets in affected states | Within 60 days if 500+ individuals in a single state/jurisdiction |

### 7.3 Individual Notification Content

The notification must include:
1. Description of the breach (what happened, dates)
2. Types of PHI involved (names, SSN, diagnoses, treatment info, etc.)
3. Steps the individual should take to protect themselves
4. What ChartSparkOG is doing to investigate, mitigate, and prevent recurrence
5. Contact information for questions (phone number, email, postal address)

### 7.4 Notification Templates

Maintain pre-approved notification templates for:
- Patient notification letter
- HHS breach report submission
- Media statement
- Internal all-hands communication

Store templates in a secure, access-controlled location separate from the application codebase.

---

## 8. Remediation and Prevention

### 8.1 Immediate Remediation

- Patch the vulnerability or close the attack vector
- Rotate all potentially compromised credentials
- Restore affected data from backup if integrity is compromised
- Re-enable services only after confirming the fix

### 8.2 Post-Incident Actions

| Action | Owner | Timeline |
|--------|-------|----------|
| Root cause analysis (RCA) document | Incident Commander | 5 business days |
| Implement permanent fix | Engineering Lead | Per RCA findings |
| Update risk assessment (this document) | Security & Compliance | 10 business days |
| Review and update access controls | Security & Compliance | 10 business days |
| Staff communication / training | Organization Admin | 15 business days |
| Verify fix effectiveness | Engineering Lead | 30 days post-fix |

### 8.3 Prevention Measures

Based on incident type, consider:

- **Authentication breach:** Enforce MFA for all roles, reduce session timeout, add IP allowlisting
- **RLS bypass:** Audit all RLS policies, add integration tests for organization isolation, implement database-level audit triggers
- **API vulnerability:** Add automated security scanning to CI/CD, schedule penetration testing
- **Credential exposure:** Implement secrets scanning in pre-commit hooks, rotate credentials on a schedule
- **Insider threat:** Review audit logs for anomalous access patterns, implement the principle of least privilege, add data access alerts

---

## 9. Communication Plan

### 9.1 Internal Communication

| Audience | Channel | When |
|----------|---------|------|
| Incident Response Team | Direct message / phone | Immediately on detection |
| Engineering team | Secure channel | Within 1 hour of SEV-1/SEV-2 |
| Organization leadership | Secure email | Within 4 hours of SEV-1/SEV-2 |
| All staff | Company-wide email | After containment, as appropriate |

### 9.2 External Communication

| Audience | Channel | When |
|----------|---------|------|
| Affected patients | Written notice (mail/email) | Within 60 days per HIPAA |
| HHS | HHS breach portal | Within 60 days per HIPAA |
| Media (if 500+ affected) | Press release | Within 60 days per HIPAA |
| Business associates | Email/phone | Within 24 hours if their systems are involved |

**Communication rules:**
- All external communications must be reviewed by legal counsel
- Do not speculate about cause or scope in external communications
- Do not include PHI in incident communications
- Refer media inquiries to designated spokesperson only

---

## 10. Contact List

> **ACTION REQUIRED:** Fill in actual contact information before this plan is active.

| Role | Name | Phone | Email | Backup |
|------|------|-------|-------|--------|
| **Incident Commander** | ____________ | ____________ | ____________ | ____________ |
| **Engineering Lead** | ____________ | ____________ | ____________ | ____________ |
| **Security & Compliance Officer** | ____________ | ____________ | ____________ | ____________ |
| **Legal Counsel** | ____________ | ____________ | ____________ | ____________ |
| **Privacy Officer** | ____________ | ____________ | ____________ | ____________ |
| **Communications Lead** | ____________ | ____________ | ____________ | ____________ |
| **Supabase Support** | — | — | support@supabase.io | — |
| **Azure Support** | — | — | (Azure portal) | — |
| **Vercel Support** | — | — | support@vercel.com | — |

---

## 11. Plan Testing

| Activity | Frequency | Last Completed |
|----------|-----------|----------------|
| Tabletop exercise (walk through scenario) | Semi-annual | Not yet conducted |
| Technical drill (simulate breach, test containment) | Annual | Not yet conducted |
| Contact list verification | Quarterly | Not yet verified |
| Notification template review | Annual | Not yet reviewed |
| Backup restoration test | Semi-annual | Not yet tested |

---

## 12. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-12 | Security & Compliance Team | Initial incident response plan |
