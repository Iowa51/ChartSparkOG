// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // HIPAA: Filter out potentially sensitive data before sending to Sentry
  beforeSend(event) {
    // Remove any potential PHI from error messages
    if (event.message) {
      event.message = sanitizeMessage(event.message);
    }

    // Sanitize exception values
    if (event.exception?.values) {
      event.exception.values = event.exception.values.map(ex => ({
        ...ex,
        value: ex.value ? sanitizeMessage(ex.value) : ex.value,
      }));
    }

    // Sanitize breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map(breadcrumb => ({
        ...breadcrumb,
        message: breadcrumb.message ? sanitizeMessage(breadcrumb.message) : undefined,
        data: sanitizeData(breadcrumb.data),
      }));
    }

    // Remove request body data (may contain PHI)
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
      // Keep headers but remove authorization
      if (event.request.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
    }

    // Remove user PII (keep only ID for debugging)
    if (event.user) {
      event.user = { id: event.user.id };
    }

    return event;
  },

  // Don't send PII
  sendDefaultPii: false,
});

// Sanitize potentially sensitive data from messages
function sanitizeMessage(message: string): string {
  // Remove potential SSN patterns
  message = message.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED-SSN]');
  // Remove potential phone numbers
  message = message.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[REDACTED-PHONE]');
  // Remove potential emails
  message = message.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[REDACTED-EMAIL]');
  // Remove potential dates of birth (various formats)
  message = message.replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, '[REDACTED-DATE]');
  // Remove potential patient names (basic pattern - words after "patient")
  message = message.replace(/patient[:\s]+[A-Z][a-z]+ [A-Z][a-z]+/gi, 'patient: [REDACTED-NAME]');
  return message;
}

// Sanitize data objects
function sanitizeData(data: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!data) return data;

  const sensitiveKeys = [
    'ssn', 'social_security', 'dob', 'date_of_birth', 'birth',
    'phone', 'email', 'address', 'patient', 'name', 'first_name', 'last_name',
    'insurance', 'medical_record', 'diagnosis', 'medication', 'treatment',
    'password', 'token', 'secret', 'key', 'credential'
  ];

  const sanitized = { ...data };

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}
