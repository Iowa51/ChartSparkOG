"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    ClipboardList,
    Search,
    Filter,
    Download,
    Calendar,
    User,
    X,
} from "lucide-react";

interface AuditLog {
    id: string;
    user_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    details: any;
    ip_address: string | null;
    created_at: string;
    users?: { first_name: string; last_name: string; email: string; role: string } | null;
}

export default function AuditLogsPage() {
    const supabase = createClient();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [actionFilter, setActionFilter] = useState<string>("ALL");
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select(`
                    *,
                    users(first_name, last_name, email, role)
                `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error("Error fetching audit logs:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.entity_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (log.users?.email || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesAction = actionFilter === "ALL" || log.action === actionFilter;
        return matchesSearch && matchesAction;
    });

    const uniqueActions = [...new Set(logs.map(l => l.action))];

    const handleExportCSV = () => {
        alert("CSV export would be generated here.");
    };

    const getActionColor = (action: string) => {
        if (action.includes('create') || action.includes('add')) return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40';
        if (action.includes('update') || action.includes('edit')) return 'text-blue-600 bg-blue-100 dark:bg-blue-900/40';
        if (action.includes('delete') || action.includes('remove')) return 'text-red-600 bg-red-100 dark:bg-red-900/40';
        return 'text-slate-600 bg-slate-100 dark:bg-slate-800';
    };

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                        Audit Logs
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Complete audit trail of platform activities
                    </p>
                </div>
                <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-medium transition-colors"
                >
                    <Download className="h-5 w-5" />
                    Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by action, entity, or user..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none"
                    />
                </div>
                <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none"
                >
                    <option value="ALL">All Actions</option>
                    {uniqueActions.map(action => (
                        <option key={action} value={action}>{action}</option>
                    ))}
                </select>
            </div>

            {/* Logs Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Entity</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">IP Address</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    Loading logs...
                                </td>
                            </tr>
                        ) : filteredLogs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    No audit logs found
                                </td>
                            </tr>
                        ) : (
                            filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            {new Date(log.created_at).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {log.users ? (
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                                    <User className="h-4 w-4 text-slate-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                        {log.users.first_name} {log.users.last_name}
                                                    </p>
                                                    <p className="text-xs text-slate-500">{log.users.role}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-slate-400">System</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(log.action)}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-slate-900 dark:text-white">{log.entity_type}</p>
                                        <p className="text-xs text-slate-500 font-mono">{log.entity_id?.slice(0, 8)}...</p>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                                        {log.ip_address || '—'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {log.details && (
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="text-sm text-primary hover:underline"
                                            >
                                                View
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Details Modal */}
            {selectedLog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                Log Details
                            </h2>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Action</p>
                                    <p className="text-slate-900 dark:text-white font-medium">{selectedLog.action}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Entity</p>
                                    <p className="text-slate-900 dark:text-white">{selectedLog.entity_type} ({selectedLog.entity_id})</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Timestamp</p>
                                    <p className="text-slate-900 dark:text-white">{new Date(selectedLog.created_at).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Details (JSON)</p>
                                    <pre className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs overflow-auto max-h-48">
                                        {JSON.stringify(selectedLog.details, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
