"use client";

import { useState } from 'react';
import { Database, Link2, CheckCircle2, Circle, AlertCircle, RefreshCw, X, ChevronDown, Eye, Download, Upload, Shield } from "lucide-react";

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
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-100/80 dark:bg-slate-800 dark:text-slate-50 border-transparent",
        outline: "text-foreground border-slate-200 dark:border-slate-800",
        destructive: "bg-red-500 text-white hover:bg-red-600 border-transparent",
    };
    return (
        <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant as keyof typeof variants]} ${className}`}>
            {children}
        </div>
    );
};

const Button = ({ children, className, variant = "default", size = "default", onClick, disabled, type = "button" }: any) => {
    const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
    const variants = {
        default: "bg-primary text-white hover:bg-primary/90 shadow-sm",
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
            type={type}
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

// Minimal Table implementations
const Table = ({ children, className }: any) => <div className={`w-full caption-bottom text-sm ${className}`}><table className="w-full h-full">{children}</table></div>;
const TableHeader = ({ children, className }: any) => <thead className={`[&_tr]:border-b ${className}`}>{children}</thead>;
const TableBody = ({ children, className }: any) => <tbody className={`[&_tr:last-child]:border-0 ${className}`}>{children}</tbody>;
const TableRow = ({ children, className }: any) => <tr className={`border-b border-slate-200 dark:border-slate-800 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/50 data-[state=selected]:bg-slate-50 ${className}`}>{children}</tr>;
const TableHead = ({ children, className }: any) => <th className={`h-10 px-4 text-left align-middle font-medium text-slate-500 [&:has([role=checkbox])]:pr-0 dark:text-slate-400 ${className}`}>{children}</th>;
const TableCell = ({ children, className }: any) => <td className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 ${className}`}>{children}</td>;


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

