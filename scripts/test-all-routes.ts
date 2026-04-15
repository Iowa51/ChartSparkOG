import { promises as fs } from "node:fs";
import path from "node:path";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface RouteSpec {
  area: string;
  requestedMethod: HttpMethod;
  requestedPath: string;
  implemented: boolean;
  actualMethod?: HttpMethod;
  actualPath?: string;
  requiredBody?: Record<string, unknown> | string[];
  successResponse: string;
  validationErrors: string[];
  notes?: string;
}

interface AuditIssue {
  severity: "high" | "medium" | "low";
  category: "missing-route" | "validation" | "error-handling" | "integration";
  route: string;
  summary: string;
  status: "open" | "fixed" | "known-gap";
}

const BASE_URL = process.env.CHARTSPARK_BASE_URL ?? "http://localhost:3000";
const API_ROOT = path.join(process.cwd(), "src", "app", "api");

const routeSpecs: RouteSpec[] = [
  {
    area: "Auth",
    requestedMethod: "POST",
    requestedPath: "/api/auth/register",
    implemented: false,
    successResponse: "No server route exists. Registration is handled directly in the browser with Supabase auth.signUp().",
    validationErrors: ["404 Not Found if requested as an API route."],
    notes: "Use the /register page flow instead of expecting a REST endpoint.",
  },
  {
    area: "Auth",
    requestedMethod: "POST",
    requestedPath: "/api/auth/login",
    implemented: true,
    actualMethod: "POST",
    actualPath: "/api/auth/login",
    requiredBody: { email: "user@example.com", password: "Password123!", redirect: "/dashboard" },
    successResponse: "{ success: true, redirectPath: '/dashboard|/admin|/auditor|/super-admin' }",
    validationErrors: [
      "400 Invalid email or password. Please try again.",
      "403 Invalid request origin",
      "409 Your account setup is incomplete. Please contact support.",
    ],
  },
  {
    area: "Auth",
    requestedMethod: "GET",
    requestedPath: "/auth/callback",
    implemented: true,
    actualMethod: "GET",
    actualPath: "/auth/callback",
    requiredBody: ["Supabase callback query params such as code, token_hash, type, next, org."],
    successResponse: "307/302 redirect to /dashboard or /reset-password with auth cookies set.",
    validationErrors: [
      "Redirect to /login with a clear error when the link is expired/invalid.",
      "Redirect to /auth/auth-code-error for implicit/hash recovery fallback handling.",
    ],
  },
  {
    area: "Auth",
    requestedMethod: "POST",
    requestedPath: "/api/auth/forgot-password",
    implemented: true,
    actualMethod: "POST",
    actualPath: "/api/auth/forgot-password",
    requiredBody: { email: "user@example.com" },
    successResponse: "{ success: true, message: 'If an account with that email exists...' }",
    validationErrors: ["400 Invalid email address", "403 Invalid request origin"],
  },
  {
    area: "Auth",
    requestedMethod: "POST",
    requestedPath: "/api/auth/reset-password",
    implemented: false,
    successResponse: "No API route exists. Password reset completion happens client-side on /reset-password using a recovery session.",
    validationErrors: ["404 Not Found if requested as an API route."],
    notes: "Supabase recovery uses /auth/callback then /reset-password, not /api/auth/reset-password.",
  },
  {
    area: "Auth",
    requestedMethod: "POST",
    requestedPath: "/api/auth/complete-signup",
    implemented: true,
    actualMethod: "POST",
    actualPath: "/api/auth/complete-signup",
    requiredBody: { firstName: "James", lastName: "Oman", organizationName: "ChartSpark Test Org" },
    successResponse: "{ success: true, organizationId: '<uuid>' }",
    validationErrors: [
      "400 Validation failed",
      "401 Unauthorized - must be logged in to complete signup",
      "403 Invalid request origin",
    ],
  },
  {
    area: "Patients",
    requestedMethod: "GET",
    requestedPath: "/api/patients",
    implemented: true,
    actualMethod: "GET",
    actualPath: "/api/patients",
    requiredBody: ["Optional query params: status, search, page, limit."],
    successResponse: "{ patients: [...], pagination: { page, limit, total, totalPages } }",
    validationErrors: ["400 Invalid query parameters", "404 Organization not found"],
  },
  {
    area: "Patients",
    requestedMethod: "POST",
    requestedPath: "/api/patients",
    implemented: true,
    actualMethod: "POST",
    actualPath: "/api/patients",
    requiredBody: {
      first_name: "Jane",
      last_name: "Doe",
      date_of_birth: "1988-04-14",
      gender: "female",
      email: "jane.doe@example.com",
      phone: "5551234567",
      address: "123 Main St, Des Moines, IA 50309",
      allergies: ["Penicillin"],
      medications: ["Sertraline 50mg"],
      problems: ["Anxiety"],
    },
    successResponse: "201 with the created patient object.",
    validationErrors: ["400 Validation failed", "400 No organization assigned to your account."],
  },
  {
    area: "Patients",
    requestedMethod: "GET",
    requestedPath: "/api/patients/[id]",
    implemented: true,
    actualMethod: "GET",
    actualPath: "/api/patients/:id",
    requiredBody: ["Path param id must be a UUID."],
    successResponse: "Patient object with details (allergies, medications, problems, insurance).",
    validationErrors: ["400 Invalid patient id", "404 Patient not found"],
  },
  {
    area: "Patients",
    requestedMethod: "PUT",
    requestedPath: "/api/patients/[id]",
    implemented: true,
    actualMethod: "PATCH",
    actualPath: "/api/patients/:id",
    requiredBody: { first_name: "Jane", last_name: "Doe-Smith", phone: "5551239999" },
    successResponse: "Updated patient object.",
    validationErrors: ["400 Invalid patient id", "400 Validation failed", "500 Failed to update patient"],
    notes: "The actual API method is PATCH, not PUT.",
  },
  {
    area: "Patients",
    requestedMethod: "DELETE",
    requestedPath: "/api/patients/[id]",
    implemented: true,
    actualMethod: "DELETE",
    actualPath: "/api/patients/:id",
    requiredBody: ["Path param id must be a UUID. ADMIN/SUPER_ADMIN only."],
    successResponse: "{ success: true }",
    validationErrors: ["400 Invalid patient id", "500 Failed to delete patient"],
  },
  {
    area: "Encounters",
    requestedMethod: "GET",
    requestedPath: "/api/encounters",
    implemented: true,
    actualMethod: "GET",
    actualPath: "/api/encounters",
    requiredBody: ["Optional query params: patient_id|patientId, status, page, limit."],
    successResponse: "{ encounters: [...], pagination: { page, limit, total, totalPages } }",
    validationErrors: ["400 Invalid query parameters", "404 Organization not found"],
  },
  {
    area: "Encounters",
    requestedMethod: "POST",
    requestedPath: "/api/encounters",
    implemented: true,
    actualMethod: "POST",
    actualPath: "/api/encounters",
    requiredBody: {
      patient_id: "<uuid>",
      encounter_type: "Follow-up Visit",
      encounter_date: "2026-04-15T14:30:00.000Z",
      chief_complaint: "Medication follow-up",
    },
    successResponse: "{ encounter: { ... } }",
    validationErrors: ["400 Validation failed", "403 Patient not found", "404 Organization not found"],
  },
  {
    area: "Encounters",
    requestedMethod: "GET",
    requestedPath: "/api/encounters/[id]",
    implemented: true,
    actualMethod: "GET",
    actualPath: "/api/encounters/:id",
    requiredBody: ["Path param id must be a UUID."],
    successResponse: "{ encounter: { ..., patient, provider, notes } }",
    validationErrors: ["400 Invalid encounter id", "404 Encounter not found"],
  },
  {
    area: "Encounters",
    requestedMethod: "PUT",
    requestedPath: "/api/encounters/[id]",
    implemented: true,
    actualMethod: "PUT",
    actualPath: "/api/encounters/:id",
    requiredBody: { status: "completed" },
    successResponse: "{ encounter: { ... } }",
    validationErrors: ["400 Invalid encounter id", "400 Validation failed", "500 Failed to update encounter"],
  },
  {
    area: "Notes",
    requestedMethod: "GET",
    requestedPath: "/api/notes",
    implemented: true,
    actualMethod: "GET",
    actualPath: "/api/notes",
    requiredBody: ["Optional query params: patient_id|patientId, page, limit."],
    successResponse: "{ notes: [...], pagination: { page, limit, total, totalPages } }",
    validationErrors: ["400 Invalid query parameters", "404 Organization not found"],
  },
  {
    area: "Notes",
    requestedMethod: "POST",
    requestedPath: "/api/notes",
    implemented: true,
    actualMethod: "POST",
    actualPath: "/api/notes",
    requiredBody: {
      patient_id: "<uuid>",
      encounter_id: "<uuid optional>",
      content: "SUBJECTIVE:\\n...\\n\\nASSESSMENT:\\n...",
      type: "progress",
      is_signed: false,
    },
    successResponse: "{ note: { ... } }",
    validationErrors: ["400 Validation failed", "403 Patient not found", "404 Organization not found"],
  },
  {
    area: "Notes",
    requestedMethod: "GET",
    requestedPath: "/api/notes/[id]",
    implemented: true,
    actualMethod: "GET",
    actualPath: "/api/notes/:id",
    requiredBody: ["Path param id must be a UUID."],
    successResponse: "{ note: { ... } }",
    validationErrors: ["400 Invalid note id", "404 Note not found"],
  },
  {
    area: "Notes",
    requestedMethod: "PUT",
    requestedPath: "/api/notes/[id]",
    implemented: true,
    actualMethod: "PATCH",
    actualPath: "/api/notes/:id",
    requiredBody: { content: "Updated note text", status: "completed" },
    successResponse: "{ note: { ... } }",
    validationErrors: ["400 Invalid note id", "400 Validation failed", "403 Cannot edit notes with status: signed|pending_review|approved"],
    notes: "The actual API method is PATCH, not PUT.",
  },
  {
    area: "Agent",
    requestedMethod: "POST",
    requestedPath: "/api/agent/complete-session",
    implemented: true,
    actualMethod: "POST",
    actualPath: "/api/agent/complete-session",
    requiredBody: {
      patientId: "<uuid>",
      encounterId: "<uuid>",
      transcript: "Patient reports doing better this week.",
      clinicianInput: "Continue current treatment plan.",
      templateFormat: "soap",
    },
    successResponse: "{ success: true, result: { summary, noteDraft, sections }, nextRoute }",
    validationErrors: ["400 Validation failed", "403 Patient not found", "404 Encounter not found"],
  },
  {
    area: "Admin",
    requestedMethod: "GET",
    requestedPath: "/api/admin/users",
    implemented: false,
    successResponse: "No user-list route exists. Only /api/admin/users/[userId] and /api/admin/users/[userId]/features are implemented.",
    validationErrors: ["404 Not Found"],
  },
  {
    area: "Admin",
    requestedMethod: "GET",
    requestedPath: "/api/admin/organizations",
    implemented: false,
    successResponse: "No organizations-list route exists in src/app/api/admin.",
    validationErrors: ["404 Not Found"],
  },
];

