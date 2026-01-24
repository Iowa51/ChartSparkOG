/**
 * Super Admin: Clearinghouse Configuration Page
 * Manage connections to medical claims clearinghouses
 */

'use client';

import { useEffect, useState } from 'react';
import { Save, TestTube, CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ClearinghouseConfig {
    clearinghouse: string;
    api_endpoint: string;
    submitter_id: string;
    submitter_name: string;
    submitter_npi: string;
    submitter_tax_id: string;
    sftp_host: string;
    sftp_port: number;
    is_active: boolean;
    supports_era: boolean;
    last_connection_status: string | null;
    last_connection_test: string | null;
}

const DEFAULT_CONFIG: ClearinghouseConfig = {
    clearinghouse: '',
    api_endpoint: '',
    submitter_id: '',
    submitter_name: 'ChartSpark Health',
    submitter_npi: '',
    submitter_tax_id: '',
    sftp_host: '',
    sftp_port: 22,
    is_active: false,
    supports_era: true,
    last_connection_status: null,
    last_connection_test: null,
};

const CLEARINGHOUSES = [
    { id: 'office_ally', name: 'Office Ally', description: 'Popular for small practices' },
    { id: 'claim_md', name: 'Claim.MD', description: 'REST API based' },
    { id: 'availity', name: 'Availity', description: 'Enterprise solution' },
];

export default function ClearinghouseSettingsPage() {
    const [configs, setConfigs] = useState<ClearinghouseConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [testing, setTesting] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetchConfigs();
    }, []);

    async function fetchConfigs() {
        try {
            const res = await fetch('/api/managed-billing/admin/clearinghouse');
            if (res.ok) {
                const data = await res.json();
                setConfigs(data.configs || []);
            }
        } catch (error) {
            console.error('Failed to fetch configs:', error);
        } finally {
            setLoading(false);
        }
    }

    function getConfig(clearinghouse: string): ClearinghouseConfig {
        return configs.find(c => c.clearinghouse === clearinghouse) || {
            ...DEFAULT_CONFIG,
            clearinghouse,
        };
    }

    function updateLocalConfig(clearinghouse: string, updates: Partial<ClearinghouseConfig>) {
        setConfigs(prev => {
            const existing = prev.find(c => c.clearinghouse === clearinghouse);
            if (existing) {
                return prev.map(c => c.clearinghouse === clearinghouse ? { ...c, ...updates } : c);
            }
            return [...prev, { ...DEFAULT_CONFIG, clearinghouse, ...updates }];
        });
    }

    async function handleSave(clearinghouse: string) {
        setSaving(clearinghouse);
        setMessage(null);

        try {
            const config = getConfig(clearinghouse);
            const res = await fetch('/api/managed-billing/admin/clearinghouse', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Configuration saved successfully' });
                fetchConfigs();
            } else {
                setMessage({ type: 'error', text: 'Failed to save configuration' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to save configuration' });
        } finally {
            setSaving(null);
        }
    }

    async function handleTest(clearinghouse: string) {
        setTesting(clearinghouse);
        setMessage(null);

        try {
            const res = await fetch('/api/managed-billing/admin/clearinghouse/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clearinghouse }),
            });

            const result = await res.json();

            if (result.success) {
                setMessage({ type: 'success', text: 'Connection test successful!' });
            } else {
                setMessage({ type: 'error', text: `Connection failed: ${result.error}` });
            }

            fetchConfigs();
        } catch (error) {
            setMessage({ type: 'error', text: 'Connection test failed' });
        } finally {
            setTesting(null);
        }
    }

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center">
                <div className="animate-pulse text-slate-500">Loading...</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/super-admin"
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Clearinghouse Configuration
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Configure connections to medical claims clearinghouses
                    </p>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'success'
                        ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                    {message.type === 'success' ? (
                        <CheckCircle className="w-5 h-5" />
                    ) : (
                        <XCircle className="w-5 h-5" />
                    )}
                    {message.text}
                </div>
            )}

            {/* Clearinghouse Cards */}
            <div className="space-y-6">
                {CLEARINGHOUSES.map(ch => {
                    const config = getConfig(ch.id);

                    return (
                        <div
                            key={ch.id}
                            className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
                        >
                            {/* Card Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                        {ch.name}
                                    </h2>
                                    {config.last_connection_status === 'success' && (
                                        <span className="flex items-center gap-1 text-green-600 text-sm">
                                            <CheckCircle className="w-4 h-4" />
                                            Connected
                                        </span>
                                    )}
                                    {config.last_connection_status === 'failed' && (
                                        <span className="flex items-center gap-1 text-red-600 text-sm">
                                            <XCircle className="w-4 h-4" />
                                            Failed
                                        </span>
                                    )}
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.is_active}
                                        onChange={(e) => updateLocalConfig(ch.id, { is_active: e.target.checked })}
                                        className="rounded border-slate-300"
                                    />
                                    <span className="text-sm text-slate-600 dark:text-slate-400">Active</span>
                                </label>
                            </div>

                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                {ch.description}
                            </p>

                            {/* Configuration Fields */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Submitter ID
                                    </label>
                                    <input
                                        type="text"
                                        value={config.submitter_id}
                                        onChange={(e) => updateLocalConfig(ch.id, { submitter_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                        placeholder="Your submitter ID"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Submitter NPI
                                    </label>
                                    <input
                                        type="text"
                                        value={config.submitter_npi}
                                        onChange={(e) => updateLocalConfig(ch.id, { submitter_npi: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                        placeholder="10-digit NPI"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        SFTP Host
                                    </label>
                                    <input
                                        type="text"
                                        value={config.sftp_host}
                                        onChange={(e) => updateLocalConfig(ch.id, { sftp_host: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                        placeholder="sftp.clearinghouse.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        SFTP Port
                                    </label>
                                    <input
                                        type="number"
                                        value={config.sftp_port}
                                        onChange={(e) => updateLocalConfig(ch.id, { sftp_port: parseInt(e.target.value) || 22 })}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                        placeholder="22"
                                    />
                                </div>
                            </div>

                            {/* ERA Settings */}
                            <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.supports_era}
                                        onChange={(e) => updateLocalConfig(ch.id, { supports_era: e.target.checked })}
                                        className="rounded border-slate-300"
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">
                                        Enable ERA (Electronic Remittance Advice) receiving
                                    </span>
                                </label>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleSave(ch.id)}
                                    disabled={saving === ch.id}
                                    className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                                >
                                    <Save className="w-4 h-4" />
                                    {saving === ch.id ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                    onClick={() => handleTest(ch.id)}
                                    disabled={testing === ch.id}
                                    className="flex items-center gap-2 border border-slate-300 dark:border-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                                >
                                    <TestTube className="w-4 h-4" />
                                    {testing === ch.id ? 'Testing...' : 'Test Connection'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Setup Instructions */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-amber-800 dark:text-amber-300">Setup Required</h3>
                        <p className="text-amber-700 dark:text-amber-400 text-sm mt-1">
                            To enable clearinghouse connectivity:
                        </p>
                        <ol className="list-decimal list-inside text-amber-700 dark:text-amber-400 text-sm mt-2 space-y-1">
                            <li>Create an account with a clearinghouse (Office Ally recommended)</li>
                            <li>Get your Submitter ID and SFTP credentials</li>
                            <li>Enter the credentials above and test the connection</li>
                            <li>Enable ERA receiving for automatic payment posting</li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    );
}
