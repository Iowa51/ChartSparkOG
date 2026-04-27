// Build 1.5: tests for the in-form readonly banner shown on the new-note
// page during pilot readonly / locked phase.

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PilotReadonlyFormBanner } from './pilot-readonly-form-banner';

vi.mock('next/link', () => ({
    default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
        // eslint-disable-next-line jsx-a11y/anchor-has-content
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

describe('PilotReadonlyFormBanner', () => {
    it('renders the readonly heading and end-of-window date when given an ISO timestamp', () => {
        const { container } = render(
            <PilotReadonlyFormBanner
                pilotReadonlyUntil="2026-05-04T00:00:00.000Z"
                pilotPhase="readonly"
            />,
        );

        expect(screen.getByRole('status')).toBeTruthy();
        expect(container.textContent).toMatch(/read-only mode/i);
        expect(container.textContent).toMatch(/Read-only access ends/i);
        // Date is locale-formatted; "May" + "2026" should be present.
        expect(container.textContent).toMatch(/2026/);
    });

    it('renders the locked-phase variant with stronger language', () => {
        const { container } = render(
            <PilotReadonlyFormBanner
                pilotReadonlyUntil="2026-04-20T00:00:00.000Z"
                pilotPhase="locked"
            />,
        );
        expect(container.textContent).toMatch(/pilot has ended/i);
        expect(container.textContent).toMatch(/expired/i);
    });

    it('always renders a "Back to notes" link to /notes', () => {
        render(
            <PilotReadonlyFormBanner
                pilotReadonlyUntil="2026-05-04T00:00:00.000Z"
                pilotPhase="readonly"
            />,
        );
        const link = screen.getByRole('link', { name: /back to notes/i });
        expect(link).toBeTruthy();
        expect(link.getAttribute('href')).toBe('/notes');
    });

    it('renders the support contact email', () => {
        render(
            <PilotReadonlyFormBanner
                pilotReadonlyUntil="2026-05-04T00:00:00.000Z"
                pilotPhase="readonly"
            />,
        );
        const mail = screen.getByRole('link', { name: /james@redark\.ventures/i });
        expect(mail.getAttribute('href')).toBe('mailto:james@redark.ventures');
    });
});
