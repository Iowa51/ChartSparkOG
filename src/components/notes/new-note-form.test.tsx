// Build 1.5: behavioral tests for the new-note form's isReadonly courtesy UI.
// The actual form is a 2.5k-line client component with many dependencies;
// these tests stub out the deps just enough to render and verify the
// fieldset-driven disabled state, the in-form banner presence, and that
// readonly handler invocation early-returns.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

// ── Stub external libraries ──────────────────────────────────────────────

const routerPush = vi.fn();
const searchParamsGet = vi.fn(() => null);

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: routerPush, replace: vi.fn(), refresh: vi.fn() }),
    useSearchParams: () => ({ get: searchParamsGet }),
}));

vi.mock('next/link', () => ({
    default: ({
        href,
        children,
        ...rest
    }: {
        href: string;
        children: React.ReactNode;
    } & Record<string, unknown>) => (
        // eslint-disable-next-line jsx-a11y/anchor-has-content
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

const toastApi = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
};

vi.mock('@/components/ui/toast', () => ({
    useToast: () => toastApi,
    ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const supabaseChain = {
    select: vi.fn(() => supabaseChain),
    eq: vi.fn(() => supabaseChain),
    in: vi.fn(() => supabaseChain),
    order: vi.fn(() => supabaseChain),
    single: vi.fn(async () => ({ data: null, error: null })),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
};

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: () => supabaseChain,
        auth: {
            getUser: async () => ({ data: { user: { id: 'u1', email: 'u@test' } } }),
        },
    }),
}));

vi.mock('@/components/notes/PatientQuickSelectModal', () => ({
    default: () => null,
}));

// PilotReadonlyFormBanner is rendered as-is — it's a simple presentational
// component that doesn't need stubbing.

// Stub fetch so any incidental API calls don't blow up.
const originalFetch = globalThis.fetch;
beforeEach(() => {
    routerPush.mockReset();
    searchParamsGet.mockReset();
    searchParamsGet.mockReturnValue(null);
    toastApi.success.mockReset();
    toastApi.error.mockReset();
    toastApi.warning.mockReset();
    toastApi.info.mockReset();
    globalThis.fetch = vi.fn(async () =>
        new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        }),
    ) as typeof fetch;
});
afterEach(() => {
    globalThis.fetch = originalFetch;
});

// Import AFTER mocks so the component picks them up.
import NewNoteForm from './new-note-form';

describe('NewNoteForm — readonly courtesy UI', () => {
    it('renders without the readonly banner when isReadonly=false', () => {
        render(<NewNoteForm isReadonly={false} pilotPhase="active" />);
        expect(screen.queryByTestId('pilot-readonly-form-banner')).toBeNull();
    });

    it('renders the in-form readonly banner when isReadonly=true', () => {
        render(
            <NewNoteForm
                isReadonly={true}
                pilotReadonlyUntil="2026-05-04T00:00:00.000Z"
                pilotPhase="readonly"
            />,
        );
        const banner = screen.getByTestId('pilot-readonly-form-banner');
        expect(banner).toBeTruthy();
        expect(banner.textContent).toMatch(/read-only mode/i);
        expect(banner.textContent).toMatch(/2026/);
    });

    it('disables the form fieldset (cascading disable to all controls) when isReadonly=true', () => {
        const { container } = render(
            <NewNoteForm
                isReadonly={true}
                pilotReadonlyUntil="2026-05-04T00:00:00.000Z"
                pilotPhase="readonly"
            />,
        );
        const fieldset = container.querySelector('fieldset');
        expect(fieldset).toBeTruthy();
        expect(fieldset?.hasAttribute('disabled')).toBe(true);
        expect(fieldset?.getAttribute('aria-disabled')).toBe('true');
    });

    it('Save Draft button is disabled when isReadonly=true (cascading from fieldset)', () => {
        render(
            <NewNoteForm
                isReadonly={true}
                pilotReadonlyUntil="2026-05-04T00:00:00.000Z"
                pilotPhase="readonly"
            />,
        );
        const saveDraft = screen.getByRole('button', { name: /save draft/i });
        // <fieldset disabled> sets the disabled property on every contained
        // form control. React Testing Library reflects this via the
        // matching DOM property even when the explicit attribute is unset.
        expect((saveDraft as HTMLButtonElement).disabled).toBe(true);
    });

    it('Save & Finish button is disabled when isReadonly=true', () => {
        render(
            <NewNoteForm
                isReadonly={true}
                pilotReadonlyUntil="2026-05-04T00:00:00.000Z"
                pilotPhase="readonly"
            />,
        );
        const saveFinish = screen.getByRole('button', { name: /save & finish/i });
        expect((saveFinish as HTMLButtonElement).disabled).toBe(true);
    });

    it('clicking the disabled Save Draft button does not POST to the notes API', () => {
        const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
        render(
            <NewNoteForm
                isReadonly={true}
                pilotReadonlyUntil="2026-05-04T00:00:00.000Z"
                pilotPhase="readonly"
            />,
        );
        const saveDraft = screen.getByRole('button', { name: /save draft/i });
        fireEvent.click(saveDraft);
        // Disabled controls don't fire onClick in the DOM. No POST to /api/notes.
        const calledNotesApi = fetchMock.mock.calls.some(([url]) =>
            typeof url === 'string' && url.includes('/api/notes'),
        );
        expect(calledNotesApi).toBe(false);
    });

    it('Save Draft button is enabled when isReadonly=false', () => {
        render(<NewNoteForm isReadonly={false} pilotPhase="active" />);
        const saveDraft = screen.getByRole('button', { name: /save draft/i });
        expect((saveDraft as HTMLButtonElement).disabled).toBe(false);
    });
});
