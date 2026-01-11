"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    DollarSign,
    TrendingUp,
    Building2,
    Download,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
} from "lucide-react";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";

// Demo data for charts
const monthlyRevenueData = [
    { month: "Jul", revenue: 45000, fees: 450 },
    { month: "Aug", revenue: 52000, fees: 520 },
    { month: "Sep", revenue: 48000, fees: 480 },
    { month: "Oct", revenue: 61000, fees: 610 },
    { month: "Nov", revenue: 55000, fees: 550 },
    { month: "Dec", revenue: 67000, fees: 670 },
];

const tierBreakdown = [
    { name: "Complete", value: 45, color: "#9333ea" },
    { name: "Professional", value: 35, color: "#3b82f6" },
    { name: "Starter", value: 20, color: "#64748b" },
];

export default function FinancialsPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        monthlyRevenue: 0,
        platformFees: 0,
        outstanding: 0,
    });
    const [orgRevenue, setOrgRevenue] = useState<any[]>([]);

    useEffect(() => {
        fetchFinancialData();
    }, []);

    const fetchFinancialData = async () => {
        setLoading(true);
        try {
            // Get revenue from paid submissions
            const { data: submissionsData } = await supabase
                .from('submissions')
                .select(`
                    billing_amount,
                    platform_fee_amount,
                    status,
                    organization_id,
                    organizations(name)
                `)
                .in('status', ['paid', 'approved', 'submitted']);

            if (submissionsData) {
                const totalRevenue = submissionsData.reduce((sum, s) => sum + (s.billing_amount || 0), 0);
                const platformFees = submissionsData.reduce((sum, s) => sum + (s.platform_fee_amount || 0), 0);
                const outstanding = submissionsData
                    .filter(s => s.status !== 'paid')
                    .reduce((sum, s) => sum + (s.billing_amount || 0), 0);

                setStats({
                    totalRevenue,
                    monthlyRevenue: totalRevenue * 0.15, // Demo: assume 15% is this month
                    platformFees,
                    outstanding,
                });

                // Group by organization
                const orgMap = new Map();
                submissionsData.forEach(s => {
                    const orgName = s.organizations?.name || 'Unknown';
                    if (!orgMap.has(orgName)) {
                        orgMap.set(orgName, { name: orgName, revenue: 0, fees: 0 });
                    }
                    const org = orgMap.get(orgName);
                    org.revenue += s.billing_amount || 0;
                    org.fees += s.platform_fee_amount || 0;
                });
                setOrgRevenue(Array.from(orgMap.values()));
            }
        } catch (error) {
            console.error("Error fetching financial data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = () => {
        // Demo export
        alert("CSV export would be generated here with full financial data.");
    };

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                        Financials
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Platform revenue and fee collection overview
                    </p>
                </div>
                <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
                >
                    <Download className="h-5 w-5" />
                    Export Report
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 mb-1">Total Revenue</p>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">
                                ${stats.totalRevenue.toLocaleString()}
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                            <DollarSign className="h-6 w-6 text-emerald-600" />
                        </div>
                    </div>
                    <div className="flex items-center gap-1 mt-3 text-xs text-emerald-600">
                        <ArrowUpRight className="h-3 w-3" />
                        <span>+12.5% from last month</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 mb-1">This Month</p>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">
                                ${stats.monthlyRevenue.toLocaleString()}
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                            <Calendar className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 mb-1">Platform Fees</p>
                            <p className="text-3xl font-bold text-purple-600">
                                ${stats.platformFees.toLocaleString()}
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 mb-1">Outstanding</p>
                            <p className="text-3xl font-bold text-amber-600">
                                ${stats.outstanding.toLocaleString()}
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-amber-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Revenue Trend */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-4">Revenue Trend</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={monthlyRevenueData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="month" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue" />
                                <Line type="monotone" dataKey="fees" stroke="#9333ea" strokeWidth={2} name="Platform Fees" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Tier Breakdown */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-4">Revenue by Tier</h3>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={tierBreakdown}
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {tierBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 mt-2">
                        {tierBreakdown.map((tier) => (
                            <div key={tier.name} className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: tier.color }} />
                                <span className="text-xs text-slate-500">{tier.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Revenue by Organization Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-slate-900 dark:text-white">Revenue by Organization</h3>
                </div>
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Organization</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total Revenue</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Platform Fees</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            <tr>
                                <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                                    Loading...
                                </td>
                            </tr>
                        ) : orgRevenue.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                                    No revenue data available
                                </td>
                            </tr>
                        ) : (
                            orgRevenue.map((org, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                        {org.name}
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">
                                        ${org.revenue.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right text-purple-600">
                                        ${org.fees.toLocaleString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
