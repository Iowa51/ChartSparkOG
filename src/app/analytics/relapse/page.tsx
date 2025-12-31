"use client";

import { useState } from 'react';
import { AlertTriangle, TrendingUp, Users, Activity, Shield, ArrowUpDown, Search, Eye, Filter, X, Check } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Local Component Definitions
const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}>{children}</div>
);
const CardHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`p-6 pb-2 ${className}`}>{children}</div>
);
const CardTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 className={`font-semibold leading-none tracking-tight text-slate-900 dark:text-white ${className}`}>{children}</h3>
);
const CardDescription = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <p className={`text-sm text-slate-500 dark:text-slate-400 mt-2 ${className}`}>{children}</p>
);
const CardContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`p-6 pt-0 ${className}`}>{children}</div>
);

const Badge = ({ children, variant = "default", className }: any) => {
    const variants = {
        default: "bg-primary text-primary-foreground hover:bg-primary/80 border-transparent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-transparent",
        destructive: "bg-red-500 text-white hover:bg-red-600 border-transparent",
        outline: "text-foreground border-slate-200 dark:border-slate-800",
    };
    return (
        <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant as keyof typeof variants]} ${className}`}>
            {children}
        </div>
    );
};

const Alert = ({ children, variant = "default", className }: any) => {
    const variants = {
        default: "bg-background text-foreground",
        destructive: "border-red-500/50 text-red-600 dark:border-red-500 [&>svg]:text-red-600 dark:bg-red-950/20 dark:text-red-400 dark:[&>svg]:text-red-400",
    };
    return (
        <div className={`relative w-full rounded-lg border p-4 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg+div]:translate-y-[-3px] [&:has(svg)]:pl-11 ${variants[variant as keyof typeof variants]} ${className}`}>
            {children}
        </div>
    );
};

const AlertTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h5 className={`mb-1 font-medium leading-none tracking-tight ${className}`}>{children}</h5>
);

const AlertDescription = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`text-sm [&_p]:leading-relaxed ${className}`}>{children}</div>
);

const Button = ({ children, className, variant = "default", size = "default", onClick, disabled }: any) => {
    const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
    const variants = {
        default: "bg-primary text-white hover:bg-primary/90 shadow-sm",
        destructive: "bg-red-500 text-white hover:bg-red-600 shadow-sm",
        outline: "bg-transparent border border-slate-200 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-100",
        ghost: "hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50",
    };
    const sizes = {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md text-xs",
        icon: "h-9 w-9",
    };
    return (
        <button
            className={`${baseStyles} ${variants[variant as keyof typeof variants]} ${sizes[size as keyof typeof sizes]} ${className}`}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </button>
    );
};

const Input = ({ className, ...props }: any) => (
    <input
        className={`flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-800 ${className}`}
        {...props}
    />
);

const Label = ({ children, className }: any) => (
    <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}>
        {children}
    </label>
);

const Switch = ({ checked, onCheckedChange }: any) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
            }`}
    >
        <span
            className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'
                }`}
        />
    </button>
);

const Slider = ({ value, onValueChange, min, max, step, className }: any) => (
    <div className={`relative flex w-full touch-none select-none items-center ${className}`}>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value[0]}
            onChange={(e) => onValueChange([parseInt(e.target.value)])}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 dark:bg-slate-700 accent-primary"
        />
    </div>
);

// Minimal Dialog implementation
const Dialog = ({ open, onOpenChange, children }: any) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={() => onOpenChange(false)}
            />
            {/* Content */}
            <div className="relative z-50 grid w-full max-w-lg gap-4 border bg-white p-6 shadow-lg duration-200 dark:bg-slate-900 dark:border-slate-800 sm:rounded-lg md:w-full">
                {children}
                <button
                    onClick={() => onOpenChange(false)}
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </button>
            </div>
        </div>
    );
};

// Override Content for larger width as requested
const DialogContent = ({ children, className }: any) => (
    <div className={`relative z-50 grid w-full gap-4 bg-white p-6 shadow-lg duration-200 dark:bg-slate-900 sm:rounded-lg ${className}`}>
        {children}
    </div>
);
const DialogHeader = ({ children, className }: any) => <div className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`}>{children}</div>;
const DialogTitle = ({ children, className }: any) => <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>{children}</h3>;


