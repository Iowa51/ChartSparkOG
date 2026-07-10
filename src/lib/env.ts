// Centralized environment variable validation.
// Imported for side effect from src/app/layout.tsx so validation runs at startup.
// In production (server), missing required vars abort the process. In dev or
// on the client, invalid vars only produce a console warning so local work is
// not blocked.

import { z } from "zod";

const envSchema = z.object({
  // Supabase — app cannot function without these
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Azure OpenAI — required for clinical AI features
  AZURE_OPENAI_API_KEY: z.string().min(1),
  AZURE_OPENAI_ENDPOINT: z.string().url(),
  AZURE_OPENAI_DEPLOYMENT_NAME: z.string().min(1),
  AZURE_OPENAI_API_VERSION: z.string().default("2024-08-01-preview"),
  AZURE_WHISPER_ENDPOINT: z.string().url().optional(),
  AZURE_WHISPER_API_KEY: z.string().min(1).optional(),
  AZURE_OPENAI_WHISPER_DEPLOYMENT: z.string().default("whisper"),

  // PHI / encryption — required at runtime for encrypt/decrypt
  PHI_ENCRYPTION_KEY: z.string().min(32).optional(),
  ENCRYPTION_SALT: z.string().min(1).optional(),

  // Upstash Redis — rate limiting + subscription cache
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // Email (Resend)
  RESEND_API_KEY: z.string().min(1).optional(),

  // Telehealth (Daily)
  DAILY_API_KEY: z.string().min(1).optional(),

  // Sentry
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_ORG: z.string().min(1).optional(),
  SENTRY_PROJECT: z.string().min(1).optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_STARTER_PRICE_ID: z.string().min(1).optional(),
  STRIPE_ELITE_PRICE_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_STRIPE_NORMAL_PRICE_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_STRIPE_PRO_PRICE_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_STRIPE_ELITE_PRICE_ID: z.string().min(1).optional(),

  // Scheduled jobs
  CRON_SECRET: z.string().min(1).optional(),

  // Security alerts / webhooks
  ALERT_EMAIL: z.string().email().optional(),
  ALERT_PHONE: z.string().min(1).optional(),
  SECURITY_WEBHOOK_URL: z.string().url().optional(),
  // Build 5: pilot Slack alerts (#pilot-alerts) — set in Vercel production env.
  // Optional so dev/preview environments without it don't crash;
  // dispatchAlert no-ops when absent.
  SLACK_PILOT_ALERTS_WEBHOOK: z.string().url().optional(),
  HEALTH_CHECK_KEY: z.string().min(1).optional(),
  ALLOW_DIRECT_API_CALLS: z.string().optional(),
  DISABLE_MFA_ENFORCEMENT: z.string().optional(),

  // Managed billing
  OFFICE_ALLY_ALLOW_MOCK: z.string().optional(),
  MAX_ERA_PAYMENT_AMOUNT: z.string().default("10000000"),

  // Scribe proxy
  SCRIBE_SERVICE_URL: z.string().url().optional(),

  // App URLs
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_ENV: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  VERCEL_URL: z.string().optional(),

  // Agent sidecar
  SIDECAR_READY: z.string().default("false"),
  NEXT_PUBLIC_SIDECAR_READY: z.string().optional(),

  // Patient Portal intake (Sprint 1 / P2). Default off; gates the patient
  // intake page + terminology proxy routes until the phase exits.
  INTAKE_V1: z.string().default("false"),
  NEXT_PUBLIC_INTAKE_V1: z.string().optional(),

  // Provider reconciliation (Sprint 2 / P3). Default off; gates the reconcile
  // queue + detail pages until the phase exits.
  RECONCILE_V1: z.string().default("false"),
  NEXT_PUBLIC_RECONCILE_V1: z.string().optional(),

  // Demo mode
  NEXT_PUBLIC_DEMO_MODE: z.string().default("false"),
  DEMO_LOGIN_CREDENTIALS: z.string().optional(),

  // Logging
  LOG_LEVEL: z.string().optional(),

  // Runtime-provided
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_RUNTIME: z.enum(["nodejs", "edge"]).optional(),
  CI: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    // Log structured errors without dumping secret values.
    console.error("Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    const isServer = typeof window === "undefined";
    if (process.env.NODE_ENV === "production" && isServer) {
      throw new Error("Missing or invalid required environment variables. Check server logs.");
    }
  }
  return result.success ? result.data : (process.env as unknown as Env);
}

export const env = validateEnv();
