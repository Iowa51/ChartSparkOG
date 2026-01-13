'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    Shield,
    Smartphone,
    Clock,
    Lock,
    KeyRound,
    Eye,
    EyeOff,
    Check,
    ChevronRight,
    AlertTriangle,
} from 'lucide-react';
import { hasMFAEnabled, isMFARequired } from '@/lib/auth/mfa';
import { SESSION_CONFIG } from '@/lib/auth/session';
import { LOCKOUT_CONFIG } from '@/lib/auth/lockout';
import { PASSWORD_REQUIREMENTS } from '@/lib/auth/password-validation';

export default function SecuritySettingsPage() {
    const [showReqDetails, setShowReqDetails] = useState(false);

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link
                    href="/settings"
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Security Settings
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Manage your account security and HIPAA compliance settings
                    </p>
                </div>
            </div>

            {/* HIPAA Compliance Banner */}
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 mb-8">
                <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                        <Shield className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                        <h2 className="font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                            HIPAA Security Compliance
                        </h2>
                        <p className="text-sm text-emerald-700 dark:text-emerald-400">
                            ChartSpark implements comprehensive security measures to protect Protected Health Information (PHI) in accordance with HIPAA requirements. All access to patient data is logged and monitored.
                        </p>
                    </div>
                </div>
            </div>

            {/* Security Settings Grid */}
            <div className="space-y-6">
                {/* Two-Factor Authentication */}
                <Link
                    href="/settings/security/mfa"
                    className="block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 hover:border-primary/50 transition-colors group"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                                <Smartphone className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">
                                    Two-Factor Authentication
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Add an extra layer of security with authenticator app
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
                    </div>
                </Link>

                {/* Session Timeout Info */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                            <Clock className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white">
                                Automatic Session Timeout
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Sessions automatically expire for your security
                            </p>
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Inactivity Timeout</span>
                            <span className="font-medium text-slate-900 dark:text-white">
                                {SESSION_CONFIG.inactivityTimeout / 60000} minutes
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Maximum Session Duration</span>
                            <span className="font-medium text-slate-900 dark:text-white">
                                {SESSION_CONFIG.absoluteTimeout / 3600000} hours
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Warning Before Timeout</span>
                            <span className="font-medium text-slate-900 dark:text-white">
                                {SESSION_CONFIG.warningBefore / 60000} minutes
                            </span>
                        </div>
                    </div>
                </div>

                {/* Account Lockout Info */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="h-12 w-12 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                            <Lock className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white">
                                Account Lockout Protection
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Protection against brute force attacks
                            </p>
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Max Failed Attempts</span>
                            <span className="font-medium text-slate-900 dark:text-white">
                                {LOCKOUT_CONFIG.maxAttempts} attempts
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Lockout Duration</span>
                            <span className="font-medium text-slate-900 dark:text-white">
                                {LOCKOUT_CONFIG.lockoutDuration / 60000} minutes
                            </span>
                        </div>
                    </div>
                </div>

                {/* Password Requirements */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                                <KeyRound className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">
                                    Password Requirements
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Strong passwords are required for all accounts
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowReqDetails(!showReqDetails)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            {showReqDetails ? <EyeOff className="h-5 w-5 text-slate-400" /> : <Eye className="h-5 w-5 text-slate-400" />}
                        </button>
                    </div>

                    {showReqDetails && (
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-emerald-500" />
                                <span className="text-slate-700 dark:text-slate-300">
                                    Minimum {PASSWORD_REQUIREMENTS.minLength} characters
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-emerald-500" />
                                <span className="text-slate-700 dark:text-slate-300">
                                    At least one uppercase letter
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-emerald-500" />
                                <span className="text-slate-700 dark:text-slate-300">
                                    At least one lowercase letter
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-emerald-500" />
                                <span className="text-slate-700 dark:text-slate-300">
                                    At least one number
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-emerald-500" />
                                <span className="text-slate-700 dark:text-slate-300">
                                    At least one special character
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-emerald-500" />
                                <span className="text-slate-700 dark:text-slate-300">
                                    Cannot contain common passwords
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Change Password Link */}
                <Link
                    href="/settings/security/change-password"
                    className="block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 hover:border-primary/50 transition-colors group"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <KeyRound className="h-6 w-6 text-slate-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">
                                    Change Password
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Update your account password
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
                    </div>
                </Link>

                {/* Data Protection Notice */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                            <p className="font-medium text-slate-900 dark:text-white mb-1">
                                Data Protection
                            </p>
                            <p>
                                All sensitive data is encrypted using AES-256-GCM encryption. Access to Protected Health Information (PHI) is logged and audited. Contact your administrator for any security concerns.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
