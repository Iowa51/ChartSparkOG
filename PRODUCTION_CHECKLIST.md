# ChartSpark Production Deployment Checklist

## Pre-Deployment Security Requirements

### 1. Environment Variables (REQUIRED)

```bash
# Supabase - REQUIRED
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # NEVER expose publicly

# Encryption - REQUIRED (generate with: openssl rand -base64 32)
PHI_ENCRYPTION_KEY=your-32-char-minimum-key

# Cron Jobs - REQUIRED (generate with: openssl rand -hex 32)
CRON_SECRET=your-cron-secret

# Stripe - REQUIRED for billing
STRIPE_SECRET_KEY=<set-in-secret-manager>
STRIPE_WEBHOOK_SECRET=<webhook-signing-secret>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<publishable-key>

# Azure OpenAI - REQUIRED for AI features
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment

# Daily.co - REQUIRED for telehealth
# Server-only. MUST NOT be exposed with a NEXT_PUBLIC_ prefix — the Daily API
# key can mint meeting tokens and must never ship to the browser bundle.
DAILY_API_KEY=<set-in-secret-manager>

# Demo Mode - MUST be false or unset in production
NEXT_PUBLIC_DEMO_MODE=false
```

### 2. Security Configuration Verification

- [ ] `NEXT_PUBLIC_DEMO_MODE` is NOT set to `true`
- [ ] `NODE_ENV` is set to `production`
- [ ] All service keys are production keys (not test/dev keys)
- [ ] `PHI_ENCRYPTION_KEY` is unique and not shared with dev environments

### 3. Database Setup (Supabase)

- [ ] Run database migrations
- [ ] Verify RLS policies are enabled on all tables
- [ ] Create `login_attempts` table for lockout system
- [ ] Create `audit_logs` table for HIPAA compliance
- [ ] Set up database backups

### 4. Stripe Configuration

- [ ] Create production webhook endpoint
- [ ] Configure webhook events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`
- [ ] Test subscription flow in live mode

### 5. Vercel Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/check-trial-expirations",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/generate-invoices",
      "schedule": "0 1 1 * *"
    }
  ]
}
```

- [ ] Set `CRON_SECRET` in Vercel environment variables
- [ ] Verify cron jobs are using Bearer token authentication

## Deployment Steps

1. **Build Verification**
   ```bash
   npm run build
   ```

2. **Push to Production**
   ```bash
   git push origin main
   ```

3. **Post-Deployment Verification**
   - [ ] Visit production URL and verify login works
   - [ ] Test API endpoints respond correctly
   - [ ] Verify demo mode is NOT accessible
   - [ ] Check that privileged roles require MFA

## Security Testing Checklist

### Authentication
- [ ] Login works with valid credentials
- [ ] Login fails after 5 failed attempts (lockout)
- [ ] MFA is required for ADMIN, SUPER_ADMIN, PROVIDER roles
- [ ] Session expires appropriately

### Authorization
- [ ] Non-authenticated users are redirected to login
- [ ] Users can only access their organization's data
- [ ] Role-based access control is enforced

### Data Protection
- [ ] PHI is not logged to console in production
- [ ] PHI encryption is working (check `PHI_ENCRYPTION_KEY` is set)
- [ ] Audit logs are being created

### API Security
- [ ] Cron endpoints require `CRON_SECRET`
- [ ] Feature access checks fail closed on errors
- [ ] Input validation rejects malformed data

## Rollback Procedure

If critical issues are discovered:

1. Revert to previous deployment in Vercel dashboard
2. Or revert Git commit: `git revert HEAD && git push origin main`
3. Notify team of rollback
4. Investigate and fix before re-deploying

## Emergency Contacts

- **Database Issues**: Check Supabase dashboard
- **Stripe Issues**: Check Stripe dashboard
- **Deployment Issues**: Check Vercel deployment logs

---

**Last Updated**: January 2026  
**Security Audit**: GPT-5.2 Code Audit Remediation Complete
