import { Settings } from "lucide-react";
import Link from "next/link";

export default function AdminSettingsPage() {
    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Settings
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Organization settings and preferences
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Organization Info */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                    <h2 className="font-bold text-slate-900 dark:text-white mb-4">Organization Info</h2>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Name</span>
                            <span className="text-slate-900 dark:text-white font-medium">Demo Clinic</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Subscription</span>
                            <span className="text-slate-900 dark:text-white font-medium">Professional</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Users</span>
                            <span className="text-slate-900 dark:text-white font-medium">5 active</span>
                        </div>
                    </div>
                </div>

                {/* Billing (read-only for Admin) */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                    <h2 className="font-bold text-slate-900 dark:text-white mb-4">Billing</h2>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                            Billing information is managed by Platform Super Admins.
                            Contact support for billing changes.
                        </p>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:col-span-2">
                    <h2 className="font-bold text-slate-900 dark:text-white mb-4">Quick Links</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Link
                            href="/admin/users"
                            className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <p className="font-medium text-slate-900 dark:text-white">Manage Users</p>
                            <p className="text-xs text-slate-500 mt-1">Add, edit, deactivate</p>
                        </Link>
                        <Link
                            href="/admin/submissions"
                            className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <p className="font-medium text-slate-900 dark:text-white">Submissions</p>
                            <p className="text-xs text-slate-500 mt-1">Review and approve</p>
                        </Link>
                        <Link
                            href="/admin/features"
                            className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <p className="font-medium text-slate-900 dark:text-white">Features</p>
                            <p className="text-xs text-slate-500 mt-1">Assign to users</p>
                        </Link>
                        <Link
                            href="/admin/auditor-notes"
                            className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <p className="font-medium text-slate-900 dark:text-white">Audit Flags</p>
                            <p className="text-xs text-slate-500 mt-1">Review compliance</p>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
