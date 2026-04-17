'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

type RejectionReason = 'invalid' | 'already_accepted' | 'expired' | 'different_org' | 'same_org_has_role';

type Props = {
    reason: RejectionReason;
    email?: string;
    expiresAt?: string;
    inviterName?: string;
    adminEmail?: string | null;
};

type Content = { title: string; message: string; action?: ReactNode };

export default function RejectionPanel({ reason, email, expiresAt, inviterName, adminEmail }: Props) {
    const formattedExpiry = expiresAt
        ? new Date(expiresAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
          })
        : null;

    const content: Record<RejectionReason, Content> = {
        invalid: {
            title: 'Invalid Invitation Link',
            message:
                'This invitation link is invalid. Please check the link in your email, or request a new invitation from your administrator.',
        },
        already_accepted: {
            title: 'Invitation Already Accepted',
            message: email
                ? `This invitation has already been accepted. If you are ${email}, please sign in. If not, this link is no longer valid.`
                : 'This invitation has already been accepted. Please sign in.',
            action: (
                <Link
                    href="/login"
                    className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                >
                    Sign In
                </Link>
            ),
        },
        expired: {
            title: 'Invitation Expired',
            message: formattedExpiry
                ? `This invitation expired on ${formattedExpiry}. Please ask ${inviterName ?? 'the sender'} to send you a new invitation.`
                : 'This invitation has expired. Please request a new invitation from your administrator.',
        },
        different_org: {
            title: 'Email Already in Use',
            message:
                'This email is already associated with another organization. If you believe this is an error, please contact the administrator who sent you this invitation.',
        },
        same_org_has_role: {
            title: 'Role Already Assigned',
            message: adminEmail
                ? `Your account at this organization already has a role. To request a role change, please contact your organization administrator at ${adminEmail}. Role changes must be made by an administrator through the user management panel.`
                : 'Your account at this organization already has a role. To request a role change, please contact your organization administrator. Role changes must be made through the user management panel.',
        },
    };

    const { title, message, action } = content[reason];

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
            <div className="max-w-md w-full text-center">
                <div className="bg-white rounded-lg border border-gray-200 p-8">
                    <h1 className="text-xl font-semibold text-gray-900 mb-3">{title}</h1>
                    <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
                    {action}
                </div>
            </div>
        </div>
    );
}
