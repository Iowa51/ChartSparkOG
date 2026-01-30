"use client";

import {
    Database,
    Search,
    Filter,
    ArrowUpDown,
    AlertCircle,
    CheckCircle2,
    DollarSign,
    Building2,
    TrendingUp,
    ShieldCheck,
    Globe,
    ArrowRight
} from "lucide-react";
import { useState } from "react";
import DetailModal from "@/components/ui/DetailModal";

const scheduleParityData = [
    {
        code: "99214",
        description: "Office visit, established, 30-39 min",
        wellnessCenter: 18500,
        mainStreet: 21000,
        marketAvg: 19500,
        status: "Parity Match"
    },
    {
        code: "90834",
        description: "Psychotherapy, 45 minutes",
        wellnessCenter: 15000,
        mainStreet: 18500,
        marketAvg: 17500,
        status: "Below Market"
    },
    {
        code: "96127",
        description: "Brief emotional/behavioral assessment",
        wellnessCenter: 8500,
        mainStreet: 9200,
        marketAvg: 9000,
        status: "Parity Match"
    },
    {
        code: "99213",
        description: "Office visit, established, 20-29 min",
        wellnessCenter: 13000,
        mainStreet: 14500,
        marketAvg: 14000,
        status: "Below Market"
    }
];

export default function FeeScheduleAuditorPage() {
    const [modalOpen, setModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<{ title: string; content: React.ReactNode }>({ title: "", content: null });

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(cents / 100);
    };

    const handleMetricClick = (metric: string) => {
        setModalContent({
            title: metric,
            content: (
                <div className="text-center p-6">
                    <p className="text-4xl font-bold text-primary mb-2">
                        {metric === "Total Codes Audited" ? "124" : metric === "Price Variances" ? "18" : "86%"}
                    </p>
                    <p className="text-sm text-slate-500">Detailed breakdown and historical trends available</p>
                </div>
            )
        });
        setModalOpen(true);
    };

    const handleMarketBenchmark = () => {
        setModalContent({
            title: "Market Benchmark Data",
            content: (
                <div className="space-y-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <p className="text-xs font-bold text-slate-400 uppercase">Regional Medicare Rates</p>
                        <p className="text-sm mt-1">Standard rates for your region</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <p className="text-xs font-bold text-slate-400 uppercase">Commercial Payer Averages</p>
                        <p className="text-sm mt-1">Average rates across major payers</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <p className="text-xs font-bold text-slate-400 uppercase">Geo-Adjusted Fee Comparisons</p>
                        <p className="text-sm mt-1">Location-adjusted market comparisons</p>
                    </div>
                </div>
            )
        });
        setModalOpen(true);
    };

    const handleCertifyRateCard = () => {
        setModalContent({
            title: "Rate Card Certification",
            content: (
                <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">Ready to certify current rate card</p>
                    </div>
                    <div className="space-y-2 text-sm">
                        <p><strong>This will:</strong></p>
                        <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400">
                            <li>Generate PDF certificate</li>
                            <li>Timestamp the approval</li>
                            <li>Track auditor who certified</li>
                            <li>Lock rates for billing period</li>
                        </ol>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-sm">Cancel</button>
                        <button className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold text-sm">Certify</button>
                    </div>
                </div>
            )
        });
        setModalOpen(true);
    };

    const handleCodeClick = (code: string, description: string) => {
        setModalContent({
            title: `CPT Code ${code}`,
            content: (
                <div className="space-y-4">
                    <p className="text-sm font-medium">{description}</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <p className="text-xs font-bold text-slate-400 uppercase">All Payer Rates</p>
                            <p className="text-sm mt-1">View all insurance rates</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <p className="text-xs font-bold text-slate-400 uppercase">Rate History</p>
                            <p className="text-sm mt-1">Historical changes</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <p className="text-xs font-bold text-slate-400 uppercase">Denial Patterns</p>
                            <p className="text-sm mt-1">Code-specific denials</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <p className="text-xs font-bold text-slate-400 uppercase">Utilization Stats</p>
                            <p className="text-sm mt-1">Usage statistics</p>
                        </div>
                    </div>
                </div>
            )
        });
        setModalOpen(true);
    };

    const handleSyncBaseRates = () => {
        setModalContent({
            title: "Sync Base Rates",
            content: (
                <div className="space-y-3">
                    <p className="text-sm">This will pull the latest Medicare rates and update fee schedules across all organizations.</p>
                    <div className="flex gap-2 pt-2">
                        <button onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-sm">Cancel</button>
                        <button className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg font-bold text-sm">Sync Now</button>
                    </div>
                </div>
            )
        });
        setModalOpen(true);
    };

    const handleGenerateOptimization = () => {
        setModalContent({
            title: "Optimization Report",
            content: (
                <div className="space-y-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <p className="text-sm"><strong>18 codes</strong> below market rates</p>
                        <p className="text-sm"><strong>Potential increase:</strong> $42,500/mo</p>
                        <p className="text-sm"><strong>Category:</strong> Mental Health services</p>
                    </div>
                    <button className="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg font-bold text-sm">Download PDF Report</button>
                </div>
            )
        });
        setModalOpen(true);
    };

    return (
        <div className="flex-1 flex flex-col h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
            {/* Header */}
            <div className="p-6 lg:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Database className="h-8 w-8 text-indigo-500" />
                            Fee Schedule Auditor
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Parity verification and market benchmarking across organizational rate cards
                        </p>
                    </div>
                </div>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
                <div onClick={() => handleMetricClick("Total Codes Audited")} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 cursor-pointer transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Total Codes Audited</p>
                            <p className="text-3xl font-bold mt-2">124</p>
                        </div>
                        <ShieldCheck className="h-10 w-10 text-indigo-500 opacity-50" />
                    </div>
                </div>

                <div onClick={() => handleMetricClick("Price Variances")} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-400 cursor-pointer transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Price Variances</p>
                            <p className="text-3xl font-bold mt-2 text-amber-600">18</p>
                        </div>
                        <AlertCircle className="h-10 w-10 text-amber-500 opacity-50" />
                    </div>
                </div>

                <div onClick={() => handleMetricClick("Parity Score")} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 cursor-pointer transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Parity Score</p>
                            <p className="text-3xl font-bold mt-2 text-emerald-600">86%</p>
                        </div>
                        <CheckCircle2 className="h-10 w-10 text-emerald-500 opacity-50" />
                    </div>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="px-6 pb-4 flex flex-wrap gap-3">
                <button onClick={handleMarketBenchmark} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Market Benchmark
                </button>
                <button onClick={handleCertifyRateCard} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Certify Rate Card
                </button>
                <button onClick={handleSyncBaseRates} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Sync Base Rates
                </button>
            </div>

            {/* CPT Codes Table */}
            <div className="flex-1 overflow-auto px-6 pb-6">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full">
                        <thead className="border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">CPT Code</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Wellness Center</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Main Street</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Market Avg</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scheduleParityData.map((item, index) => (
                                <tr key={index} onClick={() => handleCodeClick(item.code, item.description)} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-all">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm">{item.code}</span>
                                            <span className="text-xs text-slate-500">{item.description}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-bold">{formatCurrency(item.wellnessCenter)}</td>
                                    <td className="px-6 py-4 font-bold">{formatCurrency(item.mainStreet)}</td>
                                    <td className="px-6 py-4 font-bold text-indigo-600">{formatCurrency(item.marketAvg)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${item.status === "Parity Match"
                                            ? "bg-emerald-500/10 text-emerald-600"
                                            : "bg-amber-500/10 text-amber-600"
                                            }`}>
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Revenue Optimization CTA */}
            <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 mx-6 mb-6 rounded-3xl shadow-2xl text-white flex items-center justify-between">
                <div className="flex-1 space-y-2">
                    <h3 className="text-2xl font-bold">Revenue Optimization Opportunity</h3>
                    <p className="text-white/80 max-w-2xl text-sm">Our AI benchmarking suggests that current fee schedules for <strong>Mental Health</strong> services are <strong>12% below</strong> regional market rates. Adjusting to market parity could result in an estimated <strong>$42,500/mo</strong> increase in revenue.</p>
                </div>
                <button onClick={handleGenerateOptimization} className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-lg flex-shrink-0">
                    Generate Optimization Report
                </button>
            </div>

            {/* Detail Modal */}
            <DetailModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={modalContent.title}
            >
                {modalContent.content}
            </DetailModal>
        </div>
    );
}
