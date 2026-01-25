"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Activity, Server, Database, Cloud, CheckCircle, AlertTriangle, XCircle, Clock, RefreshCw, ArrowLeft } from "lucide-react";

const Card = ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
    <div onClick={onClick} className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}>{children}</div>
);
const CardHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`p-6 pb-2 ${className}`}>{children}</div>
);
const CardTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 className={`font-semibold leading-none tracking-tight text-slate-900 dark:text-white ${className}`}>{children}</h3>
);
const CardContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`p-6 pt-4 ${className}`}>{children}</div>
);

interface SystemStatus {
    name: string;
    status: 'operational' | 'degraded' | 'down';
    latency: number;
    lastCheck: string;
}

interface HealthMetrics {
    responseTime: number;
    errorRate: number;
    activeSessions: number;
}

interface RecentActivity {
    time: string;
    event: string;
    status: 'success' | 'warning' | 'error';
}

interface HealthData {
    overallStatus: 'operational' | 'degraded' | 'down';
    systems: SystemStatus[];
    metrics: HealthMetrics;
    activities: RecentActivity[];
    timestamp: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    'API Server': Server,
    'Database': Database,
    'Cloud Storage': Cloud,
    'AI Services': Activity,
};

function getTimeAgo(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return date.toLocaleDateString();
}

