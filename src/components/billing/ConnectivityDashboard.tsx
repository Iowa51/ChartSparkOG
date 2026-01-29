"use client";

import {
    Activity,
    Wifi,
    WifiOff,
    Server,
    ShieldCheck,
    Lock,
    RefreshCcw,
    CheckCircle2,
    AlertCircle,
    FileText
} from "lucide-react";
import { useState, useEffect } from "react";

/**
 * Connectivity Dashboard
 * 
 * Provides administrators with real-time status of clearinghouse 
 * connections, API health, and transaction logs.
 */
export function ConnectivityDashboard() {
    const [status, setStatus] = useState<'connected' | 'error' | 'testing'>('connected');
    const [lastSync, setLastSync] = useState(new Date().toLocaleTimeString());
    const [logs, setLogs] = useState([
        { id: 1, type: '837P', status: 'Success', time: '10:45 AM', message: 'Batch 1024 submitted' },
        { id: 2, type: '27CA', status: 'Notice', time: '11:12 AM', message: 'Acks downloaded (12 items)' },
        { id: 3, type: '835', status: 'Success', time: '11:20 AM', message: 'Payment Advice processed' },
        { id: 4, type: 'SFTP', status: 'Error', time: '12:05 PM', message: 'Connection timeout (Retry 1/3)', severity: 'warning' },
    ]);

    const triggerTest = () => {
        setStatus('testing');
        setTimeout(() => setStatus('connected'), 1500);
    };

    const clearAllLogs = () => {
        if (confirm("Are you sure you want to clear all transaction logs? This cannot be undone.")) {
            setLogs([]);
        }
    };

    const trashLog = (id: number) => {
        setLogs(prev => prev.filter(log => log.id !== id));
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <Server className="h-5 w-5 text-slate-500" />
                    </div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Edge Connectivity</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">System Observability</p>
                    </div>
                </div>
                <button
                    onClick={triggerTest}
                    disabled={status === 'testing'}
                    className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors group"
                >
                    <RefreshCcw className={`h-4 w-4 text-slate-400 group-hover:text-primary transition-all ${status === 'testing' ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="p-5 space-y-6 flex-1">
                {/* Connection Status */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-primary/20 transition-all cursor-default group">
                    <div className="flex items-center gap-3">
                        {status === 'connected' ? (
                            <div className="relative">
                                <Wifi className="h-5 w-5 text-emerald-500" />
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                            </div>
                        ) : status === 'testing' ? (
                            <Wifi className="h-5 w-5 text-blue-500 animate-pulse" />
                        ) : (
                            <WifiOff className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Office Ally SFTP</p>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                                {status === 'connected' ? 'Live Connection' : status === 'testing' ? 'Testing Link...' : 'Link Disconnected'}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Ping</p>
                        <p className="text-[10px] font-black text-emerald-500">24ms</p>
                    </div>
                </div>

                {/* Security Health */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20">
                        <div className="flex items-center gap-2 mb-1">
                            <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">RLS Status</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Enforced/Strict</p>
                    </div>
                    <div className="p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/20">
                        <div className="flex items-center gap-2 mb-1">
                            <Lock className="h-3.5 w-3.5 text-amber-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Encryption</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400">AES-256 Vault</p>
                    </div>
                </div>

                {/* Live Logs */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Activity className="h-3 w-3" />
                            Transaction Stream
                        </h5>
                        <button onClick={clearAllLogs} className="text-[8px] font-black text-red-500 uppercase hover:underline">Clear All</button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {logs.length === 0 ? (
                            <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">No active transactions</p>
                            </div>
                        ) : logs.map((log) => (
                            <div key={log.id} className="group flex items-start gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-slate-200 transition-all">
                                <div className={`mt-0.5 p-1 rounded-md ${log.status === 'Success' ? 'bg-emerald-50 text-emerald-500' :
                                    log.status === 'Notice' ? 'bg-blue-50 text-blue-500' : 'bg-red-50 text-red-500'
                                    }`}>
                                    {log.status === 'Success' ? <CheckCircle2 className="h-3 w-3" /> :
                                        log.status === 'Notice' ? <FileText className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <span className="text-[9px] font-black uppercase text-slate-900 dark:text-white">{log.type}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold text-slate-400">{log.time}</span>
                                            <button onClick={() => trashLog(log.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-all">
                                                <Activity className="h-3 w-3 rotate-45" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">{log.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 mt-auto">
                <button className="w-full py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-sm">
                    Download Forensic Logs
                </button>
            </div>
        </div>
    );
}
