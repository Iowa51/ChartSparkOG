/**
 * Admin Webhook Configuration Page
 * Manage webhook endpoints for external integrations
 * Path: /admin/webhooks
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
    ArrowLeft,
    Webhook,
    Plus,
    Trash2,
    Edit2,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Loader2,
    Copy,
    Eye,
    EyeOff,
    RefreshCw,
    Clock,
    Shield,
    Zap,
    ExternalLink,
} from 'lucide-react';

interface WebhookEndpoint {
    id: string;
    name: string;
    url: string;
    secret: string;
    events: string[];
    is_active: boolean;
    last_triggered?: string;
    last_status?: 'success' | 'error' | 'pending';
    failure_count: number;
    created_at: string;
}

const EVENT_TYPES = [
    { id: 'note.created', label: 'Note Created', category: 'Notes' },
    { id: 'note.updated', label: 'Note Updated', category: 'Notes' },
    { id: 'note.deleted', label: 'Note Deleted', category: 'Notes' },
    { id: 'submission.created', label: 'Submission Created', category: 'Billing' },
    { id: 'submission.approved', label: 'Submission Approved', category: 'Billing' },
    { id: 'submission.rejected', label: 'Submission Rejected', category: 'Billing' },
    { id: 'user.created', label: 'User Created', category: 'Users' },
    { id: 'user.updated', label: 'User Updated', category: 'Users' },
    { id: 'patient.created', label: 'Patient Created', category: 'Patients' },
    { id: 'patient.updated', label: 'Patient Updated', category: 'Patients' },
    { id: 'security.mfa_enabled', label: 'MFA Enabled', category: 'Security' },
    { id: 'security.login_failed', label: 'Login Failed', category: 'Security' },
];

// UI display placeholders only — these are NOT real secrets and must never be used as such.
const DEMO_WEBHOOK_SECRET_PLACEHOLDER = 'whsec_' + 'x'.repeat(24);

const DEMO_WEBHOOKS: WebhookEndpoint[] = [
    {
        id: '1',
        name: 'EHR Sync',
        url: 'https://api.example-ehr.com/webhook/chartspark',
        secret: DEMO_WEBHOOK_SECRET_PLACEHOLDER,
        events: ['note.created', 'note.updated', 'patient.created'],
        is_active: true,
        last_triggered: new Date(Date.now() - 3600000).toISOString(),
        last_status: 'success',
        failure_count: 0,
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
        id: '2',
        name: 'Billing System',
        url: 'https://billing.example.com/api/webhooks',
        secret: DEMO_WEBHOOK_SECRET_PLACEHOLDER,
        events: ['submission.created', 'submission.approved', 'submission.rejected'],
        is_active: true,
        last_triggered: new Date(Date.now() - 7200000).toISOString(),
        last_status: 'error',
        failure_count: 3,
        created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    },
];

export default function WebhooksPage() {
    const supabase = createClient();
    const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>(DEMO_WEBHOOKS);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingWebhook, setEditingWebhook] = useState<WebhookEndpoint | null>(null);
    const [showSecrets, setShowSecrets] = useState<Set<string>>(new Set());
    const [testingWebhook, setTestingWebhook] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        url: '',
        events: [] as string[],
    });

    const generateSecret = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let secret = 'whsec_';
        for (let i = 0; i < 24; i++) {
            secret += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return secret;
    };

    const handleCreate = () => {
        setEditingWebhook(null);
        setFormData({ name: '', url: '', events: [] });
        setShowModal(true);
    };

    const handleEdit = (webhook: WebhookEndpoint) => {
        setEditingWebhook(webhook);
        setFormData({
            name: webhook.name,
            url: webhook.url,
            events: webhook.events,
        });
        setShowModal(true);
    };

    const handleSave = () => {
        if (editingWebhook) {
            setWebhooks(prev => prev.map(w =>
                w.id === editingWebhook.id
                    ? { ...w, ...formData }
                    : w
            ));
        } else {
            const newWebhook: WebhookEndpoint = {
                id: Date.now().toString(),
                ...formData,
                secret: generateSecret(),
                is_active: true,
                failure_count: 0,
                created_at: new Date().toISOString(),
            };
            setWebhooks(prev => [...prev, newWebhook]);
        }
        setShowModal(false);
    };

    const handleDelete = (id: string) => {
        if (confirm('Delete this webhook endpoint?')) {
            setWebhooks(prev => prev.filter(w => w.id !== id));
        }
    };

    const handleToggle = (id: string) => {
        setWebhooks(prev => prev.map(w =>
            w.id === id ? { ...w, is_active: !w.is_active } : w
        ));
    };

    const handleTest = async (id: string) => {
        setTestingWebhook(id);
        // Simulate webhook test
        await new Promise(resolve => setTimeout(resolve, 2000));
        setWebhooks(prev => prev.map(w =>
            w.id === id
                ? { ...w, last_triggered: new Date().toISOString(), last_status: 'success' as const, failure_count: 0 }
                : w
        ));
        setTestingWebhook(null);
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const toggleSecret = (id: string) => {
        setShowSecrets(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleEvent = (eventId: string) => {
        setFormData(prev => ({
            ...prev,
            events: prev.events.includes(eventId)
                ? prev.events.filter(e => e !== eventId)
                : [...prev.events, eventId],
        }));
    };

    const getStatusIcon = (status?: string) => {
        switch (status) {
            case 'success': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
            case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
            case 'pending': return <Clock className="h-4 w-4 text-amber-500" />;
            default: return null;
        }
    };

    // Group events by category
    const groupedEvents = EVENT_TYPES.reduce((acc, event) => {
        if (!acc[event.category]) acc[event.category] = [];
        acc[event.category].push(event);
        return acc;
    }, {} as Record<string, typeof EVENT_TYPES>);

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Webhooks</h1>
                        <p className="text-slate-500 mt-1">Real-time event notifications to external systems</p>
                    </div>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium"
                >
                    <Plus className="h-4 w-4" />
                    Add Endpoint
                </button>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                            <strong>Security:</strong> All webhook payloads are signed using HMAC-SHA256.
                            Verify signatures on your server using the signing secret.
                        </p>
                    </div>
                </div>
            </div>

            {/* Webhooks List */}
            <div className="space-y-4">
                {webhooks.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
                        <Webhook className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 mb-4">No webhook endpoints configured</p>
                        <button
                            onClick={handleCreate}
                            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl"
                        >
                            Add your first endpoint
                        </button>
                    </div>
                ) : (
                    webhooks.map((webhook) => (
                        <div
                            key={webhook.id}
                            className={`bg-white dark:bg-slate-900 rounded-xl border p-5 ${webhook.is_active
                                    ? webhook.failure_count > 0
                                        ? 'border-red-200 dark:border-red-800'
                                        : 'border-slate-200 dark:border-slate-800'
                                    : 'border-slate-200 dark:border-slate-800 opacity-60'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${webhook.is_active && webhook.failure_count === 0
                                            ? 'bg-teal-100 dark:bg-teal-900/30'
                                            : webhook.failure_count > 0
                                                ? 'bg-red-100 dark:bg-red-900/30'
                                                : 'bg-slate-100 dark:bg-slate-800'
                                        }`}>
                                        <Webhook className={`h-5 w-5 ${webhook.is_active && webhook.failure_count === 0
                                                ? 'text-teal-600'
                                                : webhook.failure_count > 0
                                                    ? 'text-red-600'
                                                    : 'text-slate-400'
                                            }`} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            {webhook.name}
                                            {getStatusIcon(webhook.last_status)}
                                        </h3>
                                        <p className="text-sm text-slate-500 font-mono mt-0.5">{webhook.url}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleTest(webhook.id)}
                                        disabled={testingWebhook === webhook.id}
                                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
                                    >
                                        {testingWebhook === webhook.id ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Zap className="h-3.5 w-3.5" />
                                        )}
                                        Test
                                    </button>
                                    <button
                                        onClick={() => handleToggle(webhook.id)}
                                        className={`px-3 py-1.5 text-sm rounded-lg ${webhook.is_active
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                                            }`}
                                    >
                                        {webhook.is_active ? 'Active' : 'Inactive'}
                                    </button>
                                    <button
                                        onClick={() => handleEdit(webhook)}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                    >
                                        <Edit2 className="h-4 w-4 text-slate-400" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(webhook.id)}
                                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                    >
                                        <Trash2 className="h-4 w-4 text-red-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Signing Secret */}
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 mb-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-slate-500">Signing Secret</span>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => toggleSecret(webhook.id)} className="p-1">
                                            {showSecrets.has(webhook.id) ? (
                                                <EyeOff className="h-3.5 w-3.5 text-slate-400" />
                                            ) : (
                                                <Eye className="h-3.5 w-3.5 text-slate-400" />
                                            )}
                                        </button>
                                        <button onClick={() => handleCopy(webhook.secret)} className="p-1">
                                            <Copy className="h-3.5 w-3.5 text-slate-400" />
                                        </button>
                                    </div>
                                </div>
                                <code className="text-sm text-slate-700 dark:text-slate-300">
                                    {showSecrets.has(webhook.id) ? webhook.secret : '••••••••••••••••••••••'}
                                </code>
                            </div>

                            {/* Events */}
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {webhook.events.map((event) => (
                                    <span key={event} className="px-2 py-0.5 text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 rounded-full">
                                        {event}
                                    </span>
                                ))}
                            </div>

                            {/* Status */}
                            <div className="flex items-center gap-4 text-xs text-slate-400">
                                {webhook.last_triggered && (
                                    <span>Last triggered: {new Date(webhook.last_triggered).toLocaleString()}</span>
                                )}
                                {webhook.failure_count > 0 && (
                                    <span className="text-red-500">{webhook.failure_count} failed deliveries</span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                {editingWebhook ? 'Edit Webhook' : 'Add Webhook Endpoint'}
                            </h2>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Endpoint Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., EHR Integration"
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Endpoint URL
                                </label>
                                <input
                                    type="url"
                                    value={formData.url}
                                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                    placeholder="https://api.example.com/webhooks"
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Events to Subscribe
                                </label>
                                <div className="space-y-4 max-h-48 overflow-y-auto">
                                    {Object.entries(groupedEvents).map(([category, events]) => (
                                        <div key={category}>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{category}</p>
                                            <div className="space-y-1">
                                                {events.map((event) => (
                                                    <label key={event.id} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.events.includes(event.id)}
                                                            onChange={() => toggleEvent(event.id)}
                                                            className="rounded border-slate-300"
                                                        />
                                                        <span className="text-sm text-slate-600 dark:text-slate-300">{event.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!formData.name || !formData.url || formData.events.length === 0}
                                className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-xl font-medium"
                            >
                                {editingWebhook ? 'Save Changes' : 'Create Endpoint'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
