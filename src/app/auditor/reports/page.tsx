"use client";

import {
    BarChart3,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    CheckCircle2,
    Clock,
    FileText,
    Building2,
    Download
} from "lucide-react";

// Demo compliance data
const complianceStats = {
    overall: 94.2,
    trend: "+2.3%",
    isPositive: true,
    totalAudited: 156,
    flagged: 9,
    approved: 147
};

const organizationReports = [
    { name: "Mountain View Clinic", compliance: 96.5, audited: 45, flagged: 2, trend: "+1.2%" },
    { name: "Sunrise Health", compliance: 92.1, audited: 38, flagged: 3, trend: "-0.8%" },
    { name: "Coastal Wellness", compliance: 94.8, audited: 42, flagged: 2, trend: "+0.5%" },
    { name: "Valley Care Partners", compliance: 91.3, audited: 31, flagged: 2, trend: "+3.1%" },
];

const commonIssues = [
    { issue: "Missing medical necessity documentation", count: 4, severity: "high" },
    { issue: "Incomplete treatment plan", count: 3, severity: "medium" },
    { issue: "Session duration unclear", count: 2, severity: "low" },
];

export default function AuditorReportsPage() {
    return (
        <div className="flex-1 overflow-auto">
            {/* Read-only Banner */}
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-2">
                <p className="text-sm text-amber-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <strong>Read-Only Access:</strong> You can view compliance reports but cannot modify any data.
                </p>
            </div>

            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Compliance Reports</h1>
                        <p className="text-slate-500">Documentation compliance analytics across assigned organizations</p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors">
                        <Download className="h-4 w-4" />
                        Export Report
                    </button>
                </div>

                {/* Overall Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-500 text-sm">Overall Compliance</span>
                            <div className={`flex items-center gap-1 text-sm ${complianceStats.isPositive ? "text-green-600" : "text-red-600"}`}>
                                {complianceStats.isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                {complianceStats.trend}
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{complianceStats.overall}%</p>
                        <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                                style={{ width: `${complianceStats.overall}%` }}
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-500 text-sm">Total Audited</span>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{complianceStats.totalAudited}</p>
                        <p className="text-sm text-slate-400 mt-1">This month</p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-slate-500 text-sm">Approved</span>
                        </div>
                        <p className="text-3xl font-bold text-green-600">{complianceStats.approved}</p>
                        <p className="text-sm text-slate-400 mt-1">Passed review</p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="text-slate-500 text-sm">Flagged</span>
                        </div>
                        <p className="text-3xl font-bold text-red-600">{complianceStats.flagged}</p>
                        <p className="text-sm text-slate-400 mt-1">Needs attention</p>
                    </div>
                </div>

                {/* Organization Breakdown */}
                <div className="bg-white rounded-xl border border-slate-200">
                    <div className="px-5 py-4 border-b border-slate-100">
                        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-slate-400" />
                            Organization Compliance
                        </h2>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {organizationReports.map((org) => (
                            <div key={org.name} className="px-5 py-4 flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-slate-900">{org.name}</p>
                                    <p className="text-sm text-slate-500">{org.audited} audited · {org.flagged} flagged</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-slate-900">{org.compliance}%</p>
                                        <p className={`text-xs ${org.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                                            {org.trend} vs last month
                                        </p>
                                    </div>
                                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${org.compliance >= 95 ? 'bg-green-500' : org.compliance >= 90 ? 'bg-amber-500' : 'bg-red-500'}`}
                                            style={{ width: `${org.compliance}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Common Issues */}
                <div className="bg-white rounded-xl border border-slate-200">
                    <div className="px-5 py-4 border-b border-slate-100">
                        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Common Compliance Issues
                        </h2>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {commonIssues.map((issue, i) => (
                            <div key={i} className="px-5 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className={`w-2 h-2 rounded-full ${issue.severity === 'high' ? 'bg-red-500' :
                                            issue.severity === 'medium' ? 'bg-amber-500' : 'bg-slate-400'
                                        }`} />
                                    <p className="text-slate-700">{issue.issue}</p>
                                </div>
                                <span className="px-3 py-1 bg-slate-100 rounded-full text-sm font-medium text-slate-600">
                                    {issue.count} occurrences
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
