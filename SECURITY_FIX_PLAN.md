# ChartSpark Security Fix Plan - Completed

## Summary
Security and HIPAA hardening implementation completed on 2026-01-14.

## Files Modified

### Database Migrations
| File | Purpose |
|------|---------|
| `supabase/migrations/20240114_security_hardening.sql` | AUDITOR role, hardened SECURITY DEFINER functions, AUDITOR read-only RLS |

### API Endpoints
| File | Changes |
|------|---------|
| `src/app/api/test-azure/route.ts` | **REWRITTEN** - Now SUPER_ADMIN only, 60s timeout, no PHI logging |
| `src/app/api/risk-assessments/route.ts` | **REWRITTEN** - Auth required, AUDITOR blocked, strict Zod, org scoping, audit logging |

### Client Code
| File | Changes |
|------|---------|
| `src/app/(app)/notes/new/page.tsx` | Removed PHI logging (line 124) |

### Deleted Files
| File | Reason |
|------|--------|
| `src/app/api/test-azure/route.js` | Replaced with TypeScript protected version |

---

## Security Controls Implemented

### 1. AUDITOR Role Support
- ✅ Added to DB constraint: `USER, ADMIN, AUDITOR, SUPER_ADMIN`
- ✅ AUDITOR can SELECT on PHI tables (patients, notes, encounters, risk_assessments)
- ✅ AUDITOR cannot INSERT/UPDATE/DELETE on PHI tables

### 2. Hardened SECURITY DEFINER Functions
- ✅ `get_user_role()` - SET search_path = public
- ✅ `get_user_organization_id()` - SET search_path = public

### 3. Protected /api/test-azure
- ✅ Authentication required (401 if not logged in)
- ✅ SUPER_ADMIN only (403 for other roles)
- ✅ 60-second timeout
- ✅ No PHI in logs or response

### 4. Locked Down /api/risk-assessments
- ✅ Authentication required
- ✅ AUDITOR blocked from POST (403)
- ✅ Strict Zod validation with `.strict()`
- ✅ Organization scoping enforced
- ✅ Server-side audit logging
- ✅ Demo fallback removed entirely

### 5. PHI Logging Removed
- ✅ `notes/new/page.tsx` - clinicianInput/phraseContext no longer logged
- ✅ `risk-assessments/route.ts` - Demo console.log removed

---

## Verification

### Build Status
```
✓ Compiled successfully in 16.8s
✓ 72/72 pages generated
Exit code: 0
```

### Test Commands

```bash
# Unauthenticated access → 401
curl -X GET "https://chart-spark-og.vercel.app/api/risk-assessments?patientId=test"

# test-azure without auth → 401
curl -X GET "https://chart-spark-og.vercel.app/api/test-azure"

# Unknown keys rejected → 400
curl -X POST "https://chart-spark-og.vercel.app/api/risk-assessments" \
  -H "Content-Type: application/json" \
  -d '{"patient_id":"uuid","hack":"injection"}'
```

---

## Deployment Notes

1. **Run SQL migration** in Supabase SQL Editor:
   - Execute `supabase/migrations/20240114_security_hardening.sql`

2. **Deploy to Vercel**:
   - Changes are ready for deployment
   - No environment variable changes needed

3. **Verify after deployment**:
   - Test unauthenticated access returns 401
   - Test SUPER_ADMIN can access /api/test-azure
   - Test AUDITOR cannot create risk assessments
