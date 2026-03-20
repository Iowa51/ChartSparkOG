/**
 * Admin Security Audit Logs Page
 * Task 1.1: Admin-scoped audit log viewer
 * Path: /admin/security/audit-logs
 * 
 * This page allows organization admins to view audit logs
 * for their organization only (org-isolated).
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
    ArrowLeft,
    Shield,
    AlertTriangle,
    AlertCircle,
    Info,
    RefreshCw,
    Download,
    Search,
    Filter,
    Calendar,
    ChevronDown,
    Eye,
    Clock,
    User,
    MapPin,
    FileText,
    Loader2,
    X,
} from 'lucide-react';

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface AuditLogEntry {
    id: string;
    timestamp: Date;
    eventType: string;
    userId?: string;
    userEmail?: string;
    userRole?: string;
    ipAddress?: string;
    userAgent?: string;
    resourceType?: string;
    resourceId?: string;
    details?: Record<string, any>;
    phiAccessed?: boolean;
    riskLevel: RiskLevel;
}

const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; icon: any }> = {
    CRITICAL: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: AlertCircle },
    HIGH: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', icon: AlertTriangle },
    MEDIUM: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', icon: Info },
    LOW: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', icon: Shield },
};

const EVENT_TYPES = [
    'ALL',
    'LOGIN_SUCCESS',
    'LOGIN_FAILURE',
    'LOGOUT',
    'PATIENT_VIEW',
    'PATIENT_CREATE',
    'PATIENT_UPDATE',
    'PATIENT_DELETE',
    'NOTE_VIEW',
    'NOTE_CREATE',
    'NOTE_UPDATE',
    'NOTE_DELETE',
    'PHI_EXPORT',
    'UNAUTHORIZED_ACCESS',
];

export default function AdminAuditLogsPage() {
    const supabase = createClient();
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRisk, setSelectedRisk] = useState<RiskLevel | 'ALL'>('ALL');
    const [selectedEventType, setSelectedEventType] = useState('ALL');
    const [phiOnly, setPhiOnly] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 50;

    // Expanded row
    const [expandedLog, setExpandedLog] = useState<string | null>(null);

    useEffect(() => {
        loadLogs();
    }, [page]);

    const loadLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            // Get current user's organization
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: profile } = await supabase
                .from('users')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (!profile?.organization_id) {
                throw new Error('Organization not found');
            }

            // Build query with org filter
            let query = supabase
                .from('audit_logs')
                .select('*', { count: 'exact' })
                .eq('organization_id', profile.organization_id)
                .order('created_at', { ascending: false })
                .range((page - 1) * pageSize, page * pageSize - 1);

            const { data, error: fetchError, count } = await query;

            if (fetchError) throw fetchError;

            // Transform database records
            const transformedLogs: AuditLogEntry[] = (data || []).map((row: any) => ({
                id: row.id,
                timestamp: new Date(row.created_at),
                eventType: row.event_type || 'UNKNOWN',
                userId: row.user_id,
                userEmail: row.user_email,
                userRole: row.user_role,
                ipAddress: row.ip_address,
                userAgent: row.user_agent,
                resourceType: row.resource_type,
                resourceId: row.resource_id,
                details: row.details,
                phiAccessed: row.phi_accessed || false,
                riskLevel: (row.risk_level as RiskLevel) || 'LOW',
            }));

            setLogs(transformedLogs);
            setTotalCount(count || 0);

            // Log this view action (meta-audit)
            await supabase.from('audit_logs').insert({
                event_type: 'AUDIT_LOG_VIEW',
                user_id: user.id,
                user_email: user.email,
                organization_id: profile.organization_id,
                resource_type: 'audit_logs',
                details: { page, resultCount: transformedLogs.length },
                phi_accessed: false,
                risk_level: 'LOW',
            });

        } catch (err: any) {
            console.error('Error loading audit logs:', err);
            setError(err.message || 'Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            if (!log.userEmail?.toLowerCase().includes(search) &&
                !log.eventType.toLowerCase().includes(search) &&
                !log.ipAddress?.includes(search) &&
                !log.resourceId?.toLowerCase().includes(search)) {
                return false;
            }
        }
        if (selectedRisk !== 'ALL' && log.riskLevel !== selectedRisk) return false;
        if (selectedEventType !== 'ALL' && log.eventType !== selectedEventType) return false;
        if (phiOnly && !log.phiAccessed) return false;
        if (dateFrom && log.timestamp < new Date(dateFrom)) return false;
        if (dateTo && log.timestamp > new Date(dateTo + 'T23:59:59')) return false;
        return true;
    });

    const handleExport = async () => {
        setExporting(true);
        try {
            // Generate CSV
            const headers = ['Timestamp', 'Event Type', 'User Email', 'IP Address', 'Resource', 'PHI Accessed', 'Risk Level', 'Details'];
            const rows = filteredLogs.map(log => [
                log.timestamp.toISOString(),
                log.eventType,
                log.userEmail || '',
                log.ipAddress || '',
                log.resourceType ? `${log.resourceType}/${log.resourceId || ''}` : '',
                log.phiAccessed ? 'Yes' : 'No',
                log.riskLevel,
                JSON.stringify(log.details || {}),
            ]);

            const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');

            // Download
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export error:', err);
        } finally {
            setExporting(false);
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
    };

    const stats = {
        total: logs.length,
        critical: logs.filter(l => l.riskLevel === 'CRITICAL').length,
        high: logs.filter(l => l.riskLevel === 'HIGH').length,
        phiAccess: logs.filter(l => l.phiAccessed).length,
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedRisk('ALL');
        setSelectedEventType('ALL');
        setPhiOnly(false);
        setDateFrom('');
        setDateTo('');
    };

    const hasActiveFilters = searchTerm || selectedRisk !== 'ALL' || selectedEventType !== 'ALL' || phiOnly || dateFrom || dateTo;

    if (loading && logs.length === 0) {
        return (
            <div className="flex-1 p-6 lg:p-8 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-4" />
                    <p className="text-slate-500">Loading audit logs...</p>
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
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Security Audit Logs</h1>
                        <p className="text-slate-500 mt-1">HIPAA-compliant activity monitoring for your organization</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadLogs}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={exporting || filteredLogs.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-xl transition-colors"
                    >
                        {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
                    <p className="text-red-800 dark:text-red-200">{error}</p>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-sm text-slate-500">Total Events</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalCount.toLocaleString()}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-sm text-red-600">Critical</p>
                    <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-sm text-orange-600">High Risk</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.high}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-sm text-blue-600">PHI Access</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.phiAccess}</p>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search email, event, IP..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                    </div>

                    {/* Risk Filter */}
                    <select
                        value={selectedRisk}
                        onChange={(e) => setSelectedRisk(e.target.value as RiskLevel | 'ALL')}
                        className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                    >
                        <option value="ALL">All Risk Levels</option>
                        <option value="CRITICAL">Critical</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                    </select>

                    {/* Event Type Filter */}
                    <select
                        value={selectedEventType}
                        onChange={(e) => setSelectedEventType(e.target.value)}
                        className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                    >
                        {EVENT_TYPES.map(type => (
                            <option key={type} value={type}>{type === 'ALL' ? 'All Event Types' : type.replace(/_/g, ' ')}</option>
                        ))}
                    </select>

                    {/* PHI Only Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={phiOnly}
                            onChange={(e) => setPhiOnly(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-sm text-slate-600 dark:text-slate-400">PHI Only</span>
                    </label>

                    {/* More Filters Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                    >
                        <Filter className="h-4 w-4" />
                        More
                        <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1 px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm"
                        >
                            <X className="h-4 w-4" />
                            Clear
                        </button>
                    )}
                </div>

                {/* Extended Filters */}
                {showFilters && (
                    <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">From Date</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">To Date</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Logs Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Time</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Event</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">User</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">IP Address</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Resource</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Risk</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">PHI</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                                        {hasActiveFilters ? 'No logs match your filters' : 'No audit logs found'}
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => {
                                    const riskStyle = RISK_COLORS[log.riskLevel];
                                    const RiskIcon = riskStyle.icon;

                                    return (
                                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Clock className="h-4 w-4 text-slate-400" />
                                                    <span className="text-slate-900 dark:text-white">{formatTime(log.timestamp)}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-mono text-slate-900 dark:text-white">
                                                    {log.eventType.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-slate-400" />
                                                    <span className="text-sm text-slate-600 dark:text-slate-300 truncate max-w-[150px]">
                                                        {log.userEmail || '—'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="h-4 w-4 text-slate-400" />
                                                    <span className="text-sm font-mono text-slate-600 dark:text-slate-300">
                                                        {log.ipAddress || '—'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {log.resourceType ? (
                                                    <span className="text-sm text-slate-600 dark:text-slate-300">
                                                        {log.resourceType}
                                                        {log.resourceId && <span className="text-slate-400">/{log.resourceId.slice(0, 8)}...</span>}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${riskStyle.bg} ${riskStyle.text}`}>
                                                    <RiskIcon className="h-3 w-3" />
                                                    {log.riskLevel}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {log.phiAccessed ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                                                        <FileText className="h-3 w-3" />
                                                        Yes
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-slate-400">No</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                                >
                                                    <Eye className="h-4 w-4 text-slate-400" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalCount > pageSize && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-sm text-slate-500">
                            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={page * pageSize >= totalCount}
                                className="px-3 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {expandedLog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-auto shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Event Details</h2>
                            <button
                                onClick={() => setExpandedLog(null)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                            >
                                <X className="h-5 w-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-6">
                            {(() => {
                                const log = filteredLogs.find(l => l.id === expandedLog);
                                if (!log) return null;

                                return (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-slate-500">Timestamp</p>
                                                <p className="font-medium text-slate-900 dark:text-white">{log.timestamp.toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-500">Event Type</p>
                                                <p className="font-medium text-slate-900 dark:text-white">{log.eventType}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-500">User</p>
                                                <p className="font-medium text-slate-900 dark:text-white">{log.userEmail || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-500">Role</p>
                                                <p className="font-medium text-slate-900 dark:text-white">{log.userRole || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-500">IP Address</p>
                                                <p className="font-mono text-slate-900 dark:text-white">{log.ipAddress || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-500">Risk Level</p>
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${RISK_COLORS[log.riskLevel].bg} ${RISK_COLORS[log.riskLevel].text}`}>
                                                    {log.riskLevel}
                                                </span>
                                            </div>
                                        </div>

                                        {log.userAgent && (
                                            <div>
                                                <p className="text-sm text-slate-500">User Agent</p>
                                                <p className="text-sm font-mono text-slate-600 dark:text-slate-400 break-all">{log.userAgent}</p>
                                            </div>
                                        )}

                                        {log.details && Object.keys(log.details).length > 0 && (
                                            <div>
                                                <p className="text-sm text-slate-500 mb-2">Additional Details</p>
                                                <pre className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm font-mono overflow-auto">
                                                    {JSON.stringify(log.details, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
