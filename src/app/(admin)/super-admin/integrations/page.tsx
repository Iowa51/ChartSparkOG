/**
 * Super Admin Integrations Page
 * Platform-wide integration management
 * Path: /super-admin/integrations
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    Plug,
    CheckCircle2,
    XCircle,
    Clock,
    Settings,
    Building2,
    Activity,
    Shield,
    ExternalLink,
} from 'lucide-react';

interface PlatformIntegration {
    id: string;
    name: string;
    description: string;
    type: 'ehr' | 'billing' | 'notification' | 'analytics';
    status: 'active' | 'inactive' | 'coming_soon';
    connectedOrgs: number;
    totalOrgs: number;
    lastActivity?: string;
}

const PLATFORM_INTEGRATIONS: PlatformIntegration[] = [
    {
        id: 'stripe',
        name: 'Stripe',
        description: 'Payment processing and subscription billing',
        type: 'billing',
        status: 'active',
        connectedOrgs: 15,
        totalOrgs: 20,
        lastActivity: new Date().toISOString(),
    },
    {
        id: 'resend',
        name: 'Resend',
        description: 'Transactional email delivery',
        type: 'notification',
        status: 'inactive',
        connectedOrgs: 0,
        totalOrgs: 20,
    },
    {
        id: 'epic',
        name: 'Epic EHR',
        description: 'Enterprise EHR integration',
        type: 'ehr',
        status: 'coming_soon',
        connectedOrgs: 0,
        totalOrgs: 20,
    },
    {
        id: 'cerner',
        name: 'Oracle Cerner',
        description: 'Health information technology',
        type: 'ehr',
        status: 'coming_soon',
        connectedOrgs: 0,
        totalOrgs: 20,
    },
    {
        id: 'drchrono',
        name: 'DrChrono',
        description: 'Cloud-based EHR and practice management',
        type: 'ehr',
        status: 'active',
        connectedOrgs: 5,
        totalOrgs: 20,
        lastActivity: new Date(Date.now() - 3600000).toISOString(),
    },
    {
        id: 'twilio',
        name: 'Twilio',
        description: 'SMS and voice notifications',
        type: 'notification',
        status: 'coming_soon',
        connectedOrgs: 0,
        totalOrgs: 20,
    },
];

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
    ehr: { label: 'EHR', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    billing: { label: 'Billing', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    notification: { label: 'Notifications', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    analytics: { label: 'Analytics', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
};

export default function SuperAdminIntegrationsPage() {
    const [integrations] = useState<PlatformIntegration[]>(PLATFORM_INTEGRATIONS);

    const activeCount = integrations.filter(i => i.status === 'active').length;
    const totalConnections = integrations.reduce((sum, i) => sum + i.connectedOrgs, 0);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
            case 'inactive': return <XCircle className="h-5 w-5 text-slate-400" />;
            case 'coming_soon': return <Clock className="h-5 w-5 text-amber-500" />;
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
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Platform Integrations</h1>
                        <p className="text-slate-500 mt-1">Manage integrations across all organizations</p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Plug className="h-4 w-4 text-purple-500" />
                        <span className="text-xs text-slate-500">Total Integrations</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{integrations.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs text-slate-500">Active</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-4 w-4 text-blue-500" />
                        <span className="text-xs text-slate-500">Org Connections</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalConnections}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Activity className="h-4 w-4 text-amber-500" />
                        <span className="text-xs text-slate-500">API Calls (24h)</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">12,847</p>
                </div>
            </div>

            {/* Integrations Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {integrations.map((integration) => (
                    <div
                        key={integration.id}
                        className={`bg-white dark:bg-slate-900 rounded-xl border p-5 ${integration.status === 'active'
                                ? 'border-emerald-200 dark:border-emerald-800'
                                : 'border-slate-200 dark:border-slate-800'
                            }`}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                                    <Plug className="h-5 w-5 text-slate-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">{integration.name}</h3>
                                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full mt-1 ${TYPE_LABELS[integration.type].color}`}>
                                        {TYPE_LABELS[integration.type].label}
                                    </span>
                                </div>
                            </div>
                            {getStatusIcon(integration.status)}
                        </div>

                        <p className="text-sm text-slate-500 mb-4">{integration.description}</p>

                        <div className="flex items-center justify-between text-sm mb-3">
                            <span className="text-slate-500">Connected Orgs</span>
                            <span className="font-medium text-slate-900 dark:text-white">
                                {integration.connectedOrgs} / {integration.totalOrgs}
                            </span>
                        </div>

                        {integration.status === 'active' && (
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mb-3">
                                <div
                                    className="bg-emerald-500 h-2 rounded-full transition-all"
                                    style={{ width: `${(integration.connectedOrgs / integration.totalOrgs) * 100}%` }}
                                />
                            </div>
                        )}

                        {integration.lastActivity && (
                            <p className="text-xs text-slate-400 mb-3">
                                Last activity: {new Date(integration.lastActivity).toLocaleString()}
                            </p>
                        )}

                        <button
                            disabled={integration.status === 'coming_soon'}
                            className={`w-full py-2 text-sm rounded-lg font-medium ${integration.status === 'coming_soon'
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                                }`}
                        >
                            {integration.status === 'coming_soon' ? 'Coming Soon' : 'Manage'}
                        </button>
                    </div>
                ))}
            </div>

            {/* Security Notice */}
            <div className="mt-8 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-purple-800 dark:text-purple-200">
                            <strong>Platform Security:</strong> All integration credentials are encrypted at rest.
                            API access is logged and monitored. Enable MFA for all admin accounts.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