const auditIssues: AuditIssue[] = [
  {
    severity: "high",
    category: "missing-route",
    route: "/api/auth/register",
    summary: "Requested auth registration API route does not exist. Registration is implemented directly in the browser with Supabase signUp().",
    status: "known-gap",
  },
  {
    severity: "high",
    category: "missing-route",
    route: "/api/auth/reset-password",
    summary: "Requested reset-password API route does not exist. Reset completion happens on the /reset-password page using a recovery session.",
    status: "known-gap",
  },
  {
    severity: "high",
    category: "integration",
    route: "/api/encounters and /api/encounters/[id]",
    summary: "Encounter list/detail/update endpoints were missing. They are now implemented and the dependent app pages are wired to them.",
    status: "fixed",
  },
  {
    severity: "high",
    category: "integration",
    route: "/api/notes/[id]",
    summary: "The note editor used the create-note payload for PATCH requests, sending unsupported fields (type, is_signed).",
    status: "fixed",
  },
  {
    severity: "high",
    category: "integration",
    route: "/api/patients",
    summary: "The patient-create form payload did not match PatientCreateSchema: optional DOB treated as required, gender casing mismatch, and medications/problems were sent as object arrays instead of string arrays.",
    status: "fixed",
  },
  {
    severity: "medium",
    category: "integration",
    route: "/api/agent/complete-session",
    summary: "Agent completion route is now implemented to validate session input and return a deterministic session draft payload.",
    status: "fixed",
  },
  {
    severity: "medium",
    category: "missing-route",
    route: "/api/admin/users and /api/admin/organizations",
    summary: "Requested admin list endpoints do not exist. Admin API only exposes invitations, system-health, and per-user update/features routes.",
    status: "known-gap",
  },
];