export default function AdminSystemHealthPage() {
    const [healthData, setHealthData] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    const fetchHealth = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/system-health');
            if (!res.ok) throw new Error('Failed to fetch health data');
            const data = await res.json();
            setHealthData(data);
            setLastRefresh(new Date());
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealth();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'operational':
                return <CheckCircle className="h-4 w-4 text-emerald-600" />;
            case 'degraded':
                return <AlertTriangle className="h-4 w-4 text-amber-600" />;
            case 'down':
                return <XCircle className="h-4 w-4 text-red-600" />;
            default:
                return <CheckCircle className="h-4 w-4 text-slate-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'operational':
                return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
            case 'degraded':
                return 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
            case 'down':
                return 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400';
            default:
                return 'bg-slate-50 text-slate-600';
        }
    };

    const getActivityIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <CheckCircle className="h-4 w-4 text-emerald-600" />;
            case 'warning':
                return <AlertTriangle className="h-4 w-4 text-amber-600" />;
            case 'error':
                return <XCircle className="h-4 w-4 text-red-600" />;
            default:
                return <CheckCircle className="h-4 w-4 text-slate-400" />;
        }
    };

    const getOverallStatusDisplay = () => {
        if (!healthData) return null;

        switch (healthData.overallStatus) {
            case 'operational':
                return {
                    icon: <CheckCircle className="h-8 w-8 text-white" />,
                    title: 'All Systems Operational',
                    bgColor: 'bg-emerald-500',
                    cardColor: 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20',
                    textColor: 'text-emerald-700 dark:text-emerald-400',
                    subColor: 'text-emerald-600 dark:text-emerald-500',
                };
            case 'degraded':
                return {
                    icon: <AlertTriangle className="h-8 w-8 text-white" />,
                    title: 'Some Systems Degraded',
                    bgColor: 'bg-amber-500',
                    cardColor: 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20',
                    textColor: 'text-amber-700 dark:text-amber-400',
                    subColor: 'text-amber-600 dark:text-amber-500',
                };
            case 'down':
                return {
                    icon: <XCircle className="h-8 w-8 text-white" />,
                    title: 'System Outage Detected',
                    bgColor: 'bg-red-500',
                    cardColor: 'border-red-200 bg-red-50/50 dark:bg-red-950/20',
                    textColor: 'text-red-700 dark:text-red-400',
                    subColor: 'text-red-600 dark:text-red-500',
                };
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
            <header className="flex-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/admin"
                            className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span className="hidden sm:inline">Back to Dashboard</span>
                        </Link>
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">System Health</h1>
                            <p className="text-xs font-bold text-slate-500 mt-0.5 uppercase tracking-widest opacity-70">
                                Live monitoring • Auto-refreshes every 30s
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={fetchHealth}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    {error && (
                        <Card className="border-red-200 bg-red-50/50">
                            <CardContent className="flex items-center gap-4 py-6">
                                <div className="h-16 w-16 rounded-full bg-red-500 flex items-center justify-center">
                                    <XCircle className="h-8 w-8 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-red-700">Health Check Failed</h2>
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {loading && !healthData && (
                        <Card>
                            <CardContent className="flex items-center justify-center py-12">
                                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                                <span className="ml-3 text-slate-500 font-medium">Checking system health...</span>
                            </CardContent>
                        </Card>
                    )}

                    {healthData && (
                        <>
                            {/* Overall Status */}
                            {(() => {
                                const status = getOverallStatusDisplay();
                                if (!status) return null;
                                return (
                                    <Card className={status.cardColor}>
                                        <CardContent className="flex items-center gap-4 py-6">
                                            <div className={`h-16 w-16 rounded-full ${status.bgColor} flex items-center justify-center`}>
                                                {status.icon}
                                            </div>
                                            <div>
                                                <h2 className={`text-2xl font-black ${status.textColor}`}>{status.title}</h2>
                                                <p className={`text-sm ${status.subColor}`}>
                                                    Last updated: {getTimeAgo(healthData.timestamp)}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })()}

                            {/* System Status Cards */}
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                {healthData.systems.map(system => {
                                    const Icon = iconMap[system.name] || Activity;
                                    return (
                                        <Card key={system.name}>
                                            <CardContent className="pt-6">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                        <Icon className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm">{system.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Latency: {system.latency}ms
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 ${getStatusColor(system.status)}`}>
                                                        {getStatusIcon(system.status)}
                                                        {system.status}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {getTimeAgo(system.lastCheck)}
                                                    </span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>

                            {/* Metrics */}
                            <div className="grid gap-4 md:grid-cols-3">
                                <Card className="cursor-pointer hover:shadow-md hover:border-emerald-300 transition-all" onClick={() => alert(`Response Time: ${healthData.metrics.responseTime}ms\n\nThis is the current latency for health check API calls.`)}>
                                    <CardHeader>
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Response Time</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className={`text-3xl font-black ${healthData.metrics.responseTime < 100 ? 'text-emerald-600' : healthData.metrics.responseTime < 500 ? 'text-amber-600' : 'text-red-600'}`}>
                                            {healthData.metrics.responseTime}ms
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">Current health check latency</p>
                                    </CardContent>
                                </Card>
                                <Card className="cursor-pointer hover:shadow-md hover:border-emerald-300 transition-all" onClick={() => alert(`System Availability: ${(100 - healthData.metrics.errorRate).toFixed(1)}%\n\n${healthData.systems.filter(s => s.status === 'operational').length} of ${healthData.systems.length} systems are operational.`)}>
                                    <CardHeader>
                                        <CardTitle className="text-sm font-medium text-muted-foreground">System Availability</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className={`text-3xl font-black ${healthData.metrics.errorRate === 0 ? 'text-emerald-600' : healthData.metrics.errorRate < 25 ? 'text-amber-600' : 'text-red-600'}`}>
                                            {(100 - healthData.metrics.errorRate).toFixed(1)}%
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">Systems operational</p>
                                    </CardContent>
                                </Card>
                                <Card className="cursor-pointer hover:shadow-md hover:border-blue-300 transition-all" onClick={() => alert(`Active Users: ${healthData.metrics.activeSessions}\n\nTotal registered users in the database.`)}>
                                    <CardHeader>
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-3xl font-black">{healthData.metrics.activeSessions}</div>
                                        <p className="text-xs text-muted-foreground mt-1">Users in database</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Recent Activity */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Recent Activity</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {healthData.activities.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {healthData.activities.map((activity, i) => (
                                                <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${activity.status === 'success' ? 'bg-emerald-100' :
                                                        activity.status === 'warning' ? 'bg-amber-100' : 'bg-red-100'
                                                        }`}>
                                                        {getActivityIcon(activity.status)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium">{activity.event}</p>
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Clock className="h-3 w-3" /> {getTimeAgo(activity.time)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
