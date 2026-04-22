# Add runtime logging to diagnose silent Sign button

## Context

Phase A commits landed but the Sign & Send for Review ConfirmModal confirm button is a no-op in production. No network request fires, no error appears, the modal closes silently. Code inspection shows the wiring is correct — `asyncConfirm` prop is set, `handleSubmitForReview` is bound to `onConfirm`, `signing` state flows correctly. But clicking does nothing.

We need runtime visibility fast. Add logging that surfaces ANY click path, even if the handler silently returns.

## Task

In `src/app/(app)/notes/[id]/page.tsx`, modify `handleSubmitForReview` (around line 126) to log at every step. Replace the existing function body with:

```typescript
const handleSubmitForReview = async () => {
    // DIAGNOSTIC: remove after runtime testing confirms sign flow works
    console.warn('[SIGN-DIAG] handleSubmitForReview called', {
        hasNote: !!note,
        noteId: note?.id,
        signing,
        timestamp: new Date().toISOString(),
    });

    if (!note) {
        console.warn('[SIGN-DIAG] early return: no note');
        return;
    }
    if (signing) {
        console.warn('[SIGN-DIAG] early return: signing=true (stuck state)');
        return;
    }

    setSigning(true);
    console.warn('[SIGN-DIAG] setSigning(true) called, about to fetch');

    try {
        const response = await fetch(`/api/notes/${id}/sign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        console.warn('[SIGN-DIAG] fetch returned', {
            status: response.status,
            ok: response.ok,
        });

        if (!response.ok) {
            let message = 'Failed to sign note';
            try {
                const data = await response.json();
                console.warn('[SIGN-DIAG] non-ok response body', data);
                if (data?.error) message = data.error;
            } catch (parseErr) {
                console.warn('[SIGN-DIAG] failed to parse error response', parseErr);
            }
            setError(message);
            setTimeout(() => setError(null), 4000);
            return;
        }

        const body = await response.json();
        console.warn('[SIGN-DIAG] 200 response body', body);

        setShowSubmitModal(false);
        setSuccessMessage('Sent for review');
        router.push('/notes');
    } catch (err) {
        console.warn('[SIGN-DIAG] fetch threw', err);
        setError('Failed to sign note');
        setTimeout(() => setError(null), 4000);
    } finally {
        setSigning(false);
        console.warn('[SIGN-DIAG] setSigning(false) finally block');
    }
};
```

Also add ONE log at the top of the file, right after imports, so we can verify the deployed bundle contains this code:

```typescript
console.warn('[SIGN-DIAG] notes/[id]/page.tsx module loaded, version 2026-04-21-diag-1');
```

## Build, commit, push

```
npm run build
git add src/app/\(app\)/notes/\[id\]/page.tsx
git commit --no-verify -m "debug(auditor): add diagnostic logging to handleSubmitForReview

Temporary instrumentation to diagnose silent Sign & Send for Review button
in production. Every code path through the handler logs to console.warn
with [SIGN-DIAG] prefix. Will be removed in the next commit once the root
cause is identified."
git push --no-verify
```

Confirm `gh auth status` shows Iowa51 active before pushing. If not, run `gh auth switch --user Iowa51` then `gh auth setup-git` then push.

## Do NOT

- Do not modify any other file.
- Do not touch ConfirmModal, the sign route, or the new/page.tsx.
- Do not start Phase B.
- Do not remove existing code logic — only ADD log statements inside existing branches.

## Report

One sentence: commit SHA pushed.