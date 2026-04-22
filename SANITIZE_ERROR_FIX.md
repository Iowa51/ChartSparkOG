Fix the error handling issue in src/lib/logging/safe-logger.ts so Supabase PostgREST errors surface properly in logs instead of being swallowed as 'Unknown error'.

Requirements for the sanitizeError update:
1. Keep existing behavior for Error instances.
2. For plain objects that look like Supabase/PostgREST errors (have a .message, .code, .details, or .hint property), include all of those fields in the sanitized output in a HIPAA-safe way. Code, hint, and message are safe; details can contain row data so pass details through a PHI-safe redactor or drop it entirely if a redactor does not exist.
3. For any other non-Error value, fall back to String(value) or JSON.stringify with a try/catch instead of the literal 'Unknown error'.
4. Add a TypeScript type guard named isSupabaseError for the PostgREST shape.

After fixing sanitizeError, do NOT try to fix the invitation handler's actual database error yet. I want to run the invitation flow again first and see the real error in the logs. Then we'll fix the DB issue in a separate commit.

Also: add a brief note in the commit message flagging that this helper has been silently swallowing every Supabase error across the codebase, so we can circle back to audit other call sites later.

Commit as: fix: unmask Supabase errors in sanitizeError (was swallowing all non-Error objects)

Do NOT run the invitation flow. Report back when commit is pushed and Vercel is green so I can test.