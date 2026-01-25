# ChartSpark API Documentation

## Authentication

All API endpoints require authentication via Supabase session cookies.

## Audit Logging

Critical endpoints automatically log actions for HIPAA compliance.

---

## Clinical Notes

### Create Note
```http
POST /api/notes
Content-Type: application/json

{
  "patient_id": "uuid",
  "template_id": "uuid",
  "content": "...",
  "note_type": "progress_note"
}
```

### Update Note
```http
PUT /api/notes/{id}
Content-Type: application/json

{
  "content": "updated content"
}
```

### Delete Note
```http
DELETE /api/notes/{id}
```

---

## Patients

### Create Patient
```http
POST /api/patients
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe",
  "date_of_birth": "1990-01-15",
  "mrn": "MRN-12345"
}
```

### Update Patient
```http
PUT /api/patients/{id}
Content-Type: application/json

{
  "phone": "555-123-4567"
}
```

---

## AI Endpoints

### Chat
```http
POST /api/ai/chat
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "What are the symptoms of..." }
  ],
  "patient_id": "uuid"
}
```

### Generate Note
```http
POST /api/ai/generate-note
Content-Type: application/json

{
  "patient_id": "uuid",
  "encounter_type": "follow_up",
  "transcript": "..."
}
```

### Treatment Plan
```http
POST /api/ai/treatment-plan
Content-Type: application/json

{
  "patient_id": "uuid",
  "diagnosis_codes": ["F32.1", "F41.1"]
}
```

---

## Admin - Invitations

### Create Invitation
```http
POST /api/admin/invitations
Content-Type: application/json

{
  "email": "newuser@example.com",
  "role": "PROVIDER"
}
```

### Accept Invitation
```http
POST /api/admin/invitations/accept
Content-Type: application/json

{
  "token": "invitation-token",
  "password": "user-password"
}
```

---

## Webhooks

Webhook payloads are signed using HMAC-SHA256. Verify using the signing secret.

### Payload Format
```json
{
  "event": "note.created",
  "timestamp": "2026-01-25T12:00:00Z",
  "data": {
    "id": "uuid",
    "patient_id": "uuid",
    "note_type": "progress_note"
  }
}
```

### Signature Verification
```typescript
import crypto from 'crypto';

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

---

## Error Responses

```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired session",
  "code": "AUTH_ERROR"
}
```

| Code | Description |
|------|-------------|
| `AUTH_ERROR` | Authentication failed |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Invalid request data |
| `RATE_LIMITED` | Too many requests |
