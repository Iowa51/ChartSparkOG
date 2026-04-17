import { createServiceRoleClient } from '@/lib/supabase/service-role-client';
import AcceptForm from './AcceptForm';
import LinkAccountForm from './LinkAccountForm';
import RejectionPanel from './RejectionPanel';

type InvitationData = {
    id: string;
    token: string;
    email: string;
    role: string;
    expires_at: string;
    organization_id: string;
    orgName: string;
    inviterName: string;
    inviterEmail: string | null;
};

type ValidationResult =
    | { status: 'new_user'; invitation: InvitationData }
    | { status: 'eligible_linking'; invitation: InvitationData }
    | { status: 'already_accepted'; invitation: InvitationData }
    | { status: 'expired'; invitation: InvitationData }
    | { status: 'reject_different_org'; invitation: InvitationData }
    | { status: 'reject_same_org_has_role'; invitation: InvitationData; adminEmail: string | null }
    | { status: 'invalid' };

async function validateInvitation(token: string): Promise<ValidationResult> {
    const serviceClient = createServiceRoleClient();
    if (!serviceClient) return { status: 'invalid' };

    // Service role required — no anon RLS policy exists on invitations
    const { data: raw, error } = await serviceClient
        .from('invitations')
        .select(`
            id, token, email, role, specialty, organization_id, invited_by, status, expires_at,
            organizations(name),
            inviter:users!invitations_invited_by_fkey(first_name, last_name, email)
        `)
        .eq('token', token)
        .maybeSingle();

    if (error || !raw) return { status: 'invalid' };

    // Supabase join aliases are not reflected in generated types; cast safely
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inv = raw as any;

    const orgName: string = inv.organizations?.name ?? 'Unknown Organization';
    const inviterFirst: string = inv.inviter?.first_name ?? '';
    const inviterLast: string = inv.inviter?.last_name ?? '';
    const inviterName =
        `${inviterFirst} ${inviterLast}`.trim() || inv.inviter?.email || 'Your administrator';
    const inviterEmail: string | null = inv.inviter?.email ?? null;

    const invitation: InvitationData = {
        id: inv.id,
        token: inv.token,
        email: inv.email,
        role: inv.role,
        expires_at: inv.expires_at,
        organization_id: inv.organization_id,
        orgName,
        inviterName,
        inviterEmail,
    };

    if (inv.status === 'accepted') return { status: 'already_accepted', invitation };

    if (inv.status === 'expired' || new Date(inv.expires_at) < new Date()) {
        return { status: 'expired', invitation };
    }

    if (inv.status !== 'pending') return { status: 'invalid' };

    // Check for existing user with this email
    const { data: existingUser } = await serviceClient
        .from('users')
        .select('id, role, organization_id')
        .eq('email', inv.email.toLowerCase())
        .maybeSingle();

    if (!existingUser) return { status: 'new_user', invitation };

    if (!existingUser.role && !existingUser.organization_id) {
        return { status: 'eligible_linking', invitation };
    }

    if (existingUser.organization_id !== inv.organization_id) {
        return { status: 'reject_different_org', invitation };
    }

    return { status: 'reject_same_org_has_role', invitation, adminEmail: inviterEmail };
}

export default async function AcceptInvitationPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;
    const token = typeof params.token === 'string' ? params.token : undefined;

    if (!token || token.length < 16 || token.length > 512) {
        return <RejectionPanel reason="invalid" />;
    }

    const result = await validateInvitation(token);

    switch (result.status) {
        case 'new_user':
            return (
                <AcceptForm
                    token={result.invitation.token}
                    email={result.invitation.email}
                    inviterName={result.invitation.inviterName}
                    orgName={result.invitation.orgName}
                    role={result.invitation.role}
                    expiresAt={result.invitation.expires_at}
                />
            );

        case 'eligible_linking':
            return (
                <LinkAccountForm
                    token={result.invitation.token}
                    email={result.invitation.email}
                    inviterName={result.invitation.inviterName}
                    orgName={result.invitation.orgName}
                    role={result.invitation.role}
                    expiresAt={result.invitation.expires_at}
                />
            );

        case 'already_accepted':
            return (
                <RejectionPanel
                    reason="already_accepted"
                    email={result.invitation.email}
                />
            );

        case 'expired':
            return (
                <RejectionPanel
                    reason="expired"
                    expiresAt={result.invitation.expires_at}
                    inviterName={result.invitation.inviterName}
                />
            );

        case 'reject_different_org':
            return <RejectionPanel reason="different_org" />;

        case 'reject_same_org_has_role':
            return (
                <RejectionPanel
                    reason="same_org_has_role"
                    adminEmail={result.adminEmail}
                />
            );

        case 'invalid':
        default:
            return <RejectionPanel reason="invalid" />;
    }
}
