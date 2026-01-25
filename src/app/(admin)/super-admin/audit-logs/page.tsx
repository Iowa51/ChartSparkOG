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
    Filter,
    Search,
    Eye,
    Clock,
    User,
    MapPin,
    FileText,
    Loader2,
} from 'lucide-react';

// Types from audit-log
type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type AuditEventType = string;

interface AuditLogEntry {
    id: string;
    timestamp: Date;
    eventType: AuditEventType;
    userId?: string;
    userEmail?: string;
    userRole?: string;
    organizationId?: string;
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

export default function AuditLogsPage() {
    const supabase = createClient();
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRisk, setSelectedRisk] = useState<RiskLevel | 'ALL'>('ALL');
    const [phiOnly, setPhiOnly] = useState(false);
    const [expandedLog, setExpandedLog] = useState<string | null>(null);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (fetchError) throw fetchError;

            // Transform database records to our interface
            const transformedLogs: AuditLogEntry[] = (data || []).map((row: any) => ({
                id: row.id,
                timestamp: new Date(row.created_at),
                eventType: row.event_type || row.action || 'UNKNOWN',
                userId: row.user_id,
                userEmail: row.user_email,
                userRole: row.user_role,
                organizationId: row.organization_id,
                ipAddress: row.ip_address,
                userAgent: row.user_agent,
                resourceType: row.resource_type,
                resourceId: row.resource_id,
                details: row.details,
                phiAccessed: row.phi_accessed || false,
                riskLevel: (row.risk_level as RiskLevel) || 'LOW',
            }));

            setLogs(transformedLogs);
        } catch (err) {
            console.error('Error loading audit logs:', err);
            setError('Failed to load audit logs. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            if (!log.userEmail?.toLowerCase().includes(search) &&
                !log.eventType.toLowerCase().includes(search) &&
                !log.ipAddress?.includes(search)) {
                return false;
            }
        }
        if (selectedRisk !== 'ALL' && log.riskLevel !== selectedRisk) return false;
        if (phiOnly && !log.phiAccessed) return false;
        return true;
    });

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

    if (loading) {
        return (
            <div className="flex-1 p-6 lg:p-8 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
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
                    <Link href="/super-admin" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Security Audit Logs</h1>
                        <p className="text-slate-500 mt-1">HIPAA-compliant activity monitoring</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadLogs} className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <RefreshCw className="h-4 w-4" /> Refresh
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl transition-colors">
                        <Download className="h-4 w-4" /> Export
                    </button>
                </div>
            </div>

            {/* Stats - Now Clickable */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div
                    onClick={() => { setSelectedRisk('ALL'); setPhiOnly(false); }}
                    className={`bg-white dark:bg-slate-900 rounded-xl border transition-all cursor-pointer hover:shadow-md ${selectedRisk === 'ALL' && !phiOnly ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-slate-200 dark:border-slate-800'} p-4`}
                >
                    <p className="text-sm text-slate-500">Total Events</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                </div>
                <div
                    onClick={() => { setSelectedRisk('CRITICAL'); setPhiOnly(false); }}
                    className={`rounded-xl border transition-all cursor-pointer hover:shadow-md ${selectedRisk === 'CRITICAL' ? 'border-red-500 ring-2 ring-red-200 dark:ring-red-800' : 'border-red-100 dark:border-red-900/30'} bg-red-50 dark:bg-red-900/20 p-4`}
                >
                    <p className="text-sm text-red-600">Critical</p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.critical}</p>
                </div>
                <div
                    onClick={() => { setSelectedRisk('HIGH'); setPhiOnly(false); }}
                    className={`rounded-xl border transition-all cursor-pointer hover:shadow-md ${selectedRisk === 'HIGH' ? 'border-orange-500 ring-2 ring-orange-200 dark:ring-orange-800' : 'border-orange-100 dark:border-orange-900/30'} bg-orange-50 dark:bg-orange-900/20 p-4`}
                >
                    <p className="text-sm text-orange-600">High</p>
                    <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{stats.high}</p>
                </div>
                <div
                    onClick={() => { setPhiOnly(true); setSelectedRisk('ALL'); }}
                    className={`rounded-xl border transition-all cursor-pointer hover:shadow-md ${phiOnly ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-blue-100 dark:border-blue-900/30'} bg-blue-50 dark:bg-blue-900/20 p-4`}
                >
                    <p className="text-sm text-blue-600">PHI Access</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.phiAccess}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" />
                        </div>
                    </div>
                    <select value={selectedRisk} onChange={(e) => setSelectedRisk(e.target.value as RiskLevel | 'ALL')}
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                        <option value="ALL">All Risks</option>
                        <option value="CRITICAL">Critical</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                    </select>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={phiOnly} onChange={(e) => setPhiOnly(e.target.checked)} className="rounded" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">PHI Only</span>
                    </label>
                </div>
            </div>

            {/* Logs */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredLogs.map((log) => {
                        const riskStyle = RISK_COLORS[log.riskLevel];
                        const RiskIcon = riskStyle.icon;
                        const isExpanded = expandedLog === log.id;
                        return (
                            <div key={log.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <div className="flex items-start gap-4 cursor-pointer" onClick={() => setExpandedLog(isExpanded ? null : log.id)}>
                                    <div className={`p-2 rounded-xl ${riskStyle.bg}`}><RiskIcon className={`h-5 w-5 ${riskStyle.text}`} /></div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${riskStyle.bg} ${riskStyle.text}`}>{log.riskLevel}</span>
                                            <span className="font-medium text-slate-900 dark:text-white">{log.eventType.replace(/_/g, ' ')}</span>
                                            {log.phiAccessed && <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">PHI</span>}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-slate-500">
                                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatTime(log.timestamp)}</span>
                                            {log.userEmail && <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{log.userEmail}</span>}
                                            {log.ipAddress && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{log.ipAddress}</span>}
                                        </div>
                                    </div>
                                    <Eye className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </div>
                                {isExpanded && log.details && (
                                    <div className="mt-4 ml-14 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                        <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Event Details</p>
                                        <div className="space-y-2">
                                            {Object.entries(log.details).map(([key, value]) => (
                                                <div key={key} className="flex items-start gap-3 text-sm">
                                                    <span className="font-medium text-slate-600 dark:text-slate-400 min-w-[120px] capitalize">
                                                        {key.replace(/_/g, ' ')}:
                                                    </span>
                                                    <span className="text-slate-800 dark:text-slate-200">
                                                        {typeof value === 'boolean'
                                                            ? (value ? 'Yes' : 'No')
                                                            : typeof value === 'object'
                                                                ? JSON.stringify(value)
                                                                : String(value)
                                                        }
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {filteredLogs.length === 0 && (
                        <div className="p-12 text-center">
                            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">No audit logs match your filters</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
