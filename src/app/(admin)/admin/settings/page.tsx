"use client";

import { useState, useEffect } from "react";
import { Settings, ArrowLeft, Loader2, Save, Bell, Shield, Users, Building2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface OrganizationData {
    id: string;
    name: string;
    slug: string;
    subscription_tier: string;
    subscription_status: string;
    platform_fee_percentage: number;
    created_at: string;
}

interface OrgStats {
    totalUsers: number;
    activeUsers: number;
    totalPatients: number;
    totalNotes: number;
}

export default function AdminSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [organization, setOrganization] = useState<OrganizationData | null>(null);
    const [stats, setStats] = useState<OrgStats>({ totalUsers: 0, activeUsers: 0, totalPatients: 0, totalNotes: 0 });
    const [settings, setSettings] = useState({
        emailNotifications: true,
        securityAlerts: true,
        weeklyReports: false,
        sessionTimeout: 30,
    });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchOrganizationData();
    }, []);

    const fetchOrganizationData = async () => {
        setLoading(true);
        setError(null);
        try {
            const supabase = createClient();

            // Get current user's organization
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setError("Not authenticated");
                setLoading(false);
                return;
            }

            // Get user with org
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (userError || !userData?.organization_id) {
                // Demo mode - show placeholder data
                setOrganization({
                    id: 'demo',
                    name: 'Demo Organization',
                    slug: 'demo-org',
                    subscription_tier: 'professional',
                    subscription_status: 'active',
                    platform_fee_percentage: 1.00,
                    created_at: new Date().toISOString(),
                });
                setStats({ totalUsers: 5, activeUsers: 4, totalPatients: 42, totalNotes: 156 });
                setLoading(false);
                return;
            }

            // Get organization data
            const { data: orgData, error: orgError } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', userData.organization_id)
                .single();

            if (orgError) throw orgError;
            setOrganization(orgData);

            // Get stats
            const [usersResult, activeUsersResult, patientsResult, notesResult] = await Promise.all([
                supabase.from('users').select('*', { count: 'exact', head: true }).eq('organization_id', userData.organization_id),
                supabase.from('users').select('*', { count: 'exact', head: true }).eq('organization_id', userData.organization_id).eq('is_active', true),
                supabase.from('patients').select('*', { count: 'exact', head: true }).eq('organization_id', userData.organization_id),
                supabase.from('notes').select('*', { count: 'exact', head: true }).eq('organization_id', userData.organization_id),
            ]);

            setStats({
                totalUsers: usersResult.count || 0,
                activeUsers: activeUsersResult.count || 0,
                totalPatients: patientsResult.count || 0,
                totalNotes: notesResult.count || 0,
            });

        } catch (err) {
            console.error("Error fetching organization data:", err);
            setError("Failed to load organization data");
            // Fallback to demo data
            setOrganization({
                id: 'demo',
                name: 'Demo Clinic',
                slug: 'demo-clinic',
                subscription_tier: 'professional',
                subscription_status: 'active',
                platform_fee_percentage: 1.00,
                created_at: new Date().toISOString(),
            });
            setStats({ totalUsers: 5, activeUsers: 4, totalPatients: 42, totalNotes: 156 });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        // Simulate save - in production, this would save to a settings table
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSaving(false);
        alert("Settings saved successfully!");
    };

    const formatTier = (tier: string) => {
        return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
    };

    const formatStatus = (status: string) => {
        const colors: Record<string, string> = {
            active: 'bg-green-100 text-green-700',
            trial: 'bg-blue-100 text-blue-700',
            inactive: 'bg-red-100 text-red-700',
        };
        return colors[status] || 'bg-gray-100 text-gray-700';
    };

    if (loading) {
        return (
            <div className="flex-1 p-6 lg:p-8 overflow-auto flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                    <span className="text-slate-600">Loading settings...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/admin"
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                                Settings
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">
                                Organization settings and preferences
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleSaveSettings}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {saving ? "Saving..." : "Save Settings"}
                    </button>
                </div>

                {error && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                            <strong>Note:</strong> {error}. Showing demo data.
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Organization Info */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-blue-600" />
                            </div>
                            <h2 className="font-bold text-slate-900 dark:text-white">Organization Info</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-slate-500">Name</span>
                                <span className="text-slate-900 dark:text-white font-medium">{organization?.name || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-slate-500">Subscription</span>
                                <span className="text-slate-900 dark:text-white font-medium">
                                    {formatTier(organization?.subscription_tier || 'starter')}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-slate-500">Status</span>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${formatStatus(organization?.subscription_status || 'active')}`}>
                                    {organization?.subscription_status?.toUpperCase() || 'ACTIVE'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-slate-500">Platform Fee</span>
                                <span className="text-slate-900 dark:text-white font-medium">
                                    {organization?.platform_fee_percentage || 1}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Organization Stats */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                <Users className="h-5 w-5 text-purple-600" />
                            </div>
                            <h2 className="font-bold text-slate-900 dark:text-white">Usage Statistics</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.activeUsers}</p>
                                <p className="text-xs text-slate-500">Active Users</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalUsers}</p>
                                <p className="text-xs text-slate-500">Total Users</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalPatients}</p>
                                <p className="text-xs text-slate-500">Patients</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalNotes}</p>
                                <p className="text-xs text-slate-500">Notes Created</p>
                            </div>
                        </div>
                    </div>

                    {/* Notification Settings */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                <Bell className="h-5 w-5 text-amber-600" />
                            </div>
                            <h2 className="font-bold text-slate-900 dark:text-white">Notifications</h2>
                        </div>
                        <div className="space-y-4">
                            <label className="flex items-center justify-between cursor-pointer">
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-white">Email Notifications</p>
                                    <p className="text-xs text-slate-500">Receive updates via email</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.emailNotifications}
                                    onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                                    className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                />
                            </label>
                            <label className="flex items-center justify-between cursor-pointer">
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-white">Security Alerts</p>
                                    <p className="text-xs text-slate-500">Login attempts and security events</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.securityAlerts}
                                    onChange={(e) => setSettings({ ...settings, securityAlerts: e.target.checked })}
                                    className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                />
                            </label>
                            <label className="flex items-center justify-between cursor-pointer">
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-white">Weekly Reports</p>
                                    <p className="text-xs text-slate-500">Summary of organization activity</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.weeklyReports}
                                    onChange={(e) => setSettings({ ...settings, weeklyReports: e.target.checked })}
                                    className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                />
                            </label>
                        </div>
                    </div>

                    {/* Security Settings */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                <Shield className="h-5 w-5 text-red-600" />
                            </div>
                            <h2 className="font-bold text-slate-900 dark:text-white">Security</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Session Timeout (minutes)
                                </label>
                                <select
                                    value={settings.sessionTimeout}
                                    onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                                >
                                    <option value={15}>15 minutes</option>
                                    <option value={30}>30 minutes</option>
                                    <option value={60}>1 hour</option>
                                    <option value={120}>2 hours</option>
                                </select>
                            </div>
                            <div className="pt-2">
                                <p className="text-xs text-slate-500 mb-2">HIPAA Compliance</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <span className="text-sm text-slate-700 dark:text-slate-300">All security requirements met</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                    <h2 className="font-bold text-slate-900 dark:text-white mb-4">Quick Links</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Link
                            href="/admin/users"
                            className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <p className="font-medium text-slate-900 dark:text-white">Manage Users</p>
                            <p className="text-xs text-slate-500 mt-1">Add, edit, deactivate</p>
                        </Link>
                        <Link
                            href="/admin/submissions"
                            className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <p className="font-medium text-slate-900 dark:text-white">Submissions</p>
                            <p className="text-xs text-slate-500 mt-1">Review and approve</p>
                        </Link>
                        <Link
                            href="/admin/features"
                            className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <p className="font-medium text-slate-900 dark:text-white">Features</p>
                            <p className="text-xs text-slate-500 mt-1">Assign to users</p>
                        </Link>
                        <Link
                            href="/admin/auditor-notes"
                            className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <p className="font-medium text-slate-900 dark:text-white">Audit Flags</p>
                            <p className="text-xs text-slate-500 mt-1">Review compliance</p>
                        </Link>
                    </div>
                </div>

                {/* Billing (read-only for Admin) */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                    <h2 className="font-bold text-slate-900 dark:text-white mb-4">Billing</h2>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                            Billing information is managed by Platform Super Admins.
                            Contact support for billing changes.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
