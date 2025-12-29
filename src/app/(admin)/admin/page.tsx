import Link from "next/link";
import {
    Building2,
    Users,
    FileText,
    DollarSign,
    TrendingUp,
    Activity,
    ArrowRight,
    AlertTriangle,
} from "lucide-react";
import { platformBillingStats } from "@/lib/demo-data/billing";

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

export default function AdminDashboardPage() {
    const stats = platformBillingStats;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                        Admin Dashboard
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Platform overview and management
                    </p>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Platform Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-6 text-white">
                            <div className="flex items-center gap-3 mb-2">
                                <DollarSign className="h-6 w-6 opacity-80" />
                                <span className="text-sm font-medium opacity-80">Platform Revenue</span>
                            </div>
                            <p className="text-3xl font-bold">{formatCurrency(stats.total_billing)}</p>
                            <p className="text-sm opacity-80 mt-1">+12.5% from last month</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3 mb-2">
                                <TrendingUp className="h-6 w-6 text-emerald-500" />
                                <span className="text-sm font-medium text-slate-500">Fees Collected</span>
                            </div>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">
                                {formatCurrency(stats.total_fees_collected)}
                            </p>
                            <p className="text-sm text-emerald-500 mt-1">1% avg fee rate</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3 mb-2">
                                <Building2 className="h-6 w-6 text-blue-500" />
                                <span className="text-sm font-medium text-slate-500">Organizations</span>
                            </div>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">
                                {stats.total_organizations}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">3 new this month</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3 mb-2">
                                <Users className="h-6 w-6 text-purple-500" />
                                <span className="text-sm font-medium text-slate-500">Total Users</span>
                            </div>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">
                                {stats.total_users}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">{stats.total_notes.toLocaleString()} notes generated</p>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Link
                            href="/admin/organizations"
                            className="group bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 hover:border-primary hover:shadow-lg transition-all"
                        >
                            <div className="flex items-center justify-between">
                                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30">
                                    <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                            <h3 className="mt-4 font-bold text-slate-900 dark:text-white">
                                Manage Organizations
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                                View and edit organization settings
                            </p>
                        </Link>

                        <Link
                            href="/admin/templates"
                            className="group bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 hover:border-primary hover:shadow-lg transition-all"
                        >
                            <div className="flex items-center justify-between">
                                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/30">
                                    <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                </div>
                                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                            <h3 className="mt-4 font-bold text-slate-900 dark:text-white">
                                Template Library
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Manage system and org templates
                            </p>
                        </Link>

                        <Link
                            href="/admin/fees"
                            className="group bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 hover:border-primary hover:shadow-lg transition-all"
                        >
                            <div className="flex items-center justify-between">
                                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
                                    <Activity className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                            <h3 className="mt-4 font-bold text-slate-900 dark:text-white">
                                Platform Fees
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Configure fee rates and collection
                            </p>
                        </Link>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <h2 className="font-bold text-slate-900 dark:text-white">
                                Top Organizations by Revenue
                            </h2>
                            <Link href="/admin/organizations" className="text-sm text-primary font-medium hover:underline">
                                View All
                            </Link>
                        </div>
                        <table className="min-w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Organization</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Users</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Notes</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Revenue</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Fees</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {stats.organizations.slice(0, 5).map((org) => (
                                    <tr key={org.organization_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                            {org.organization_name}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{org.total_users}</td>
                                        <td className="px-6 py-4 text-slate-500">{org.total_notes}</td>
                                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                                            {formatCurrency(org.total_billing)}
                                        </td>
                                        <td className="px-6 py-4 text-emerald-600 font-medium">
                                            {formatCurrency(org.total_fees)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Alerts */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-amber-800 dark:text-amber-300">Demo Mode Active</p>
                            <p className="text-sm text-amber-600 dark:text-amber-400">
                                This admin dashboard displays simulated data. Connect to Supabase to manage real organizations.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
