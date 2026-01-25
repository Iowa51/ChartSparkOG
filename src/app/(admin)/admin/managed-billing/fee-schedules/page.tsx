/**
 * Fee Schedule Management Page - Coming Soon
 * Task 0.3: Keep visible with "Coming Soon" banner
 * Full implementation deferred to Phase 3
 */

'use client';

import Link from 'next/link';
import {
    ArrowLeft,
    FileSpreadsheet,
    Bell,
    Clock,
    CheckCircle2,
} from 'lucide-react';

export default function FeeSchedulesPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/admin/managed-billing"
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                Fee Schedules
                            </h1>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Manage CPT code fee schedules for billing
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-8">
                {/* Coming Soon Banner */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-8">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-800/50 rounded-lg">
                            <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                                Fee Schedules — Coming Soon
                            </h2>
                            <p className="mt-2 text-blue-800 dark:text-blue-200">
                                This feature is currently in development. You&apos;ll be able to configure
                                insurance payer rates, CPT codes, and modifiers here once complete.
                            </p>
                            <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                                Expected availability: Q1 2026
                            </p>
                        </div>
                    </div>
                </div>

                {/* Empty State */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12">
                    <div className="text-center">
                        <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                            <FileSpreadsheet className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                            Fee schedules will be configured here
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-8">
                            Once this feature is complete, you&apos;ll be able to create and manage
                            fee schedules for different insurance payers and set allowed amounts
                            for each CPT code.
                        </p>

                        {/* Planned Features */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-6 text-left max-w-lg mx-auto">
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                                Planned Capabilities
                            </h4>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                        Create multiple fee schedules (Medicare, BCBS, Aetna, etc.)
                                    </span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                        Set allowed amounts for each CPT code
                                    </span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                        Support CPT modifiers (-25, -59, etc.)
                                    </span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                        Bulk import/export via CSV
                                    </span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                        Rate change history and audit trail
                                    </span>
                                </li>
                            </ul>
                        </div>

                        {/* Contact Admin */}
                        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <Bell className="h-4 w-4" />
                            <span>Contact your administrator for updates on this feature.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
