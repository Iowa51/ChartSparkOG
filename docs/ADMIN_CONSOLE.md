# ChartSpark Admin Console

## Overview

ChartSpark's Admin Console provides comprehensive organization management with HIPAA-compliant audit logging, analytics, and integration capabilities.

## Admin Pages (`/admin`)

| Page | Description |
|------|-------------|
| **Dashboard** | Overview metrics and quick actions |
| **Analytics** | Provider productivity and performance metrics |
| **Users** | User management and role assignment |
| **Invitations** | Create and manage user invitations |
| **Templates** | Clinical note template CRUD |
| **Submissions** | Billing submission tracking |
| **Reports** | Billing, claims, and user analytics |
| **Scheduled Reports** | Automated report delivery |
| **Webhooks** | External system integrations |
| **Security Logs** | HIPAA audit log viewer |
| **Integrations** | EHR connection status |
| **Billing Console** | Subscription and billing management |
| **Settings** | Organization settings |

## Super Admin Pages (`/super-admin`)

| Page | Description |
|------|-------------|
| **Platform Overview** | Cross-organization metrics |
| **All Organizations** | Organization management |
| **Platform Users** | All users across orgs |
| **Analytics** | Platform-wide performance |
| **Reports** | Revenue and usage reports |
| **Scheduled Reports** | Platform report monitoring |
| **Webhooks** | Platform webhook health |
| **Security Logs** | Platform audit logs |
| **Integrations** | Integration status |
| **Managed Billing** | White-label billing |
| **Platform Billing** | Revenue tracking |

## Security Features

### Multi-Factor Authentication (MFA)
- TOTP-based authentication
- Required for admin roles
- Configurable per-organization

### Audit Logging
All critical actions are logged with:
- User ID and organization
- IP address and user agent
- Timestamp and duration
- Risk level classification

### Event Types (50+)
- Authentication events
- Data access/modification
- Admin actions
- Security events
- Integration events

## Database Migrations

```bash
# Apply MFA tables
psql -f supabase/migrations/20260125_mfa_implementation.sql

# Apply invitation tables
psql -f supabase/migrations/20260125_user_invitations.sql
```

## UI Components

### Skeleton Loaders
```tsx
import { Skeleton, SkeletonTable, SkeletonStats } from '@/components/ui/skeleton';
```

### Toast Notifications
```tsx
import { useToast, ToastProvider } from '@/components/ui/toast';

const { success, error } = useToast();
success('Saved!', 'Your changes have been saved.');
```

### Error Boundary
```tsx
import { ErrorBoundary, ErrorDisplay, EmptyState } from '@/components/ui/error-boundary';
```

### Form Validation
```tsx
import { validators, validateForm } from '@/lib/utils/validation';
```

## Environment Variables

```env
# Required for email invitations
RESEND_API_KEY=re_xxxxx

# MFA encryption (generate secure key)
MFA_ENCRYPTION_KEY=32-character-key
```

## API Endpoints with Audit Logging

- `POST /api/notes` - Create clinical note
- `PUT /api/notes/[id]` - Update clinical note
- `DELETE /api/notes/[id]` - Delete clinical note
- `POST /api/patients` - Create patient
- `PUT /api/patients/[id]` - Update patient
- `DELETE /api/patients/[id]` - Delete patient
- `POST /api/ai/*` - AI-assisted actions
- `POST /api/auth/signout` - User logout
- `POST /api/admin/invitations` - Create invitation
