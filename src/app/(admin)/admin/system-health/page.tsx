"use client";

import { Activity, Server, Database, Cloud, CheckCircle, AlertTriangle, Clock } from "lucide-react";

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}>{children}</div>
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

const systemStatus = [
    { name: "API Server", status: "operational", uptime: "99.99%", icon: Server, lastCheck: "2 min ago" },
    { name: "Database", status: "operational", uptime: "99.98%", icon: Database, lastCheck: "2 min ago" },
    { name: "Cloud Storage", status: "operational", uptime: "99.99%", icon: Cloud, lastCheck: "2 min ago" },
    { name: "AI Services", status: "operational", uptime: "99.95%", icon: Activity, lastCheck: "2 min ago" },
];

const recentActivity = [
    { time: "2 min ago", event: "API health check completed", status: "success" },
    { time: "5 min ago", event: "Database backup completed", status: "success" },
    { time: "15 min ago", event: "SSL certificate renewed", status: "success" },
    { time: "1 hour ago", event: "System maintenance completed", status: "success" },
    { time: "3 hours ago", event: "Security scan completed", status: "success" },
];

export default function AdminSystemHealthPage() {
    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
            <header className="flex-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">System Health</h1>
                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest opacity-70">
                        Monitor system status and performance
                    </p>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Overall Status */}
                    <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
                        <CardContent className="flex items-center gap-4 py-6">
                            <div className="h-16 w-16 rounded-full bg-emerald-500 flex items-center justify-center">
                                <CheckCircle className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-emerald-700 dark:text-emerald-400">All Systems Operational</h2>
                                <p className="text-sm text-emerald-600 dark:text-emerald-500">Last updated: Just now</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* System Status Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {systemStatus.map(system => {
                            const Icon = system.icon;
                            return (
                                <Card key={system.name}>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Icon className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">{system.name}</p>
                                                <p className="text-xs text-muted-foreground">Last check: {system.lastCheck}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase flex items-center gap-1">
                                                <CheckCircle className="h-3 w-3" />
                                                {system.status}
                                            </span>
                                            <span className="text-sm font-bold text-muted-foreground">{system.uptime} uptime</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Metrics */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium text-muted-foreground">Response Time</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-emerald-600">45ms</div>
                                <p className="text-xs text-muted-foreground mt-1">Average over last hour</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium text-muted-foreground">Error Rate</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-emerald-600">0.01%</div>
                                <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium text-muted-foreground">Active Sessions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black">127</div>
                                <p className="text-xs text-muted-foreground mt-1">Current users online</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recent Activity */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recentActivity.map((activity, i) => (
                                    <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                        <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{activity.event}</p>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="h-3 w-3" /> {activity.time}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
