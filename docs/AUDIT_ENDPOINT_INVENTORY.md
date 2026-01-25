# ChartSpark API Endpoint Audit Inventory
# Task 0.1: Complete Audit Log Integration
# Created: January 25, 2026
# Target: 100% PHI Endpoint Coverage

## SUMMARY
Total Endpoints: 42
PHI-Touching Endpoints: 15
Audit Logging Present: 8 (53%)
Audit Logging Missing/Partial: 7 (47%)
Using logAuditEvent(): 0 (0%)
Using inline supabase insert: 8 (100%)

## CRITICAL GAPS IDENTIFIED
1. All endpoints use inline supabase.from('audit_logs').insert() instead of logAuditEvent()
2. Missing fields in most logs: phiAccessed, userAgent, riskLevel
3. GET (VIEW) operations are NOT logged on most endpoints
4. AI endpoints have NO audit logging
5. IP address only captured in 2 endpoints

---

## DETAILED ENDPOINT INVENTORY

### /api/patients/* (PHI: YES - HIGH RISK)

| Endpoint | Method | PHI? | Audit? | Fields Missing | Status |
|----------|--------|------|--------|----------------|--------|
| /api/patients | GET | YES | NO | All | ❌ NEEDS WORK |
| /api/patients | POST | YES | Partial | phiAccessed, userAgent, riskLevel, ipAddress | ⚠️ INCOMPLETE |
| /api/patients/[id] | GET | YES | NO | All | ❌ NEEDS WORK |
| /api/patients/[id] | PATCH | YES | Partial | phiAccessed, userAgent, riskLevel, ipAddress, orgId | ⚠️ INCOMPLETE |
| /api/patients/[id] | DELETE | YES | Partial | phiAccessed, userAgent, riskLevel, ipAddress, orgId | ⚠️ INCOMPLETE |

**Action Required:**
- Add logAuditEvent() to all endpoints
- Add PATIENT_VIEW event for GET operations
- Include phiAccessed: true for all
- Capture ipAddress and userAgent

---

### /api/notes/* (PHI: YES - HIGH RISK)

| Endpoint | Method | PHI? | Audit? | Fields Missing | Status |
|----------|--------|------|--------|----------------|--------|
| /api/notes | GET | YES | NO | All | ❌ NEEDS WORK |
| /api/notes | POST | YES | Partial | phiAccessed, userAgent, riskLevel, ipAddress | ⚠️ INCOMPLETE |
| /api/notes/[id] | GET | YES | NO | All | ❌ NEEDS WORK |
| /api/notes/[id] | PATCH | YES | Partial | phiAccessed, userAgent, riskLevel, ipAddress, orgId | ⚠️ INCOMPLETE |

**Action Required:**
- Add logAuditEvent() to all endpoints
- Add NOTE_VIEW event for GET operations
- Include phiAccessed: true for all
- Clinical notes contain sensitive patient information

---

### /api/encounters/* (PHI: YES - HIGH RISK)

| Endpoint | Method | PHI? | Audit? | Fields Missing | Status |
|----------|--------|------|--------|----------------|--------|
| /api/encounters/tracking | POST | YES | YES | userAgent (has ipAddress) | ✅ MOSTLY COMPLETE |

**Notes:**
- This is the BEST example in the codebase
- Captures ip_address from x-forwarded-for header
- Includes organization_id
- Logs to audit_logs with details

---

### /api/appointments/* (PHI: YES - MEDIUM RISK)

| Endpoint | Method | PHI? | Audit? | Fields Missing | Status |
|----------|--------|------|--------|----------------|--------|
| /api/appointments | GET | YES | NO | All | ❌ NEEDS WORK |
| /api/appointments | POST | YES | Partial | phiAccessed, userAgent, riskLevel, ipAddress | ⚠️ INCOMPLETE |
| /api/appointments/[id] | GET | ? | ? | Unknown | 🔍 NEEDS REVIEW |
| /api/appointments/[id] | PATCH | ? | ? | Unknown | 🔍 NEEDS REVIEW |

---

### /api/auth/* (PHI: NO - SECURITY CRITICAL)

| Endpoint | Method | PHI? | Audit? | Fields Missing | Status |
|----------|--------|------|--------|----------------|--------|
| /api/auth/callback | GET | NO | NO | All | ❌ NEEDS WORK |
| /api/auth/signout | POST | NO | NO | All | ❌ NEEDS WORK |
| /api/auth/record-attempt | POST | NO | YES | N/A | ✅ COMPLETE |
| /api/auth/check-lockout | GET | NO | NO | All | ⚠️ LOW PRIORITY |
| /api/auth/complete-signup | POST | NO | ? | Unknown | 🔍 NEEDS REVIEW |

**Notes:**
- record-attempt is well-implemented with ipAddress, userAgent, riskLevel
- signout should log LOGOUT event
- callback should log LOGIN_SUCCESS on successful auth

---

### /api/ai/* (PHI: YES - MEDIUM RISK - AI processes patient data)

