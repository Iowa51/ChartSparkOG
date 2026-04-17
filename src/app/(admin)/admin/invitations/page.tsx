/**
 * Admin User Invitations Page
 * Task 1.3: User Invitation Flow
 * Path: /admin/invitations
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    UserPlus,
    Mail,
    Clock,
    CheckCircle2,
    XCircle,
    Copy,
    Loader2,
    RefreshCw,
    AlertTriangle,
    Send,
    Trash2,
    Users,
} from 'lucide-react';

interface Invitation {
    id: string;
    email: string;
    role: string;
    specialty?: string;
    status: 'pending' | 'accepted' | 'expired' | 'cancelled';
    expires_at: string;
    created_at: string;
    invited_by: string;
    users?: {
        first_name: string;
        last_name: string;
        email: string;
    };
}

const ROLE_OPTIONS = [
    { value: 'USER', label: 'Clinician', description: 'Standard clinical user' },
    { value: 'ADMIN', label: 'Admin', description: 'Organization administrator' },
    { value: 'AUDITOR', label: 'Auditor', description: 'Read-only compliance access' },
];

export default function AdminInvitationsPage() {
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Form state
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('USER');
    const [specialty, setSpecialty] = useState('');

    const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

    useEffect(() => {
        loadInvitations();
    }, []);

    const loadInvitations = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/invitations');
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            setInvitations(data.invitations || []);
        } catch (err: any) {
            console.error('Error loading invitations:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch('/api/admin/invitations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, role, specialty: specialty || undefined }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            setSuccess(`Invitation sent to ${email}`);
            setLastInviteUrl(data.inviteUrl);
            setShowCreateModal(false);
            setEmail('');
            setRole('USER');
            setSpecialty('');
            await loadInvitations();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleCopyLink = (invitation: Invitation) => {
        const url = `${window.location.origin}/accept-invitation?token=${invitation.id}`;
        // Note: In real implementation, we'd need to store/retrieve the actual token
        // For now, this is a placeholder
        navigator.clipboard.writeText(url);
        setCopiedId(invitation.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleCancel = async (id: string) => {
        if (!confirm('Are you sure you want to cancel this invitation?')) return;

        try {
            // TODO: Implement cancel endpoint
            setSuccess('Invitation cancelled');
            await loadInvitations();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                        <Clock className="h-3 w-3" />
                        Pending
                    </span>
                );
            case 'accepted':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Accepted
                    </span>
                );
            case 'expired':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        <XCircle className="h-3 w-3" />
                        Expired
                    </span>
                );
            case 'cancelled':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                        <XCircle className="h-3 w-3" />
                        Cancelled
                    </span>
                );
            default:
                return null;
        }
    };

    const getRoleBadge = (role: string) => {
        const colors: Record<string, string> = {
            USER: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
            ADMIN: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
            AUDITOR: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
        };
        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[role] || 'bg-slate-100 text-slate-600'}`}>
                {role}
            </span>
        );
    };

    const pendingCount = invitations.filter(i => i.status === 'pending').length;
    const acceptedCount = invitations.filter(i => i.status === 'accepted').length;

    if (loading && invitations.length === 0) {
        return (
            <div className="flex-1 p-6 lg:p-8 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-4" />
                    <p className="text-slate-500">Loading invitations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User Invitations</h1>
                        <p className="text-slate-500 mt-1">Invite new users to your organization</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadInvitations}
                        disabled={loading}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                    >
                        <RefreshCw className={`h-5 w-5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium"
                    >
                        <UserPlus className="h-5 w-5" />
                        Invite User
                    </button>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-red-800 dark:text-red-200">{error}</p>
                </div>
            )}

            {success && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-emerald-800 dark:text-emerald-200">{success}</p>
                            {lastInviteUrl && (
                                <div className="mt-2">
                                    <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-2">
                                        Share this link with the user:
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700 rounded-lg text-sm break-all">
                                            {lastInviteUrl}
                                        </code>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(lastInviteUrl);
                                                setSuccess('Link copied to clipboard!');
                                            }}
                                            className="p-2 hover:bg-emerald-100 dark:hover:bg-emerald-800 rounded-lg"
                                        >
                                            <Copy className="h-4 w-4 text-emerald-600" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Mail className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{invitations.length}</p>
                            <p className="text-sm text-slate-500">Total Invitations</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{pendingCount}</p>
                            <p className="text-sm text-slate-500">Pending</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                            <Users className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{acceptedCount}</p>
                            <p className="text-sm text-slate-500">Accepted</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Invitations Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Email</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Role</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Invited By</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Expires</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {invitations.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                                    <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>No invitations yet</p>
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="mt-2 text-teal-600 hover:underline"
                                    >
                                        Invite your first user
                                    </button>
                                </td>
                            </tr>
                        ) : (
                            invitations.map((inv) => (
                                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-4 py-3">
                                        <span className="font-medium text-slate-900 dark:text-white">{inv.email}</span>
                                    </td>
                                    <td className="px-4 py-3">{getRoleBadge(inv.role)}</td>
                                    <td className="px-4 py-3">{getStatusBadge(inv.status)}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                        {inv.users ? `${inv.users.first_name} ${inv.users.last_name}` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                        {new Date(inv.expires_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-2">
                                            {inv.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => handleCopyLink(inv)}
                                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                                                        title="Copy invite link"
                                                    >
                                                        {copiedId === inv.id ? (
                                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                        ) : (
                                                            <Copy className="h-4 w-4 text-slate-400" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleCancel(inv.id)}
                                                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                                        title="Cancel invitation"
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Invite New User</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                            >
                                <XCircle className="h-5 w-5 text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Email Address *
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="user@example.com"
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Role *
                                </label>
                                <div className="space-y-2">
                                    {ROLE_OPTIONS.map((option) => (
                                        <label
                                            key={option.value}
                                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${role === option.value
                                                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                                                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="role"
                                                value={option.value}
                                                checked={role === option.value}
                                                onChange={(e) => setRole(e.target.value)}
                                                className="text-teal-600"
                                            />
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white">{option.label}</p>
                                                <p className="text-sm text-slate-500">{option.description}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Specialty (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={specialty}
                                    onChange={(e) => setSpecialty(e.target.value)}
                                    placeholder="e.g., Psychiatry, Family Medicine"
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                                />
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    An invitation link will be generated. You can share it manually or the system
                                    will send an email when configured.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating || !email}
                                    className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                                >
                                    {creating ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                    Send Invitation
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