// Minimal Table implementations
const Table = ({ children, className }: any) => <div className={`w-full caption-bottom text-sm ${className}`}><table className="w-full h-full">{children}</table></div>;
const TableHeader = ({ children, className }: any) => <thead className={`[&_tr]:border-b ${className}`}>{children}</thead>;
const TableBody = ({ children, className }: any) => <tbody className={`[&_tr:last-child]:border-0 ${className}`}>{children}</tbody>;
const TableRow = ({ children, className }: any) => <tr className={`border-b border-slate-200 dark:border-slate-800 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/50 data-[state=selected]:bg-slate-50 ${className}`}>{children}</tr>;
const TableHead = ({ children, className }: any) => <th className={`h-10 px-4 text-left align-middle font-medium text-slate-500 [&:has([role=checkbox])]:pr-0 dark:text-slate-400 ${className}`}>{children}</th>;
const TableCell = ({ children, className }: any) => <td className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 ${className}`}>{children}</td>;


export default function RelapsePreventionPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState<'name' | 'risk7day' | 'risk14day' | 'risk30day'>('risk7day');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [alertThreshold, setAlertThreshold] = useState(70);
    const [riskFilter, setRiskFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
    const [expandedFactors, setExpandedFactors] = useState<number[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [alertsEnabled, setAlertsEnabled] = useState({
        inApp: true,
        email: true,
        sms: false
    });

    const getTrendData = () => [
        { day: 'Day 1', risk: 45, mood: 5, sleep: 6, adherence: 90 },
        { day: 'Day 5', risk: 48, mood: 5, sleep: 5, adherence: 85 },
        { day: 'Day 10', risk: 52, mood: 4, sleep: 5, adherence: 80 },
        { day: 'Day 15', risk: 58, mood: 4, sleep: 4, adherence: 75 },
        { day: 'Day 20', risk: 65, mood: 3, sleep: 4, adherence: 70 },
        { day: 'Day 25', risk: 72, mood: 3, sleep: 3, adherence: 65 },
        { day: 'Day 30', risk: 78, mood: 2, sleep: 3, adherence: 60 },
    ];

    const riskStats = {
        totalPatients: 127,
        highRisk: 12,
        mediumRisk: 28,
        lowRisk: 87,
        weeklyChange: {
            high: +3,
            medium: -5,
            low: +2
        }
    };

    const patientsRiskData = [
        {
            id: 1,
            name: "Sarah Johnson",
            age: 34,
            diagnosis: "MDD",
            risk7day: 82,
            risk14day: 78,
            risk30day: 72,
            riskFactors: ["Missed 2 appointments", "Medication non-adherence", "Social withdrawal"],
            lastContact: "2024-01-10",
            trend: "increasing"
        },
        {
            id: 2,
            name: "Michael Chen",
            age: 28,
            diagnosis: "GAD, MDD",
            risk7day: 75,
            risk14day: 68,
            risk30day: 60,
            riskFactors: ["Increased anxiety symptoms", "Sleep disturbance", "Work stress"],
            lastContact: "2024-01-12",
            trend: "increasing"
        },
        {
            id: 3,
            name: "Emily Rodriguez",
            age: 42,
            diagnosis: "Bipolar II",
            risk7day: 71,
            risk14day: 75,
            risk30day: 78,
            riskFactors: ["Manic symptoms emerging", "Reduced med adherence"],
            lastContact: "2024-01-08",
            trend: "stable"
        },
        {
            id: 4,
            name: "James Wilson",
            age: 56,
            diagnosis: "PTSD",
            risk7day: 68,
            risk14day: 65,
            risk30day: 58,
            riskFactors: ["Nightmares increasing", "Avoidance behaviors"],
            lastContact: "2024-01-14",
            trend: "stable"
        },
        {
            id: 5,
            name: "Lisa Anderson",
            age: 31,
            diagnosis: "MDD",
            risk7day: 55,
            risk14day: 52,
            risk30day: 48,
            riskFactors: ["Mild mood fluctuations", "Situational stress"],
            lastContact: "2024-01-15",
            trend: "decreasing"
        },
        {
            id: 6,
            name: "Robert Taylor",
            age: 45,
            diagnosis: "GAD",
            risk7day: 48,
            risk14day: 45,
            risk30day: 42,
            riskFactors: ["Mild anxiety", "Improved coping"],
            lastContact: "2024-01-13",
            trend: "decreasing"
        },
        {
            id: 7,
            name: "Jennifer Lee",
            age: 29,
            diagnosis: "MDD",
            risk7day: 38,
            risk14day: 35,
            risk30day: 32,
            riskFactors: ["Good adherence", "Strong support system"],
            lastContact: "2024-01-14",
            trend: "decreasing"
        },
        {
            id: 8,
            name: "David Martinez",
            age: 52,
            diagnosis: "Bipolar I",
            risk7day: 32,
            risk14day: 28,
            risk30day: 25,
            riskFactors: ["Stable mood", "Good medication response"],
            lastContact: "2024-01-15",
            trend: "stable"
        },
        {
            id: 9,
            name: "Maria Garcia",
            age: 36,
            diagnosis: "GAD",
            risk7day: 25,
            risk14day: 22,
            risk30day: 20,
            riskFactors: ["Stable", "Active in therapy"],
            lastContact: "2024-01-15",
            trend: "stable"
        },
        {
            id: 10,
            name: "Thomas Brown",
            age: 41,
            diagnosis: "MDD",
            risk7day: 18,
            risk14day: 15,
            risk30day: 12,
            riskFactors: ["Excellent progress", "Remission stable"],
            lastContact: "2024-01-14",
            trend: "decreasing"
        }
    ];

    const getRiskColor = (risk: number) => {
        if (risk >= 70) return "text-red-600 dark:text-red-400 font-bold";
        if (risk >= 40) return "text-amber-600 dark:text-amber-400 font-medium";
        return "text-emerald-600 dark:text-emerald-400 font-medium";
    };

    const getRiskBgColor = (risk: number) => {
        if (risk >= 70) return "bg-red-50/50 dark:bg-red-950/20";
        if (risk >= 40) return "bg-amber-50/30 dark:bg-amber-950/10";
        return "";
    };

    const filteredAndSortedPatients = patientsRiskData
        .filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRisk =
                riskFilter === 'all' ? true :
                    riskFilter === 'high' ? p.risk7day >= 70 :
                        riskFilter === 'medium' ? (p.risk7day >= 40 && p.risk7day < 70) :
                            p.risk7day < 40;
            return matchesSearch && matchesRisk;
        })
        .sort((a, b: any) => {
            const aVal = a[sortBy] as string | number;
            const bVal = b[sortBy] as string | number;
            if (typeof aVal === 'string') {
                return sortOrder === 'asc'
                    ? aVal.localeCompare(bVal as string)
                    : (bVal as string).localeCompare(aVal);
            }
            return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
        });

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 h-full overflow-y-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
                        <Shield className="h-8 w-8 text-blue-600" />
                        Relapse Prevention Analytics
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">
                        AI-powered predictive monitoring for patient relapse risk
                    </p>
                </div>
                <Badge className="bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800">
                    <AlertTriangle className="mr-2 h-3 w-3" />
                    {riskStats.highRisk} High Risk
                </Badge>
            </div>

            {/* Alert Banner for High Risk */}
            {riskStats.highRisk > 0 && (
                <Alert variant="destructive" className="animate-in slide-in-from-top-2 duration-500">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>High Risk Patients Detected</AlertTitle>
                    <AlertDescription>
                        {riskStats.highRisk} patients require immediate attention. Review risk factors and consider intervention.
                    </AlertDescription>
                </Alert>
            )}

            {/* Risk Overview Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                {/* Total Monitored */}
                <Card
                    className={`cursor-pointer transition-all hover:ring-2 hover:ring-slate-200 ${riskFilter === 'all' ? 'ring-2 ring-primary border-primary/50 shadow-md' : ''}`}
                    onClick={() => setRiskFilter('all')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Monitored</CardTitle>
                        <Users className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white">{riskStats.totalPatients}</div>
                        <p className="text-xs text-slate-500 mt-1">
                            Active patients in monitoring program
                        </p>
                    </CardContent>
                </Card>

                {/* High Risk */}
                <Card
                    className={`cursor-pointer transition-all hover:ring-2 hover:ring-red-200 border-red-200 dark:border-red-900 bg-red-50/10 dark:bg-red-950/10 ${riskFilter === 'high' ? 'ring-2 ring-red-500 border-red-500/50 shadow-md' : ''}`}
                    onClick={() => setRiskFilter('high')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-red-900 dark:text-red-100">High Risk</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-600 dark:text-red-400">{riskStats.highRisk}</div>
                        <div className="flex items-center gap-1 text-xs mt-1">
                            <TrendingUp className="h-3 w-3 text-red-600" />
                            <span className="text-red-600 font-medium">+{riskStats.weeklyChange.high} this week</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Immediate intervention needed
                        </p>
                    </CardContent>
                </Card>

                {/* Medium Risk */}
                <Card
                    className={`cursor-pointer transition-all hover:ring-2 hover:ring-amber-200 border-amber-200 dark:border-amber-900 bg-amber-50/10 dark:bg-amber-950/10 ${riskFilter === 'medium' ? 'ring-2 ring-amber-500 border-amber-500/50 shadow-md' : ''}`}
                    onClick={() => setRiskFilter('medium')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-amber-900 dark:text-amber-100">Medium Risk</CardTitle>
                        <Activity className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{riskStats.mediumRisk}</div>
                        <div className="flex items-center gap-1 text-xs mt-1">
                            <TrendingUp className="h-3 w-3 text-emerald-600 rotate-180" />
                            <span className="text-emerald-600 font-medium">{riskStats.weeklyChange.medium} this week</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Enhanced monitoring required
                        </p>
                    </CardContent>
                </Card>

                {/* Low Risk */}
                <Card
                    className={`cursor-pointer transition-all hover:ring-2 hover:ring-emerald-200 border-emerald-200 dark:border-emerald-900 bg-emerald-50/10 dark:bg-emerald-950/10 ${riskFilter === 'low' ? 'ring-2 ring-emerald-500 border-emerald-500/50 shadow-md' : ''}`}
                    onClick={() => setRiskFilter('low')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Low Risk</CardTitle>
                        <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{riskStats.lowRisk}</div>
                        <div className="flex items-center gap-1 text-xs mt-1">
                            <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">+{riskStats.weeklyChange.low} this week</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Standard care pathway
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Risk Distribution Visual */}
            <Card>
                <CardHeader>
                    <CardTitle>Risk Distribution</CardTitle>
                    <CardDescription>Current patient risk levels across monitored population</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-600"></span>
                                    High Risk
                                </span>
                                <span className="text-sm font-bold text-slate-900 dark:text-white">{riskStats.highRisk} ({((riskStats.highRisk / riskStats.totalPatients) * 100).toFixed(1)}%)</span>
                            </div>
                            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-red-600 dark:bg-red-500 rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${(riskStats.highRisk / riskStats.totalPatients) * 100}%` }}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                                    Medium Risk
                                </span>
                                <span className="text-sm font-bold text-slate-900 dark:text-white">{riskStats.mediumRisk} ({((riskStats.mediumRisk / riskStats.totalPatients) * 100).toFixed(1)}%)</span>
                            </div>
                            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-600 dark:bg-amber-500 rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${(riskStats.mediumRisk / riskStats.totalPatients) * 100}%` }}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                                    Low Risk
                                </span>
                                <span className="text-sm font-bold text-slate-900 dark:text-white">{riskStats.lowRisk} ({((riskStats.lowRisk / riskStats.totalPatients) * 100).toFixed(1)}%)</span>
                            </div>
                            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${(riskStats.lowRisk / riskStats.totalPatients) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Patient Risk Monitoring Table */}
            <Card className="mt-6">
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Patient Risk Monitoring</CardTitle>
                            <CardDescription>Real-time risk scores across time horizons</CardDescription>
                        </div>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                            <Input
                                placeholder="Search patients..."
                                value={searchTerm}
                                onChange={(e: any) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                                    <TableRow>
                                        <TableHead>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSortBy('name');
                                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                                }}
                                                className="hover:bg-transparent px-0 font-bold text-slate-700 dark:text-slate-300"
                                            >
                                                Patient <ArrowUpDown className="ml-2 h-3 w-3" />
                                            </Button>
                                        </TableHead>
                                        <TableHead>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSortBy('risk7day');
                                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                                }}
                                                className="hover:bg-transparent px-0 font-bold text-slate-700 dark:text-slate-300"
                                            >
                                                7-Day Risk <ArrowUpDown className="ml-2 h-3 w-3" />
                                            </Button>
                                        </TableHead>
                                        <TableHead>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSortBy('risk14day');
                                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                                }}
                                                className="hover:bg-transparent px-0 font-bold text-slate-700 dark:text-slate-300"
                                            >
                                                14-Day Risk <ArrowUpDown className="ml-2 h-3 w-3" />
                                            </Button>
                                        </TableHead>
                                        <TableHead>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSortBy('risk30day');
                                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                                }}
                                                className="hover:bg-transparent px-0 font-bold text-slate-700 dark:text-slate-300"
                                            >
                                                30-Day Risk <ArrowUpDown className="ml-2 h-3 w-3" />
                                            </Button>
                                        </TableHead>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">Key Risk Factors</TableHead>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">Trend</TableHead>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAndSortedPatients.map(patient => (
                                        <TableRow key={patient.id} className={getRiskBgColor(patient.risk7day)}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-white">{patient.name}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {patient.age}y • {patient.diagnosis}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell className={getRiskColor(patient.risk7day)}>
                                                {patient.risk7day}%
                                            </TableCell>
                                            <TableCell className={getRiskColor(patient.risk14day)}>
                                                {patient.risk14day}%
                                            </TableCell>
                                            <TableCell className={getRiskColor(patient.risk30day)}>
                                                {patient.risk30day}%
                                            </TableCell>
                                            <TableCell>
                                                <div className="max-w-xs flex flex-wrap gap-1">
                                                    {(expandedFactors.includes(patient.id) ? patient.riskFactors : patient.riskFactors.slice(0, 2)).map((factor, i) => (
                                                        <Badge key={i} variant="outline" className="text-[10px] bg-white dark:bg-slate-950 font-normal text-slate-600 dark:text-slate-400">
                                                            {factor}
                                                        </Badge>
                                                    ))}
                                                    {patient.riskFactors.length > 2 && !expandedFactors.includes(patient.id) && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                                            onClick={() => setExpandedFactors([...expandedFactors, patient.id])}
                                                        >
                                                            +{patient.riskFactors.length - 2} more
                                                        </Badge>
                                                    )}
                                                    {expandedFactors.includes(patient.id) && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-pointer hover:bg-slate-200"
                                                            onClick={() => setExpandedFactors(expandedFactors.filter(id => id !== patient.id))}
                                                        >
                                                            show less
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        patient.trend === 'increasing' ? 'destructive' :
                                                            patient.trend === 'decreasing' ? 'secondary' : 'outline'
                                                    }
                                                    className={patient.trend === 'stable' ? 'bg-slate-100 text-slate-600 border-transparent dark:bg-slate-800 dark:text-slate-400' : ''}
                                                >
                                                    {patient.trend === 'increasing' ? '↑' : patient.trend === 'decreasing' ? '↓' : '→'}
                                                    {' '}{patient.trend.charAt(0).toUpperCase() + patient.trend.slice(1)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8"
                                                    onClick={() => setSelectedPatient(patient)}
                                                >
                                                    <Eye className="mr-1 h-3 w-3" />
                                                    View
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Alert Configuration Card */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Alert Configuration</CardTitle>
                    <CardDescription>Customize risk monitoring alerts and thresholds</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Threshold Setting */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <Label className="text-slate-900 dark:text-white">Risk Alert Threshold</Label>
                                    <p className="text-xs text-slate-500">Alert when patient risk exceeds this level</p>
                                </div>
                                <Badge variant="outline" className="text-lg px-3 py-1 font-mono text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900">{alertThreshold}%</Badge>
                            </div>
                            <Slider
                                value={[alertThreshold]}
                                onValueChange={(value: any) => setAlertThreshold(value[0])}
                                min={0}
                                max={100}
                                step={5}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-slate-500 mt-2">
                                <span>0% (All patients)</span>
                                <span>50% (Medium+)</span>
                                <span>100% (None)</span>
                            </div>
                        </div>

                        {/* Notification Methods */}
                        <div>
                            <Label className="mb-4 block text-slate-900 dark:text-white">Notification Methods</Label>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">In-App Notifications</p>
                                        <p className="text-xs text-slate-500">Show alerts in ChartSpark dashboard</p>
                                    </div>
                                    <Switch
                                        checked={alertsEnabled.inApp}
                                        onCheckedChange={(checked: boolean) => setAlertsEnabled({ ...alertsEnabled, inApp: checked })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">Email Notifications</p>
                                        <p className="text-xs text-slate-500">Send email alerts to your address</p>
                                    </div>
                                    <Switch
                                        checked={alertsEnabled.email}
                                        onCheckedChange={(checked: boolean) => setAlertsEnabled({ ...alertsEnabled, email: checked })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">SMS Notifications</p>
                                        <p className="text-xs text-slate-500">Text alerts for high-risk patients</p>
                                    </div>
                                    <Switch
                                        checked={alertsEnabled.sms}
                                        onCheckedChange={(checked: boolean) => setAlertsEnabled({ ...alertsEnabled, sms: checked })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Weekly Digest */}
                    <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-900/50">
                        <h4 className="font-medium mb-2 text-slate-900 dark:text-white text-sm">Weekly Digest Preview</h4>
                        <p className="text-xs text-slate-500 mb-4">
                            You'll receive a weekly summary every Monday at 9:00 AM
                        </p>
                        <div className="text-sm space-y-2">
                            <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                                <span className="text-slate-600 dark:text-slate-400">High risk patients this week:</span>
                                <span className="font-bold text-red-600 dark:text-red-400">{riskStats.highRisk}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                                <span className="text-slate-600 dark:text-slate-400">Risk increases detected:</span>
                                <span className="font-bold text-amber-600 dark:text-amber-400">7</span>
                            </div>
                            <div className="flex justify-between pt-1">
                                <span className="text-slate-600 dark:text-slate-400">Patients improved:</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">15</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button
                            size="lg"
                            disabled={isSaving}
                            onClick={() => {
                                setIsSaving(true);
                                setTimeout(() => {
                                    setIsSaving(false);
                                    alert("Alert settings saved successfully! Your preferences have been updated across all notification channels.");
                                }, 1000);
                            }}
                            className="w-full md:w-auto bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                        >
                            {isSaving ? (
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Saving...
                                </div>
                            ) : "Save Alert Settings"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Individual Patient Risk Detail Modal logic placed within the main component return for state access */}
            <Dialog open={!!selectedPatient} onOpenChange={(open: boolean) => !open && setSelectedPatient(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[90vw]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <Shield className="h-6 w-6 text-blue-600" />
                            Risk Analysis: {selectedPatient?.name}
                        </DialogTitle>
                    </DialogHeader>

                    {selectedPatient && (
                        <div className="space-y-8 py-4">
                            {/* Patient Summary */}
                            <div className="grid md:grid-cols-3 gap-6 p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                <div>
                                    <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Current Risk Level</p>
                                    <p className={`text-4xl font-black mt-2 ${getRiskColor(selectedPatient.risk7day)}`}>
                                        {selectedPatient.risk7day}%
                                    </p>
                                    <Badge variant={selectedPatient.risk7day >= 70 ? 'destructive' : 'secondary'} className="mt-2">
                                        {selectedPatient.risk7day >= 70 ? 'High Risk' : selectedPatient.risk7day >= 40 ? 'Medium Risk' : 'Low Risk'}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Diagnosis</p>
                                    <p className="text-lg font-bold mt-1 text-slate-900 dark:text-white">{selectedPatient.diagnosis}</p>
                                    <p className="text-sm text-slate-500 mt-1">Age: {selectedPatient.age}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Last Contact</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                                            {/* Simple date format handling for mock string */}
                                            {selectedPatient.lastContact}
                                        </p>
                                    </div>
                                    <Badge variant="outline" className={`mt-2 ${selectedPatient.trend === 'increasing' ? 'text-red-600 border-red-200 bg-red-50' : selectedPatient.trend === 'decreasing' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 'text-slate-600 bg-slate-50'}`}>
                                        Trend: {selectedPatient.trend}
                                    </Badge>
                                </div>
                            </div>

                            {/* Risk Trend Chart */}
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-lg">30-Day Risk Trend</h3>
                                <div className="h-[300px] w-full bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={getTrendData()}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                            <XAxis
                                                dataKey="day"
                                                stroke="#64748b"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                                dy={10}
                                            />
                                            <YAxis
                                                stroke="#64748b"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                                dx={-10}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#fff',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                                }}
                                            />
                                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                            <Line
                                                type="monotone"
                                                dataKey="risk"
                                                stroke="#ef4444"
                                                strokeWidth={3}
                                                activeDot={{ r: 6, strokeWidth: 0 }}
                                                dot={{ strokeWidth: 2, r: 4, stroke: '#ef4444', fill: '#fff' }}
                                                name="Risk Score"
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="adherence"
                                                stroke="#3b82f6"
                                                strokeWidth={2}
                                                strokeDasharray="5 5"
                                                dot={false}
                                                name="Medication Adherence (%)"
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Risk Factors Breakdown */}
                            <div className="grid md:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-lg">Risk Factor Analysis</h3>
                                    <div className="space-y-6">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Medication Adherence</span>
                                                <span className="text-sm font-bold text-red-600">60%</span>
                                            </div>
                                            <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-red-600 rounded-full" style={{ width: '60%' }} />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Sleep Quality</span>
                                                <span className="text-sm font-bold text-amber-600">3/10</span>
                                            </div>
                                            <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-600 rounded-full" style={{ width: '30%' }} />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Mood Rating</span>
                                                <span className="text-sm font-bold text-red-600">2/10</span>
                                            </div>
                                            <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-red-600 rounded-full" style={{ width: '20%' }} />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Session Attendance</span>
                                                <span className="text-sm font-bold text-amber-600">50%</span>
                                            </div>
                                            <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-600 rounded-full" style={{ width: '50%' }} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 rounded-lg">
                                        <h4 className="font-bold text-sm mb-3 text-red-900 dark:text-red-100 flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4" />
                                            Detected Risk Factors
                                        </h4>
                                        <div className="space-y-2">
                                            {selectedPatient.riskFactors.map((factor: string, i: number) => (
                                                <div key={i} className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300 bg-white dark:bg-red-950/50 p-2 rounded border border-red-100 dark:border-red-900/50">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                                    <span>{factor}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Intervention Recommendations */}
                                <div className="h-full flex flex-col">
                                    <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-lg">Recommended Interventions</h3>
                                    <div className="flex-1 p-5 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-xl space-y-4">

                                        <div className="flex items-start gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-blue-100 dark:border-blue-900/50 shadow-sm">
                                            <Button size="sm" variant="outline" className="h-8 text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 whitespace-nowrap">Schedule</Button>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">Schedule extra therapy session</p>
                                                <p className="text-xs text-slate-500 mt-0.5">High priority - Address worsening symptoms</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-blue-100 dark:border-blue-900/50 shadow-sm">
                                            <Button size="sm" variant="outline" className="h-8 text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 whitespace-nowrap">Review</Button>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">Medication review needed</p>
                                                <p className="text-xs text-slate-500 mt-0.5">Poor adherence pattern detected (60%)</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-blue-100 dark:border-blue-900/50 shadow-sm">
                                            <Button size="sm" variant="outline" className="h-8 text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 whitespace-nowrap">Refer</Button>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">Peer support group referral</p>
                                                <p className="text-xs text-slate-500 mt-0.5">Social isolation indicated in recent logs</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-blue-100 dark:border-blue-900/50 shadow-sm">
                                            <Button size="sm" variant="outline" className="h-8 text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 whitespace-nowrap">Contact</Button>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">Contact support person</p>
                                                <p className="text-xs text-slate-500 mt-0.5">Activate support network immediately</p>
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-4 flex gap-3">
                                            <Button variant="destructive" className="flex-1 shadow-md shadow-red-200 dark:shadow-none">
                                                Mark Relapse
                                            </Button>
                                            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 dark:shadow-none">
                                                Mark Stable
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