| Endpoint | Method | PHI? | Audit? | Fields Missing | Status |
|----------|--------|------|--------|----------------|--------|
| /api/ai/generate-note | POST | YES | NO | All | ❌ NEEDS WORK |
| /api/ai/diagnose | POST | YES | NO | All | ❌ NEEDS WORK |
| /api/ai/recommendations | POST | YES | NO | All | ❌ NEEDS WORK |
| /api/ai/treatment-plan | POST | YES | NO | All | ❌ NEEDS WORK |
| /api/ai/chat | POST | YES | NO | All | ❌ NEEDS WORK |
| /api/ai/validate-codes | POST | NO | NO | All | ⚠️ LOW PRIORITY |

**Action Required:**
- All AI endpoints process patient clinical data
- Must log with phiAccessed: true
- Event type: AI_GENERATION or similar
- Track what data was sent to AI for HIPAA

---

### /api/managed-billing/* (PHI: PARTIAL - MEDIUM RISK)

| Endpoint | Method | PHI? | Audit? | Fields Missing | Status |
|----------|--------|------|--------|----------------|--------|
| /api/managed-billing/claims | GET | YES | ? | Unknown | 🔍 NEEDS REVIEW |
| /api/managed-billing/claims | POST | YES | ? | Unknown | 🔍 NEEDS REVIEW |
| /api/managed-billing/claims/[id]/submit | POST | YES | ? | Unknown | 🔍 NEEDS REVIEW |
| /api/managed-billing/claims/[id]/validate | POST | NO | ? | Unknown | 🔍 NEEDS REVIEW |
| /api/managed-billing/era/upload | POST | YES | ? | Unknown | 🔍 NEEDS REVIEW |
| /api/managed-billing/collections | * | YES | ? | Unknown | 🔍 NEEDS REVIEW |
| /api/managed-billing/invoices | * | YES | ? | Unknown | 🔍 NEEDS REVIEW |
| /api/managed-billing/onboarding | * | NO | ? | Unknown | 🔍 NEEDS REVIEW |
| /api/managed-billing/admin/clearinghouse | * | NO | ? | Unknown | 🔍 NEEDS REVIEW |

---

### /api/admin/* (PHI: NO - ADMIN ONLY)

| Endpoint | Method | PHI? | Audit? | Fields Missing | Status |
|----------|--------|------|--------|----------------|--------|
| /api/admin/system-health | GET | NO | NO | N/A | ✅ OK (no PHI) |

---

### Other Endpoints (LOW RISK)

| Endpoint | Method | PHI? | Audit? | Status |
|----------|--------|------|--------|--------|
| /api/billing | * | NO | ? | 🔍 NEEDS REVIEW |
| /api/ehr/* | * | YES | ? | 🔍 NEEDS REVIEW |
| /api/telehealth/* | * | YES | ? | 🔍 NEEDS REVIEW |
| /api/risk-assessments | * | YES | ? | 🔍 NEEDS REVIEW |
| /api/subscriptions/* | * | NO | ? | Low priority |
| /api/cron/* | * | NO | ? | Internal only |

---

## IMPLEMENTATION PRIORITY

### Priority 1 - CRITICAL (PHI Data)
1. /api/patients/* - All methods
2. /api/notes/* - All methods
3. /api/ai/* - All methods (processes PHI)
4. /api/encounters/tracking - Already good, verify complete

### Priority 2 - HIGH (Patient-Adjacent)
5. /api/appointments/* - All methods
6. /api/managed-billing/claims/* - All methods
7. /api/ehr/* - All methods
8. /api/telehealth/* - All methods

### Priority 3 - MEDIUM (Security Events)
9. /api/auth/signout - Add LOGOUT event
10. /api/auth/callback - Add LOGIN_SUCCESS event

### Priority 4 - LOW (Non-PHI)
11. /api/subscriptions/*
12. /api/admin/*
13. /api/cron/*

---

## HELPER FUNCTION NEEDED

```typescript
// src/lib/utils/get-client-ip.ts
export function getClientIP(request: Request): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
           request.headers.get('x-real-ip') ||
           'unknown';
}
```

---

## REQUIRED SCHEMA UPDATES

Current audit_logs fields (from schema.sql):
- id, timestamp, event_type, user_id, user_email, user_role
- organization_id, ip_address, user_agent
- resource_type, resource_id, details
- phi_accessed, risk_level, created_at

✅ Schema already supports all required fields!
❌ Endpoints are not populating all fields

---

## NEXT STEPS

1. [x] Create this inventory document
2. [ ] Create getClientIP() helper function
3. [ ] Create wrapper function for consistent audit logging
4. [ ] Refactor /api/patients/* endpoints
5. [ ] Refactor /api/notes/* endpoints
6. [ ] Refactor /api/ai/* endpoints
7. [ ] Refactor /api/appointments/* endpoints
8. [ ] Refactor /api/auth/* endpoints
9. [ ] Review and refactor remaining endpoints
10. [ ] Create integration tests
11. [ ] Verify 100% coverage
