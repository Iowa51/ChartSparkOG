"use client";

import { CreditCard, DollarSign, TrendingUp, FileText, Download, Filter } from "lucide-react";
import { useState } from "react";

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

const invoices = [
    { id: "INV-001", date: "Jan 15, 2024", amount: "$2,450.00", status: "paid", description: "Monthly Subscription - Enterprise" },
    { id: "INV-002", date: "Dec 15, 2023", amount: "$2,450.00", status: "paid", description: "Monthly Subscription - Enterprise" },
    { id: "INV-003", date: "Nov 15, 2023", amount: "$2,450.00", status: "paid", description: "Monthly Subscription - Enterprise" },
    { id: "INV-004", date: "Oct 15, 2023", amount: "$1,950.00", status: "paid", description: "Monthly Subscription - Professional" },
];

export default function AdminBillingPage() {
    const [filter, setFilter] = useState("all");

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
            <header className="flex-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Billing</h1>
                        <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest opacity-70">
                            Subscription & invoice management
                        </p>
                    </div>
                    <button className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-primary/20 flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        Export Invoices
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Stats */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Current Plan</CardTitle>
                                <CreditCard className="h-4 w-4 text-slate-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">Enterprise</div>
                                <p className="text-xs text-muted-foreground">$2,450/month</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent (YTD)</CardTitle>
                                <DollarSign className="h-4 w-4 text-slate-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-emerald-600">$29,400</div>
                                <p className="text-xs text-muted-foreground">12 invoices</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Next Payment</CardTitle>
                                <TrendingUp className="h-4 w-4 text-slate-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">Feb 15, 2024</div>
                                <p className="text-xs text-muted-foreground">$2,450.00</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Invoice History */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Invoice History</CardTitle>
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-muted-foreground" />
                                    <select
                                        value={filter}
                                        onChange={e => setFilter(e.target.value)}
                                        className="text-sm border rounded-lg px-2 py-1"
                                    >
                                        <option value="all">All</option>
                                        <option value="paid">Paid</option>
                                        <option value="pending">Pending</option>
                                    </select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-hidden rounded-xl border border-border">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted/50 text-muted-foreground font-bold uppercase text-[10px]">
                                        <tr>
                                            <th className="px-6 py-3">Invoice</th>
                                            <th className="px-6 py-3">Date</th>
                                            <th className="px-6 py-3">Description</th>
                                            <th className="px-6 py-3">Amount</th>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {invoices.map(inv => (
                                            <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4 font-bold">{inv.id}</td>
                                                <td className="px-6 py-4 text-muted-foreground">{inv.date}</td>
                                                <td className="px-6 py-4">{inv.description}</td>
                                                <td className="px-6 py-4 font-bold">{inv.amount}</td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase">
                                                        {inv.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => alert(`Downloading ${inv.id}`)}
                                                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                                                    >
                                                        <FileText className="h-3 w-3" />
                                                        Download
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
