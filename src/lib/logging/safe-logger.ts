// src/lib/logging/safe-logger.ts
// SEC-REMEDIATION: HIPAA-compliant logging utility — CANONICAL implementation
// C4: Consolidated from three separate implementations into one.
// NEVER logs PHI - only logs safe metadata

/**
 * Safe log data structure - only non-PHI fields allowed
 * NEVER add: patient names, diagnoses, symptoms, notes, SSNs, DOBs, etc.
 */
type SafeLogData = {
  action: string;
  userId?: string;
  patientId?: string;
  organizationId?: string;
  timestamp?: string;
  status?: string;
  error?: string;
  duration?: string;
  count?: number;
  resourceType?: string;
  resourceId?: string;
  requestId?: string;
};

const isProduction = process.env.NODE_ENV === "production";
const logLevel = process.env.LOG_LEVEL || (isProduction ? "error" : "debug");

function shouldLog(level: "debug" | "info" | "warn" | "error"): boolean {
  const levels: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };
  const currentLevel = levels[logLevel] ?? 0;
  return levels[level] >= currentLevel;
}

// =============================================
// PHI SANITIZATION (consolidated from data/utils.ts and utils/safe-logger.ts)
// =============================================

/** PHI field names — if a key matches, the value is redacted */
const PHI_FIELDS = [
  "ssn",
  "social_security",
  "socialsecurity",
  "dob",
  "date_of_birth",
  "dateofbirth",
  "birthdate",
  "address",
  "street",
  "city",
  "zipcode",
  "zip",
  "postal",
  "phone",
  "telephone",
  "mobile",
  "cell",
  "email",
  "emailaddress",
  "firstname",
  "first_name",
  "lastname",
  "last_name",
  "name",
  "fullname",
  "insurance_id",
  "insuranceid",
  "policynumber",
  "policy_number",
  "diagnosis",
  "diagnoses",
  "icd10",
  "icd_codes",
  "notes",
  "content",
  "notecontent",
  "sessionnotes",
  "clinicalnotes",
  "symptoms",
  "medications",
  "allergies",
  "conditions",
  "treatmentplan",
  "treatment_plan",
  "recommendations",
  "emergencycontact",
  "emergency_contact",
  "mrn",
  "medicalrecordnumber",
  "patientid",
  "patient_id",
];

/** PHI patterns in string values */
const PHI_PATTERNS: RegExp[] = [
  /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, // Email
  /MRN-\d{6}/g, // MRN
];

/**
 * Sanitize a string by replacing PHI patterns with redaction markers.
 */
export function sanitizePHI(message: string): string {
  let result = message;
  for (const pattern of PHI_PATTERNS) {
    result = result.replace(pattern, "[REDACTED]");
  }
  // Also redact UUIDs that could be patient IDs
  result = result.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "[ID]");
  return result;
}

/**
 * Deep clone and redact PHI from an arbitrary object.
 * Redacts values whose keys match known PHI field names and
 * replaces inline PHI patterns (SSN, phone, email) in strings.
 */
export function redactPHI(data: unknown): unknown {
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    let result = data;
    for (const pattern of PHI_PATTERNS) {
      result = result.replace(pattern, "[REDACTED]");
    }
    if (result.length > 100) {
      return `[TRUNCATED:${result.length} chars]`;
    }
    return result;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactPHI(item));
  }

  if (typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (PHI_FIELDS.some((f) => lowerKey.includes(f))) {
        result[key] = "[REDACTED]";
      } else {
        result[key] = redactPHI(value);
      }
    }
    return result;
  }

  return data;
}

// =============================================
// SAFE LOGGING
// =============================================

/**
 * Safe logging function - only logs non-PHI metadata
 */
export function safeLog(level: "info" | "error" | "warn" | "debug", data: SafeLogData) {
  if (!shouldLog(level)) return;

  const logEntry = {
    ...data,
    timestamp: data.timestamp || new Date().toISOString(),
    environment: process.env.NODE_ENV,
  };

  switch (level) {
    case "debug":
      console.debug("[SAFE]", logEntry);
      break;
    case "info":
      console.info("[SAFE]", logEntry);
      break;
    case "warn":
      console.warn("[SAFE]", logEntry);
      break;
    case "error":
      console.error("[SAFE]", logEntry);
      break;
  }
}

// Convenience functions
export const logInfo = (data: SafeLogData) => safeLog("info", data);
export const logError = (data: SafeLogData) => safeLog("error", data);
export const logWarn = (data: SafeLogData) => safeLog("warn", data);
export const logDebug = (data: SafeLogData) => safeLog("debug", data);

/** Type guard for Supabase / PostgREST error shape */
export function isSupabaseError(value: unknown): value is {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
} {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return "message" in v || "code" in v || "details" in v || "hint" in v;
}

/**
 * Sanitize an error value for safe logging (no PHI).
 * - Error instances: name + truncated message
 * - Supabase/PostgREST objects: code, hint, message surfaced; details dropped (may contain row data)
 * - Everything else: String() with JSON fallback
 */
export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.substring(0, 100);
    return `${error.name}: ${msg}`;
  }
  if (isSupabaseError(error)) {
    const parts: string[] = [];
    if (error.code) parts.push(`code=${error.code}`);
    if (error.hint) parts.push(`hint=${String(error.hint).substring(0, 100)}`);
    if (error.message) parts.push(`message=${String(error.message).substring(0, 100)}`);
    // details omitted — may contain row data (PHI risk)
    return parts.length ? `SupabaseError: ${parts.join(" | ")}` : "SupabaseError: (no details)";
  }
  if (typeof error === "string") return error.substring(0, 200);
  try {
    return JSON.stringify(error).substring(0, 200);
  } catch {
    return String(error).substring(0, 200);
  }
}

/**
 * OPTIMIZATION: Development-only logging
 * These logs are completely stripped in production for performance
 */
export function devLog(prefix: string, ...args: unknown[]): void {
  if (!isProduction) {
    console.log(`[${prefix}]`, ...args);
  }
}

export function devWarn(prefix: string, ...args: unknown[]): void {
  if (!isProduction) {
    console.warn(`[${prefix}]`, ...args);
  }
}

export function devError(prefix: string, ...args: unknown[]): void {
  if (!isProduction) {
    console.error(`[${prefix}]`, ...args);
  }
}
