# P1_FIX6_EXTERNAL_TIMEOUTS.md

Read CLAUDE.md first. One fix, ONE commit.

## Problem

Several production external calls use raw fetch() with no timeout or abort signal. If Daily, a clearinghouse, or a webhook endpoint stalls, requests hang until the platform kills them. The repo has a circuit-breaker module but it is only used by safeAzureOpenAI.

Affected files:
- src/app/api/telehealth/create-room/route.ts (~lines 160-208)
- src/app/api/telehealth/end-session/route.ts (~lines 108-116)
- src/lib/managed-billing/clearinghouse-service.ts (~lines 233-305)
- src/lib/security/alerts.ts (~lines 155-170)

## Fix

### Step 1: Create a shared fetchWithTimeout helper

Create src/lib/utils/fetch-with-timeout.ts:

```typescript
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 10000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request to ${new URL(url).hostname} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
```

### Step 2: Apply to each affected file

For each file listed above:
1. Import fetchWithTimeout
2. Replace raw fetch() calls to external services with fetchWithTimeout()
3. Use appropriate timeouts:
   - Daily API calls: 15000ms (telehealth room creation can be slow)
   - Clearinghouse submissions: 30000ms (insurance APIs are notoriously slow)
   - Webhook/alert delivery: 5000ms (fire and forget, fail fast)
4. Wrap in try/catch that returns a clear error to the caller

### Step 3: Do NOT apply to internal calls

Only wrap calls to EXTERNAL services (Daily, clearinghouses, webhooks). Do NOT wrap calls to Supabase, Azure OpenAI (already has its own timeout via circuit breaker), or internal API routes.

### Step 4: Verify you found all external fetch calls

Grep src/ for fetch( calls that hit external URLs (not /api/ internal routes). Report any others you find beyond the four listed.

## After

npm run build. Commit:
git add -A
git commit -m "fix: P1 add timeout protection to all external service calls" --no-verify

Report: files created, files changed, timeout values per service, any additional external calls found, SHA.