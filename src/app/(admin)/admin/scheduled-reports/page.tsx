/**
 * Admin Scheduled Reports Page
 * Create and manage scheduled report delivery
 * Path: /admin/scheduled-reports
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
    ArrowLeft,
    Calendar,
    Clock,
    Plus,
    Trash2,
    Edit2,
    Mail,
    CheckCircle2,
    XCircle,
    Loader2,
    Play,
    Pause,
    RefreshCw,
    FileText,
    BarChart3,
    Users,
    DollarSign,
    AlertTriangle,
} from 'lucide-react';

interface ScheduledReport {
    id: string;
    name: string;
    report_type: 'billing' | 'claims' | 'user_activity' | 'provider_performance' | 'audit_summary';
    frequency: 'daily' | 'weekly' | 'monthly';
    day_of_week?: number;
    day_of_month?: number;
    time: string;
    recipients: string[];
    is_active: boolean;
    last_run?: string;
    next_run: string;
    created_at: string;
}

const REPORT_TYPES = [
    { id: 'billing', label: 'Billing Summary', icon: DollarSign, description: 'Revenue, claims, and billing metrics' },
    { id: 'claims', label: 'Claims Analytics', icon: FileText, description: 'Claim status and processing times' },
    { id: 'user_activity', label: 'User Activity', icon: Users, description: 'Login, usage, and engagement' },
    { id: 'provider_performance', label: 'Provider Performance', icon: BarChart3, description: 'Productivity and efficiency' },
    { id: 'audit_summary', label: 'Audit Summary', icon: AlertTriangle, description: 'Security events and access logs' },
];

const FREQUENCIES = [
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
];

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Demo scheduled reports
const DEMO_REPORTS: ScheduledReport[] = [
    {
        id: '1',
        name: 'Weekly Billing Summary',
        report_type: 'billing',
        frequency: 'weekly',
        day_of_week: 1,
        time: '08:00',
        recipients: ['admin@example.com', 'billing@example.com'],
        is_active: true,
        last_run: new Date(Date.now() - 7 * 86400000).toISOString(),
        next_run: new Date(Date.now() + 7 * 86400000).toISOString(),
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
        id: '2',
        name: 'Monthly Provider Report',
        report_type: 'provider_performance',
        frequency: 'monthly',
        day_of_month: 1,
        time: '09:00',
        recipients: ['director@example.com'],
        is_active: true,
        last_run: new Date(Date.now() - 30 * 86400000).toISOString(),
        next_run: new Date(Date.now() + 5 * 86400000).toISOString(),
        created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    },
];

export default function ScheduledReportsPage() {
    const supabase = createClient();
    const [reports, setReports] = useState<ScheduledReport[]>(DEMO_REPORTS);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        report_type: 'billing' as ScheduledReport['report_type'],
        frequency: 'weekly' as ScheduledReport['frequency'],
        day_of_week: 1,
        day_of_month: 1,
        time: '08:00',
        recipients: '',
    });

    const handleCreate = () => {
        setEditingReport(null);
        setFormData({
            name: '',
            report_type: 'billing',
            frequency: 'weekly',
            day_of_week: 1,
            day_of_month: 1,
            time: '08:00',
            recipients: '',
        });
        setShowModal(true);
    };

    const handleEdit = (report: ScheduledReport) => {
        setEditingReport(report);
        setFormData({
            name: report.name,
            report_type: report.report_type,
            frequency: report.frequency,
            day_of_week: report.day_of_week || 1,
            day_of_month: report.day_of_month || 1,
            time: report.time,
            recipients: report.recipients.join(', '),
        });
        setShowModal(true);
    };

    const handleSave = () => {
        const recipientList = formData.recipients.split(',').map(e => e.trim()).filter(Boolean);

        if (editingReport) {
            setReports(prev => prev.map(r =>
                r.id === editingReport.id
                    ? { ...r, ...formData, recipients: recipientList }
                    : r
            ));
        } else {
            const newReport: ScheduledReport = {
                id: Date.now().toString(),
                ...formData,
                recipients: recipientList,
                is_active: true,
                next_run: new Date(Date.now() + 86400000).toISOString(),
                created_at: new Date().toISOString(),
            };
            setReports(prev => [...prev, newReport]);
        }
        setShowModal(false);
    };

    const handleDelete = (id: string) => {
        if (confirm('Delete this scheduled report?')) {
            setReports(prev => prev.filter(r => r.id !== id));
        }
    };

    const handleToggle = (id: string) => {
        setReports(prev => prev.map(r =>
            r.id === id ? { ...r, is_active: !r.is_active } : r
        ));
    };

    const handleRunNow = (id: string) => {
        alert('Report generation started. You will receive an email when it\'s ready.');
        setReports(prev => prev.map(r =>
            r.id === id ? { ...r, last_run: new Date().toISOString() } : r
        ));
    };

    const getReportIcon = (type: string) => {
        const reportType = REPORT_TYPES.find(t => t.id === type);
        return reportType?.icon || FileText;
    };

    const formatNextRun = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.ceil((date.getTime() - now.getTime()) / 86400000);

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays < 7) return `In ${diffDays} days`;
        return date.toLocaleDateString();
    };

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Scheduled Reports</h1>
                        <p className="text-slate-500 mt-1">Automate report delivery to your team</p>
                    </div>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium"
                >
                    <Plus className="h-4 w-4" />
                    New Schedule
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-sm text-slate-500">Total Schedules</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{reports.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-sm text-slate-500">Active</p>
                    <p className="text-2xl font-bold text-emerald-600">{reports.filter(r => r.is_active).length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-sm text-slate-500">Paused</p>
                    <p className="text-2xl font-bold text-slate-400">{reports.filter(r => !r.is_active).length}</p>
                </div>
            </div>

            {/* Reports List */}
            <div className="space-y-4">
                {reports.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
                        <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 mb-4">No scheduled reports yet</p>
                        <button
                            onClick={handleCreate}
                            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl"
                        >
                            Create your first schedule
                        </button>
                    </div>
                ) : (
                    reports.map((report) => {
                        const Icon = getReportIcon(report.report_type);

                        return (
                            <div
                                key={report.id}
                                className={`bg-white dark:bg-slate-900 rounded-xl border p-5 ${report.is_active
                                        ? 'border-slate-200 dark:border-slate-800'
                                        : 'border-slate-200 dark:border-slate-800 opacity-60'
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2 rounded-lg ${report.is_active
                                                ? 'bg-teal-100 dark:bg-teal-900/30'
                                                : 'bg-slate-100 dark:bg-slate-800'
                                            }`}>
                                            <Icon className={`h-5 w-5 ${report.is_active ? 'text-teal-600' : 'text-slate-400'
                                                }`} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white">{report.name}</h3>
                                            <p className="text-sm text-slate-500 mt-1">
                                                {REPORT_TYPES.find(t => t.id === report.report_type)?.label}
                                            </p>
                                            <div className="flex items-center gap-4 mt-2 text-sm">
                                                <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {report.frequency.charAt(0).toUpperCase() + report.frequency.slice(1)} at {report.time}
                                                    {report.frequency === 'weekly' && ` (${DAYS_OF_WEEK[report.day_of_week || 0]})`}
                                                    {report.frequency === 'monthly' && ` (Day ${report.day_of_month})`}
                                                </span>
                                                <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                                    <Mail className="h-3.5 w-3.5" />
                                                    {report.recipients.length} recipient{report.recipients.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-2">
                                                Next run: {formatNextRun(report.next_run)}
                                                {report.last_run && ` • Last run: ${new Date(report.last_run).toLocaleDateString()}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleRunNow(report.id)}
                                            className="p-2 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg"
                                            title="Run now"
                                        >
                                            <Play className="h-4 w-4 text-teal-600" />
                                        </button>
                                        <button
                                            onClick={() => handleToggle(report.id)}
                                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                            title={report.is_active ? 'Pause' : 'Resume'}
                                        >
                                            {report.is_active ? (
                                                <Pause className="h-4 w-4 text-slate-400" />
                                            ) : (
                                                <Play className="h-4 w-4 text-slate-400" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleEdit(report)}
                                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                        >
                                            <Edit2 className="h-4 w-4 text-slate-400" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(report.id)}
                                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                        >
                                            <Trash2 className="h-4 w-4 text-red-400" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                {editingReport ? 'Edit Schedule' : 'New Scheduled Report'}
                            </h2>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Schedule Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Weekly Billing Summary"
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Report Type
                                </label>
                                <select
                                    value={formData.report_type}
                                    onChange={(e) => setFormData({ ...formData, report_type: e.target.value as any })}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                >
                                    {REPORT_TYPES.map(type => (
                                        <option key={type.id} value={type.id}>{type.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Frequency
                                    </label>
                                    <select
                                        value={formData.frequency}
                                        onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                    >
                                        {FREQUENCIES.map(f => (
                                            <option key={f.id} value={f.id}>{f.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Time
                                    </label>
                                    <input
                                        type="time"
                                        value={formData.time}
                                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                    />
                                </div>
                            </div>

                            {formData.frequency === 'weekly' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Day of Week
                                    </label>
                                    <select
                                        value={formData.day_of_week}
                                        onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                    >
                                        {DAYS_OF_WEEK.map((day, idx) => (
                                            <option key={idx} value={idx}>{day}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {formData.frequency === 'monthly' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Day of Month
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={28}
                                        value={formData.day_of_month}
                                        onChange={(e) => setFormData({ ...formData, day_of_month: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Recipients (comma-separated emails)
                                </label>
                                <textarea
                                    value={formData.recipients}
                                    onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                                    placeholder="admin@example.com, billing@example.com"
                                    rows={2}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl resize-none"
                                />
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
                                disabled={!formData.name || !formData.recipients}
                                className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-xl font-medium"
                            >
                                {editingReport ? 'Save Changes' : 'Create Schedule'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