class CookieJar {
  private readonly jar = new Map<string, string>();

  apply(response: Response) {
    const maybeGetSetCookie = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
    const setCookies = typeof maybeGetSetCookie === "function"
      ? maybeGetSetCookie.call(response.headers)
      : (response.headers.get("set-cookie") ? [response.headers.get("set-cookie") as string] : []);

    for (const setCookie of setCookies) {
      const [pair] = setCookie.split(";", 1);
      const [name, value] = pair.split("=", 2);
      if (name && value) this.jar.set(name.trim(), value.trim());
    }
  }

  header(): string | undefined {
    if (this.jar.size === 0) return undefined;
    return [...this.jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
  }
}

async function listRouteFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listRouteFiles(fullPath);
    return entry.name === "route.ts" ? [fullPath] : [];
  }));
  return results.flat();
}

async function runOptionalHttpSmokeTests() {
  const email = process.env.CHARTSPARK_TEST_EMAIL;
  const password = process.env.CHARTSPARK_TEST_PASSWORD;

  if (!email || !password) {
    console.log("HTTP smoke tests skipped: set CHARTSPARK_TEST_EMAIL and CHARTSPARK_TEST_PASSWORD to execute live requests.");
    return;
  }

  const jar = new CookieJar();
  const origin = new URL(BASE_URL).origin;

  const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
    },
    body: JSON.stringify({ email, password, redirect: "/dashboard" }),
    redirect: "manual",
  });

  jar.apply(loginResponse);
  console.log(`LOGIN ${loginResponse.status} /api/auth/login`);

  const patientsResponse = await fetch(`${BASE_URL}/api/patients`, {
    headers: {
      origin,
      ...(jar.header() ? { cookie: jar.header() } : {}),
    },
  });

  console.log(`PATIENTS ${patientsResponse.status} /api/patients`);
}

