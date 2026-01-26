"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";

interface OrgReport {
    id: string;
    name: string;
    compliance: number;
    audited: number;
    approved: number;
    flagged: number;
}

interface CommonIssue {
    reason: string;
    count: number;
    severity: "high" | "medium" | "low";
}

interface Props {
    stats: {
        overall: number;
        totalAudited: number;
        approved: number;
        flagged: number;
    };
    organizations: OrgReport[];
    issues: CommonIssue[];
}

export function ReportsExportButton({ stats, organizations, issues }: Props) {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);

        try {
            // Generate PDF content
            const reportDate = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Create HTML content for PDF
            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Compliance Report - ${reportDate}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            color: #1e293b;
            background: white;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #f1f5f9;
            padding-bottom: 20px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #0d9488;
            margin-bottom: 8px;
        }
        .title {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        .date {
            color: #64748b;
            font-size: 14px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 32px;
        }
        .stat-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px;
            text-align: center;
        }
        .stat-value {
            font-size: 32px;
            font-weight: bold;
            color: #0f172a;
        }
        .stat-label {
            font-size: 12px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .section {
            margin-bottom: 32px;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e2e8f0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }
        th {
            background: #f8fafc;
            font-size: 12px;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 600;
        }
        .compliance-bar {
            width: 80px;
            height: 8px;
            background: #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
        }
        .compliance-fill {
            height: 100%;
            border-radius: 4px;
        }
        .high { background-color: #10b981; }
        .medium { background-color: #f59e0b; }
        .low { background-color: #ef4444; }
        .severity-dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 8px;
        }
        .severity-high { background-color: #ef4444; }
        .severity-medium { background-color: #f59e0b; }
        .severity-low { background-color: #94a3b8; }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #94a3b8;
            font-size: 12px;
        }
        @media print {
            body { padding: 20px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">ChartSpark</div>
        <h1 class="title">Compliance Report</h1>
        <p class="date">Generated on ${reportDate}</p>
    </div>
    
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-value">${stats.overall}%</div>
            <div class="stat-label">Compliance</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.totalAudited}</div>
            <div class="stat-label">Total Audited</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.approved}</div>
            <div class="stat-label">Approved</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.flagged}</div>
            <div class="stat-label">Flagged</div>
        </div>
    </div>
    
    <div class="section">
        <h2 class="section-title">Organization Compliance Breakdown</h2>
        ${organizations.length === 0 ? '<p>No organization data available.</p>' : `
        <table>
            <thead>
                <tr>
                    <th>Organization</th>
                    <th>Audited</th>
                    <th>Approved</th>
                    <th>Flagged</th>
                    <th>Compliance</th>
                </tr>
            </thead>
            <tbody>
                ${organizations.map(org => `
                <tr>
                    <td><strong>${org.name}</strong></td>
                    <td>${org.audited}</td>
                    <td>${org.approved}</td>
                    <td>${org.flagged}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span>${org.compliance}%</span>
                            <div class="compliance-bar">
                                <div class="compliance-fill ${org.compliance >= 95 ? 'high' : org.compliance >= 90 ? 'medium' : 'low'}" style="width: ${org.compliance}%"></div>
                            </div>
                        </div>
                    </td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        `}
    </div>
    
    <div class="section">
        <h2 class="section-title">Common Compliance Issues</h2>
        ${issues.length === 0 ? '<p>No compliance issues flagged this month. Great work!</p>' : `
        <table>
            <thead>
                <tr>
                    <th>Issue</th>
                    <th>Occurrences</th>
                    <th>Severity</th>
                </tr>
            </thead>
            <tbody>
                ${issues.map(issue => `
                <tr>
                    <td>
                        <span class="severity-dot severity-${issue.severity}"></span>
                        ${issue.reason}
                    </td>
                    <td>${issue.count}</td>
                    <td style="text-transform: capitalize;">${issue.severity}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        `}
    </div>
    
    <div class="footer">
        <p>This report was generated by ChartSpark Auditor Dashboard</p>
        <p>© ${new Date().getFullYear()} ChartSpark - Connected Care Solutions</p>
    </div>
</body>
</html>
            `;

            // Create a new window and print as PDF
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(htmlContent);
                printWindow.document.close();

                // Wait for content to load then trigger print
                printWindow.onload = () => {
                    setTimeout(() => {
                        printWindow.print();
                    }, 250);
                };
            } else {
                // Fallback: download as HTML
                const blob = new Blob([htmlContent], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.html`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to generate report. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Download className="h-4 w-4" />
            )}
            {isExporting ? 'Generating...' : 'Export Report'}
        </button>
    );
}
