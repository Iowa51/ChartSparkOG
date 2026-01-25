/**
 * Super Admin Webhooks Page
 * Platform-wide webhook management
 * Path: /super-admin/webhooks
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    Webhook,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Building2,
    Zap,
    Activity,
    Clock,
} from 'lucide-react';

interface PlatformWebhook {
    id: string;
    name: string;
    organization_name: string;
    url: string;
    events: string[];
    is_active: boolean;
    last_triggered?: string;
    last_status?: 'success' | 'error' | 'pending';
    failure_count: number;
    total_deliveries: number;
}

const DEMO_WEBHOOKS: PlatformWebhook[] = [
    {
        id: '1',
        name: 'EHR Sync',
        organization_name: 'Acme Healthcare',
        url: 'https://api.acme-ehr.com/webhook',
        events: ['note.created', 'patient.created'],
        is_active: true,
        last_triggered: new Date(Date.now() - 3600000).toISOString(),
        last_status: 'success',
        failure_count: 0,
        total_deliveries: 1247,
    },
    {
        id: '2',
        name: 'Billing Integration',
        organization_name: 'Metro Clinic',
        url: 'https://billing.metro.com/api/webhooks',
        events: ['submission.created', 'submission.approved'],
        is_active: true,
        last_triggered: new Date(Date.now() - 7200000).toISOString(),
        last_status: 'error',
        failure_count: 3,
        total_deliveries: 892,
    },
    {
        id: '3',
        name: 'Analytics Pipeline',
        organization_name: 'Platform',
        url: 'https://analytics.chartspark.ai/ingest',
        events: ['note.created', 'user.created', 'submission.created'],
        is_active: true,
        last_triggered: new Date(Date.now() - 300000).toISOString(),
        last_status: 'success',
        failure_count: 0,
        total_deliveries: 45892,
    },
];

export default function SuperAdminWebhooksPage() {
    const [webhooks] = useState<PlatformWebhook[]>(DEMO_WEBHOOKS);
    const [orgFilter, setOrgFilter] = useState<string>('all');

    const filteredWebhooks = orgFilter === 'all'
        ? webhooks
        : webhooks.filter(w => w.organization_name === orgFilter);

    const orgs = ['all', ...new Set(webhooks.map(w => w.organization_name))];

    const stats = {
        total: webhooks.length,
        active: webhooks.filter(w => w.is_active).length,
        failing: webhooks.filter(w => w.failure_count > 0).length,
        totalDeliveries: webhooks.reduce((sum, w) => sum + w.total_deliveries, 0),
    };

    const getStatusIcon = (status?: string) => {
        switch (status) {
            case 'success': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
            case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
            case 'pending': return <Clock className="h-4 w-4 text-amber-500" />;
            default: return null;
        }
    };

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/super-admin" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Platform Webhooks</h1>
                        <p className="text-slate-500 mt-1">All webhook endpoints across organizations</p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Webhook className="h-4 w-4 text-purple-500" />
                        <span className="text-sm text-slate-500">Total Endpoints</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm text-slate-500">Active</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-slate-500">Failing</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{stats.failing}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Activity className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-slate-500">Total Deliveries</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalDeliveries.toLocaleString()}</p>
                </div>
            </div>

            {/* Filter */}
            <div className="mb-6">
                <select
                    value={orgFilter}
                    onChange={(e) => setOrgFilter(e.target.value)}
                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                    {orgs.map(org => (
                        <option key={org} value={org}>{org === 'all' ? 'All Organizations' : org}</option>
                    ))}
                </select>
            </div>

            {/* Webhooks Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Endpoint</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Organization</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Events</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Deliveries</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredWebhooks.map((webhook) => (
                            <tr key={webhook.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(webhook.last_status)}
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">{webhook.name}</p>
                                            <p className="text-xs text-slate-500 font-mono truncate max-w-[200px]">{webhook.url}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-slate-400" />
                                        <span className="text-slate-600 dark:text-slate-400">{webhook.organization_name}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1">
                                        {webhook.events.slice(0, 2).map((event) => (
                                            <span key={event} className="px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                                                {event}
                                            </span>
                                        ))}
                                        {webhook.events.length > 2 && (
                                            <span className="px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">
                                                +{webhook.events.length - 2}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right text-slate-900 dark:text-white font-medium">
                                    {webhook.total_deliveries.toLocaleString()}
                                </td>
                                <td className="px-4 py-3">
                                    {webhook.failure_count > 0 ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                            {webhook.failure_count} failures
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                            Healthy
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