async function main() {
  const routeFiles = await listRouteFiles(API_ROOT);

  console.log("ChartSparkOG API Route Audit");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Route files discovered: ${routeFiles.length}`);
  console.log("");

  console.log("Requested Route Matrix");
  for (const spec of routeSpecs) {
    const implementation = spec.implemented
      ? `${spec.actualMethod ?? spec.requestedMethod} ${spec.actualPath ?? spec.requestedPath}`
      : "missing";
    console.log(`- [${spec.area}] ${spec.requestedMethod} ${spec.requestedPath}`);
    console.log(`  implemented: ${implementation}`);
    console.log(`  success: ${spec.successResponse}`);
    console.log(`  validation: ${spec.validationErrors.join(" | ")}`);
    if (spec.requiredBody) {
      console.log(`  payload: ${typeof spec.requiredBody === "object" ? JSON.stringify(spec.requiredBody) : spec.requiredBody}`);
    }
    if (spec.notes) console.log(`  notes: ${spec.notes}`);
  }

  console.log("");
  console.log("Audit Issues");
  for (const issue of auditIssues) {
    console.log(`- [${issue.severity}] ${issue.route}`);
    console.log(`  category: ${issue.category}`);
    console.log(`  status: ${issue.status}`);
    console.log(`  summary: ${issue.summary}`);
  }

  console.log("");
  console.log("API Route Files");
  for (const file of routeFiles) {
    console.log(`- ${path.relative(process.cwd(), file)}`);
  }

  console.log("");
  await runOptionalHttpSmokeTests();
}

void main().catch((error) => {
  console.error("test-all-routes failed");
  console.error(error);
  process.exitCode = 1;
});
