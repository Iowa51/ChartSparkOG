# PRD-14 — Security as a Feature (Public Security Page)

**Version:** 1.0
**Track:** I
**Mode:** Marketing site addition
**Week:** 12
**Status:** Spec ready

---

## Why this exists

ChartSparkOG has done 11 security sprints + 8 pentest sprints + 60+ vulnerabilities remediated. ICANotes+ does not advertise specific audits, only "HIPAA-compliant." This is a sales differentiator going unused.

A public security page at `chartspark.io/security` becomes:
- A trust signal during demos
- A response to security questionnaires from larger practices
- A document compliance officers can reference

## Success criteria

- A page at `chartspark.io/security` (or `/trust`) describes the security posture in clinician-readable language
- Includes:
  - HIPAA Security Rule mapping (administrative, physical, technical safeguards)
  - List of pentests completed with vendor + date + scope (without revealing findings)
  - BAA list (vendors with BAA in place)
  - Encryption summary (at-rest, in-transit, key management)
  - Access control summary (RLS, MFA, RBAC)
  - Audit logging summary
  - Incident response summary
  - Contact for security questions / responsible disclosure
- Downloadable one-pager (PDF) for security questionnaires
- Links to a security@chartspark.io contact

## Out of scope

- SOC 2 certification (in progress, not a 90-day deliverable)
- HITRUST certification (multi-year)
- Public CVE / bug bounty (post-90)

## Content outline

```markdown
# Security at ChartSpark

ChartSpark is built for behavioral health practices that take security seriously.

## Compliance posture
- HIPAA Security Rule — full implementation across administrative, physical, and technical safeguards
- 42 CFR Part 2 (substance use confidentiality) — supported with consent-managed disclosure
- SOC 2 Type II — audit in progress (target: Q4 2026)

## Independent testing
- Penetration test by Cobalt (date) — scope: full app + API
- (Subsequent tests listed)

## Encryption
- TLS 1.3 in transit
- AES-256 at rest (Supabase + Postgres)
- PHI payload encryption (AES-256-GCM) for messages, claims, and ERA files
- Key rotation: 90 days for application secrets, 30 days for high-sensitivity keys

## Access control
- Multi-factor authentication required for all clinical users
- Role-based access (Chartspark Admin → Practice Manager → Provider/Nurse → Billing Clerk/Receptionist)
- Row-Level Security enforced at the database level (defense in depth)
- Failed login lockout
- Session expiration

## Audit logging
- Every PHI access logged with actor, action, resource, timestamp, IP
- Append-only audit log (logs cannot be modified)
- 7-year retention

## Subprocessors with BAA
- Supabase (database + auth + storage)
- Azure OpenAI (AI inference)
- Anthropic (AI inference)
- Daily.co (telehealth video)
- Resend (transactional email)
- Twilio (SMS reminders)
- Stripe (payments — limited PHI exposure)

## Incident response
- Documented incident response plan with defined timelines
- 60-day breach notification commitment (HIPAA requires 60; we commit to no more)
- security@chartspark.io for reports

## Responsible disclosure
We welcome reports of security issues. Email security@chartspark.io with details. We commit to:
- Initial response within 2 business days
- Resolution timeline within 7 business days
- Credit (with permission) for valid reports
```

## Implementation

**Files (chartspark.io marketing site):**
- `src/app/security/page.tsx` (NEW) — the page
- `public/security/chartspark-security-overview-v1.pdf` (NEW) — downloadable
- `src/app/.well-known/security.txt` (NEW) — standard responsible-disclosure file

**Out of OG repo scope:** This sits on the marketing site (separate repo or current site infrastructure).

## Acceptance criteria

- [ ] Page goes live at `chartspark.io/security`
- [ ] PDF version downloadable
- [ ] `/.well-known/security.txt` resolves
- [ ] No specific pentest findings or remediation details disclosed (only summary)
- [ ] security@chartspark.io address active
- [ ] Linked from main navigation + footer

## Risks

- **Overpromising:** statements on the page must be true today. Have James or legal review before publishing.
- **Disclosing too much:** specific findings or exploit paths must not appear. Stick to high-level posture.

## Skills

`master/PRD-MASTER.md`, `using-skills.md`, `frontend-patterns.md` (for the page)