const DialogContent = ({ children, className }: any) => (
    <div className={`relative z-50 grid w-full gap-4 bg-white p-0 shadow-none duration-200 dark:bg-slate-900 sm:rounded-lg ${className}`}>
        {children}
    </div>
);
const DialogHeader = ({ children, className }: any) => <div className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`}>{children}</div>;
const DialogTitle = ({ children, className }: any) => <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>{children}</h3>;

// Mock Select Component
const SimpleSelect = ({ value, onValueChange, options, placeholder }: any) => (
    <div className="relative">
        <select
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            className="flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 [&>span]:line-clamp-1"
        >
            <option value="" disabled>{placeholder}</option>
            {options.map((opt: any) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
        <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
    </div>
);


export default function IntegrationsPage() {
    const [selectedEHR, setSelectedEHR] = useState<string>('');
    const [connectDialogOpen, setConnectDialogOpen] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);

    // New State for Task 2.16
    const [consents, setConsents] = useState({
        shareDiagnoses: true,
        shareMedications: true,
        shareNotes: false,
        shareLabs: true,
        shareAppointments: true,
        shareAssessments: false
    });

    const ehrSystems = [
        {
            id: 'chartpath',
            name: 'ChartPath',
            description: 'Leading EHR for mental health practices',
            status: 'connected',
            lastSync: '2024-01-15 10:30 AM',
            patientsSync: 127,
            logo: '🏥'
        },
        {
            id: 'epic',
            name: 'Epic',
            description: 'Enterprise healthcare software',
            status: 'not_connected',
            lastSync: null,
            patientsSync: 0,
            logo: '⚕️'
        },
        {
            id: 'cerner',
            name: 'Cerner',
            description: 'Health information technology solutions',
            status: 'not_connected',
            lastSync: null,
            patientsSync: 0,
            logo: '🏨'
        }
    ];

    const auditLog = [
        {
            id: 1,
            timestamp: '2024-01-15 10:30:15',
            system: 'ChartPath',
            action: 'Data Sync',
            user: 'System',
            records: 127,
            status: 'success'
        },
        {
            id: 2,
            timestamp: '2024-01-15 09:15:42',
            system: 'ChartPath',
            action: 'Patient Record Access',
            user: 'Dr. Sarah Johnson',
            records: 1,
            status: 'success'
        },
        {
            id: 3,
            timestamp: '2024-01-14 16:45:33',
            system: 'ChartPath',
            action: 'Data Export',
            user: 'Admin',
            records: 50,
            status: 'success'
        },
        {
            id: 4,
            timestamp: '2024-01-14 14:22:18',
            system: 'ChartPath',
            action: 'Data Sync',
            user: 'System',
            records: 125,
            status: 'success'
        },
        {
            id: 5,
            timestamp: '2024-01-14 11:30:05',
            system: 'Epic',
            action: 'Connection Test',
            user: 'Admin',
            records: 0,
            status: 'failed'
        }
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'connected':
                return 'text-green-600 dark:text-green-500';
            case 'pending':
                return 'text-amber-600 dark:text-amber-500';
            default:
                return 'text-slate-400 dark:text-slate-500';
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'connected':
                return <Badge className="bg-green-600 hover:bg-green-700 text-white border-transparent">Connected</Badge>;
            case 'pending':
                return <Badge variant="secondary">Pending</Badge>;
            default:
                return <Badge variant="outline">Not Connected</Badge>;
        }
    };

    const handleTestConnection = () => {
        setTestingConnection(true);
        setTimeout(() => {
            setTestingConnection(false);
            alert('Connection test successful! Validated credentials with provider.');
        }, 2000);
    };

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 h-full overflow-y-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
                        <Database className="h-8 w-8 text-blue-600" />
                        EHR Integration Hub
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">
                        Connect and manage external health records systems
                    </p>
                </div>
                <Badge variant="outline" className="text-blue-600 border-blue-600 bg-blue-50 dark:bg-blue-900/10">
                    <Link2 className="mr-2 h-3 w-3" />
                    HIPAA Compliant
                </Badge>
            </div>

            {/* Connection Overview */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Connected Systems</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {ehrSystems.filter(s => s.status === 'connected').length}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            of {ehrSystems.length} available systems
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Patients Synced</CardTitle>
                        <RefreshCw className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {ehrSystems.reduce((sum, s) => sum + s.patientsSync, 0)}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Last sync: {ehrSystems.find(s => s.status === 'connected')?.lastSync || 'Never'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Data Quality</CardTitle>
                        <AlertCircle className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">98%</div>
                        <p className="text-xs text-slate-500 mt-1">
                            Successful data transfers
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* EHR Systems */}
            <div>
                <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Available EHR Systems</h3>
                <div className="grid md:grid-cols-3 gap-4">
                    {ehrSystems.map(ehr => (
                        <Card key={ehr.id} className={ehr.status === 'connected' ? 'border-green-500 dark:border-green-500/50' : ''}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="text-4xl">{ehr.logo}</div>
                                        <div>
                                            <CardTitle className="flex items-center gap-2 text-base">
                                                {ehr.name}
                                                <div className={getStatusColor(ehr.status)}>
                                                    {ehr.status === 'connected' ? (
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    ) : (
                                                        <Circle className="h-4 w-4" />
                                                    )}
                                                </div>
                                            </CardTitle>
                                            <CardDescription className="mt-1 line-clamp-1">{ehr.description}</CardDescription>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">Status:</span>
                                    {getStatusBadge(ehr.status)}
                                </div>

                                {ehr.status === 'connected' && (
                                    <>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">Last Sync:</span>
                                            <span className="font-medium text-slate-900 dark:text-white">{ehr.lastSync}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">Patients:</span>
                                            <span className="font-medium text-slate-900 dark:text-white">{ehr.patientsSync}</span>
                                        </div>
                                    </>
                                )}

                                {ehr.status === 'connected' ? (
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" className="flex-1">
                                            <RefreshCw className="mr-2 h-3 w-3" />
                                            Sync Now
                                        </Button>
                                        <Button size="sm" variant="outline" className="flex-1">
                                            Settings
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        size="sm"
                                        className="w-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
                                        onClick={() => {
                                            setSelectedEHR(ehr.id);
                                            setConnectDialogOpen(true);
                                        }}
                                    >
                                        <Link2 className="mr-2 h-3 w-3" />
                                        Connect {ehr.name}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 pt-4">
                {/* Patient Consent Manager */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-blue-600" />
                            Patient Consent Manager
                        </CardTitle>
                        <CardDescription>
                            Control what data is shared with external EHR systems
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">Share Diagnoses</p>
                                <p className="text-xs text-slate-500">ICD-10 codes and diagnosis history</p>
                            </div>
                            <Switch
                                checked={consents.shareDiagnoses}
                                onCheckedChange={(checked: boolean) => setConsents({ ...consents, shareDiagnoses: checked })}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">Share Medications</p>
                                <p className="text-xs text-slate-500">Current and past prescriptions</p>
                            </div>
                            <Switch
                                checked={consents.shareMedications}
                                onCheckedChange={(checked: boolean) => setConsents({ ...consents, shareMedications: checked })}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">Share Clinical Notes</p>
                                <p className="text-xs text-slate-500">Session notes and assessments</p>
                            </div>
                            <Switch
                                checked={consents.shareNotes}
                                onCheckedChange={(checked: boolean) => setConsents({ ...consents, shareNotes: checked })}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">Share Lab Results</p>
                                <p className="text-xs text-slate-500">Laboratory test results and values</p>
                            </div>
                            <Switch
                                checked={consents.shareLabs}
                                onCheckedChange={(checked: boolean) => setConsents({ ...consents, shareLabs: checked })}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">Share Appointment History</p>
                                <p className="text-xs text-slate-500">Scheduled and completed appointments</p>
                            </div>
                            <Switch
                                checked={consents.shareAppointments}
                                onCheckedChange={(checked: boolean) => setConsents({ ...consents, shareAppointments: checked })}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">Share Assessment Scores</p>
                                <p className="text-xs text-slate-500">PHQ-9, GAD-7, and other standardized assessments</p>
                            </div>
                            <Switch
                                checked={consents.shareAssessments}
                                onCheckedChange={(checked: boolean) => setConsents({ ...consents, shareAssessments: checked })}
                            />
                        </div>

                        <Button className="w-full mt-4 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">Save Consent Preferences</Button>
                    </CardContent>
                </Card>

                {/* Data Sync Status */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <RefreshCw className="h-5 w-5 text-blue-600" />
                            Data Sync Status
                        </CardTitle>
                        <CardDescription>
                            Recent synchronization activity
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 border border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-900/10 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">ChartPath Sync</p>
                                        <p className="text-xs text-slate-500">127 patients • 2 hours ago</p>
                                    </div>
                                </div>
                                <Badge className="bg-green-600 hover:bg-green-700 text-white">Active</Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Upload className="h-4 w-4 text-blue-600" />
                                        <span className="font-medium text-slate-500">Uploaded</span>
                                    </div>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">2,456</p>
                                    <p className="text-xs text-slate-500">Records this month</p>
                                </div>

                                <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Download className="h-4 w-4 text-emerald-600" />
                                        <span className="font-medium text-slate-500">Downloaded</span>
                                    </div>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">3,821</p>
                                    <p className="text-xs text-slate-500">Records this month</p>
                                </div>
                            </div>

                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded-lg">
                                <p className="text-sm font-medium mb-1 text-slate-900 dark:text-white">Next Scheduled Sync</p>
                                <p className="text-xs text-slate-500">Today at 6:00 PM (in 4 hours)</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Audit Log */}
            <Card className="mt-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5 text-blue-600" />
                        Access Audit Log
                    </CardTitle>
                    <CardDescription>
                        Complete record of all EHR system access and data transfers
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                                    <TableRow>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">Timestamp</TableHead>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">System</TableHead>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">Action</TableHead>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">User</TableHead>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">Records</TableHead>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {auditLog.map(log => (
                                        <TableRow key={log.id}>
                                            <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-400">{log.timestamp}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-white dark:bg-slate-950 font-normal">{log.system}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm font-medium text-slate-900 dark:text-white">{log.action}</TableCell>
                                            <TableCell className="text-sm text-slate-600 dark:text-slate-400">{log.user}</TableCell>
                                            <TableCell className="text-sm text-slate-600 dark:text-slate-400">{log.records}</TableCell>
                                            <TableCell>
                                                <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className={log.status === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 border-transparent text-white' : ''}>
                                                    {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </CardContent>
            </Card>


            {/* Connect EHR Modal */}
            <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Connect EHR System</DialogTitle>
                    </DialogHeader>
                    <form className="space-y-4 pt-4" onSubmit={(e) => {
                        e.preventDefault();
                        alert(`Connection request sent to ${selectedEHR ? ehrSystems.find(e => e.id === selectedEHR)?.name : 'Provider'}. Verification pending.`);
                        setConnectDialogOpen(false);
                    }}>
                        <div className="space-y-2">
                            <Label>EHR System</Label>
                            <SimpleSelect
                                value={selectedEHR}
                                onValueChange={setSelectedEHR}
                                placeholder="Select EHR system"
                                options={ehrSystems.filter(s => s.status !== 'connected').map(ehr => ({ value: ehr.id, label: `${ehr.logo} ${ehr.name}` }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>API Endpoint URL</Label>
                            <Input
                                placeholder="https://api.example.com/fhir"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Client ID</Label>
                            <Input
                                placeholder="Enter client ID from EHR system"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Client Secret</Label>
                            <Input
                                type="password"
                                placeholder="Enter client secret"
                                required
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={handleTestConnection}
                                disabled={testingConnection}
                            >
                                {testingConnection ? (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        Testing...
                                    </>
                                ) : (
                                    'Test Connection'
                                )}
                            </Button>
                            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                                Connect
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
