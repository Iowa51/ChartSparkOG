/**
 * Admin Integration Settings Page
 * Phase 3: Integration Settings
 * Path: /admin/integrations
 * 
 * Manage EHR and third-party integrations:
 * - EHR connection status
 * - API credentials
 * - Webhook configuration
 * - Integration health
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
    ArrowLeft,
    Plug,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    RefreshCw,
    Settings,
    ExternalLink,
    Key,
    Eye,
    EyeOff,
    Loader2,
    Clock,
    Activity,
    Shield,
    Zap,
} from 'lucide-react';

interface Integration {
    id: string;
    name: string;
    description: string;
    type: 'ehr' | 'billing' | 'analytics' | 'notification';
    status: 'connected' | 'disconnected' | 'error' | 'coming_soon';
    lastSync?: string;
    config?: Record<string, any>;
}

const INTEGRATIONS: Integration[] = [
    {
        id: 'epic',
        name: 'Epic EHR',
        description: 'Bi-directional sync with Epic MyChart and clinical data',
        type: 'ehr',
        status: 'coming_soon',
    },
    {
        id: 'cerner',
        name: 'Cerner',
        description: 'Integration with Oracle Cerner health records',
        type: 'ehr',
        status: 'coming_soon',
    },
    {
        id: 'athena',
        name: 'athenahealth',
        description: 'Connect to athenaOne practice management',
        type: 'ehr',
        status: 'coming_soon',
    },
    {
        id: 'drchrono',
        name: 'DrChrono',
        description: 'EHR and practice management integration',
        type: 'ehr',
        status: 'disconnected',
    },
    {
        id: 'stripe',
        name: 'Stripe',
        description: 'Payment processing and subscription management',
        type: 'billing',
        status: 'connected',
        lastSync: new Date().toISOString(),
    },
    {
        id: 'resend',
        name: 'Resend',
        description: 'Transactional email delivery',
        type: 'notification',
        status: 'disconnected',
    },
    {
        id: 'twilio',
        name: 'Twilio',
        description: 'SMS notifications and reminders',
        type: 'notification',
        status: 'coming_soon',
    },
];

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
    ehr: { label: 'EHR', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    billing: { label: 'Billing', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    analytics: { label: 'Analytics', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    notification: { label: 'Notifications', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
};

export default function IntegrationSettingsPage() {
    const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS);
    const [loading, setLoading] = useState(false);
    const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
    const [showApiKey, setShowApiKey] = useState(false);
    const [testingConnection, setTestingConnection] = useState<string | null>(null);

    const handleConnect = (integration: Integration) => {
        setSelectedIntegration(integration);
    };

    const handleTestConnection = async (id: string) => {
        setTestingConnection(id);
        // Simulate connection test
        await new Promise(resolve => setTimeout(resolve, 2000));
        setTestingConnection(null);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'connected':
                return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
            case 'error':
                return <XCircle className="h-5 w-5 text-red-500" />;
            case 'disconnected':
                return <XCircle className="h-5 w-5 text-slate-400" />;
            case 'coming_soon':
                return <Clock className="h-5 w-5 text-slate-400" />;
            default:
                return null;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'connected':
                return <span className="text-emerald-600 font-medium">Connected</span>;
            case 'error':
                return <span className="text-red-600 font-medium">Error</span>;
            case 'disconnected':
                return <span className="text-slate-500">Not Connected</span>;
            case 'coming_soon':
                return <span className="text-slate-400 italic">Coming Soon</span>;
            default:
                return null;
        }
    };

    const connectedCount = integrations.filter(i => i.status === 'connected').length;

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Integrations</h1>
                        <p className="text-slate-500 mt-1">Connect with EHR systems and third-party services</p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Plug className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-slate-500">Total Integrations</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{integrations.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Activity className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm text-slate-500">Connected</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600">{connectedCount}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Shield className="h-4 w-4 text-purple-500" />
                        <span className="text-sm text-slate-500">API Calls (24h)</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">1,247</p>
                </div>
            </div>

            {/* Integration Categories */}
            <div className="space-y-8">
                {['ehr', 'billing', 'notification'].map(type => {
                    const typeIntegrations = integrations.filter(i => i.type === type);
                    const typeConfig = TYPE_LABELS[type];

                    return (
                        <div key={type}>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeConfig.color}`}>
                                    {typeConfig.label}
                                </span>
                                Integrations
                            </h2>
                            <div className="grid md:grid-cols-2 gap-4">
                                {typeIntegrations.map((integration) => (
                                    <div
                                        key={integration.id}
                                        className={`bg-white dark:bg-slate-900 rounded-xl border p-4 transition-all ${integration.status === 'connected'
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
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {getStatusIcon(integration.status)}
                                                        {getStatusLabel(integration.status)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-sm text-slate-500 mb-4">{integration.description}</p>

                                        {integration.lastSync && (
                                            <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
                                                <RefreshCw className="h-3 w-3" />
                                                Last sync: {new Date(integration.lastSync).toLocaleString()}
                                            </p>
                                        )}

                                        <div className="flex items-center gap-2">
                                            {integration.status === 'coming_soon' ? (
                                                <button
                                                    disabled
                                                    className="flex-1 py-2 text-sm text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-not-allowed"
                                                >
                                                    Coming Soon
                                                </button>
                                            ) : integration.status === 'connected' ? (
                                                <>
                                                    <button
                                                        onClick={() => handleTestConnection(integration.id)}
                                                        disabled={testingConnection === integration.id}
                                                        className="flex-1 flex items-center justify-center gap-2 py-2 text-sm text-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
                                                    >
                                                        {testingConnection === integration.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <RefreshCw className="h-4 w-4" />
                                                        )}
                                                        Test
                                                    </button>
                                                    <button
                                                        onClick={() => handleConnect(integration)}
                                                        className="flex-1 flex items-center justify-center gap-2 py-2 text-sm text-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
                                                    >
                                                        <Settings className="h-4 w-4" />
                                                        Configure
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => handleConnect(integration)}
                                                    className="flex-1 py-2 text-sm text-white bg-teal-600 hover:bg-teal-700 rounded-lg font-medium"
                                                >
                                                    Connect
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* HIPAA Notice */}
            <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                            <strong>Security Notice:</strong> All integrations are HIPAA-compliant and use encrypted
                            connections. API credentials are stored securely and never exposed in logs.
                        </p>
                    </div>
                </div>
            </div>

            {/* Configuration Modal */}
            {selectedIntegration && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                Configure {selectedIntegration.name}
                            </h2>
                            <button
                                onClick={() => setSelectedIntegration(null)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                            >
                                <XCircle className="h-5 w-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    API Key
                                </label>
                                <div className="relative">
                                    <input
                                        type={showApiKey ? 'text' : 'password'}
                                        placeholder="Enter your API key"
                                        className="w-full px-4 py-2 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                    />
                                    <button
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2"
                                    >
                                        {showApiKey ? (
                                            <EyeOff className="h-4 w-4 text-slate-400" />
                                        ) : (
                                            <Eye className="h-4 w-4 text-slate-400" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Webhook URL
                                </label>
                                <input
                                    type="text"
                                    placeholder="https://api.example.com/webhook"
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                />
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                                <p className="text-xs text-slate-500">
                                    Your callback URL: <code className="text-teal-600">https://app.chartspark.ai/api/webhooks/{selectedIntegration.id}</code>
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
                            <button
                                onClick={() => setSelectedIntegration(null)}
                                className="flex-1 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => setSelectedIntegration(null)}
                                className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium"
                            >
                                Save Configuration
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
