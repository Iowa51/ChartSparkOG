---
name: frontend-patterns
description: Build Next.js 15 App Router frontend components for ChartSparkOG and its sidecars. Use whenever you write new pages, components, forms, or client-side state. Covers Server vs Client Components, form handling, loading/error states, accessibility, and the shadcn/ui patterns we use.
---

# Frontend Patterns

## Stack assumptions

- Next.js 15 App Router (no Pages Router in new code)
- TypeScript strict
- Tailwind CSS only (no custom CSS files except `globals.css` for tokens)
- shadcn/ui components (Button, Card, Dialog, Form, etc.)
- React Hook Form + Zod resolver for all forms
- No client-side state library (Zustand/Redux) — server state + React state

## Server vs Client Components

Default to Server Components. Only mark `"use client"` when you need:
- Hooks (`useState`, `useEffect`, `useRef`)
- Browser APIs (`window`, `localStorage`)
- Event handlers (`onClick`, `onChange`)
- React Context

```typescript
// ✅ Default — Server Component (no directive)
// app/patients/[id]/page.tsx
import { getPatient } from "@/lib/data/patients";

export default async function PatientPage({ params }: { params: { id: string } }) {
  const patient = await getPatient(params.id);
  return (
    <div>
      <h1>{patient.name}</h1>
      <PatientNotes patientId={params.id} />
    </div>
  );
}

// ✅ Client Component — needs hooks
// components/patient-notes.tsx
"use client";
import { useState } from "react";

export function PatientNotes({ patientId }: { patientId: string }) {
  const [editing, setEditing] = useState(false);
  // ...
}
```

## Form pattern (React Hook Form + Zod + shadcn)

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z.object({
  patientName: z.string().min(1, "Name is required").max(200),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
});

type FormValues = z.infer<typeof schema>;

export function NewPatientForm({ onSubmit }: { onSubmit: (values: FormValues) => Promise<void> }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { patientName: "", dateOfBirth: "" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="patientName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Patient name</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date of birth</FormLabel>
              <FormControl><Input {...field} type="date" /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save"}
        </Button>
      </form>
    </Form>
  );
}
```

The Zod schema in the form matches the Zod schema on the API endpoint. If they differ, the form will submit invalid data that the API rejects.

## Loading and error states

Every route segment has a `loading.tsx` and `error.tsx`.

```typescript
// app/patients/[id]/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

// app/patients/[id]/error.tsx
"use client";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6">
      <h2>Something went wrong loading this patient.</h2>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

The `error.tsx` boundary does not display the error message — PHI may be in error details. Show a generic message and let the user retry.

## Accessibility — non-negotiable for HIPAA + ADA

- Every input has a label (use `FormLabel`, not just placeholder)
- Every button has a discernible name (text or `aria-label`)
- Color contrast meets WCAG AA (Tailwind's `slate-700` on `white` is fine; `slate-400` on `white` is not)
- Keyboard navigable — tab order makes sense, focus indicators visible
- `<dialog>` modals trap focus (shadcn Dialog handles this)
- Don't rely on color alone (errors get an icon + text, not just red)

Run `axe-core` in tests:

```typescript
import { axe } from "jest-axe";
test("PatientForm is accessible", async () => {
  const { container } = render(<NewPatientForm onSubmit={async () => {}} />);
  expect(await axe(container)).toHaveNoViolations();
});
```

## Data fetching

Server Components fetch directly:

```typescript
// app/patients/[id]/page.tsx
import { createClient } from "@/lib/supabase/server";

export default async function PatientPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: patient, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !patient) {
    // Throws to error.tsx — do not include error.message
    throw new Error("PATIENT_NOT_FOUND");
  }

  return <PatientView patient={patient} />;
}
```

Client Components use `fetch` with credentials:

```typescript
"use client";
import { useEffect, useState } from "react";

export function NoteList({ patientId }: { patientId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    fetch(`/api/patients/${patientId}/notes`, { credentials: "include" })
      .then(r => r.json())
      .then(data => setNotes(data.notes));
  }, [patientId]);

  return /* ... */;
}
```

## What NOT to do

```typescript
// ❌ Putting PHI in URL query params
router.push(`/notes?patient=John+Smith&dob=1980-01-01`);

// ✅ Use opaque IDs only
router.push(`/notes?patient=${patientId}`);
```

```typescript
// ❌ Storing PHI in localStorage / sessionStorage
localStorage.setItem("currentPatient", JSON.stringify(patient));

// ✅ Don't. Re-fetch from server.
```

```typescript
// ❌ Inline styles
<div style={{ color: "#ff0000" }}>Error</div>

// ✅ Tailwind
<div className="text-red-600">Error</div>
```

```typescript
// ❌ Custom CSS files
import "./patient-form.css";

// ✅ Tailwind only (or shadcn variants for variants)
<div className="rounded-lg border bg-card p-6">...</div>
```

## See also

- `security-first` — input validation matches at form and API layers
- `api-endpoints` — the API your forms call
- `testing-patterns` — how to test components
