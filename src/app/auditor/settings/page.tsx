"use client";

import { useState } from "react";
import {
    Settings,
    AlertTriangle,
    User,
    Bell,
    Shield,
    Mail,
    Moon,
    Monitor
} from "lucide-react";

export default function AuditorSettingsPage() {
    const [notifications, setNotifications] = useState({
        newSubmissions: true,
        flagUpdates: true,
        weeklyDigest: false,
        emailAlerts: true
    });

    const [theme, setTheme] = useState("system");

    return (
        <div className="flex-1 overflow-auto">
            {/* Read-only Banner */}
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-2">
                <p className="text-sm text-amber-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <strong>Read-Only Access:</strong> You can update your personal preferences but cannot modify account permissions.
                </p>
            </div>

            <div className="p-6 space-y-6 max-w-3xl">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                    <p className="text-slate-500">Manage your auditor account preferences</p>
                </div>

                {/* Profile Section */}
                <div className="bg-white rounded-xl border border-slate-200">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                        <User className="h-5 w-5 text-slate-400" />
                        <h2 className="font-semibold text-slate-900">Profile</h2>
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
                                <User className="h-8 w-8 text-amber-600" />
                            </div>
                            <div>
                                <p className="font-medium text-slate-900">Auditor Account</p>
                                <p className="text-sm text-slate-500">auditor@chartspark.com</p>
                                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                    AUDITOR
                                </span>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
                            To update your profile information or change your password, please contact your Super Admin.
                        </p>
                    </div>
                </div>

                {/* Notifications Section */}
                <div className="bg-white rounded-xl border border-slate-200">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                        <Bell className="h-5 w-5 text-slate-400" />
                        <h2 className="font-semibold text-slate-900">Notifications</h2>
                    </div>
                    <div className="p-5 space-y-4">
                        {[
                            { key: "newSubmissions", label: "New Submissions", desc: "Get notified when new submissions need review" },
                            { key: "flagUpdates", label: "Flag Updates", desc: "Notifications when your flags are resolved" },
                            { key: "weeklyDigest", label: "Weekly Digest", desc: "Receive a weekly summary of audit activity" },
                            { key: "emailAlerts", label: "Email Alerts", desc: "Send important notifications to your email" },
                        ].map(item => (
                            <div key={item.key} className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-slate-900">{item.label}</p>
                                    <p className="text-sm text-slate-500">{item.desc}</p>
                                </div>
                                <button
                                    onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                                    className={`w-12 h-6 rounded-full transition-colors ${notifications[item.key as keyof typeof notifications]
                                            ? "bg-amber-500"
                                            : "bg-slate-200"
                                        }`}
                                >
                                    <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${notifications[item.key as keyof typeof notifications]
                                            ? "translate-x-6"
                                            : "translate-x-0.5"
                                        }`} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Appearance Section */}
                <div className="bg-white rounded-xl border border-slate-200">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                        <Moon className="h-5 w-5 text-slate-400" />
                        <h2 className="font-semibold text-slate-900">Appearance</h2>
                    </div>
                    <div className="p-5">
                        <p className="font-medium text-slate-900 mb-3">Theme</p>
                        <div className="flex gap-3">
                            {[
                                { key: "light", label: "Light", icon: "☀️" },
                                { key: "dark", label: "Dark", icon: "🌙" },
                                { key: "system", label: "System", icon: "💻" },
                            ].map(opt => (
                                <button
                                    key={opt.key}
                                    onClick={() => setTheme(opt.key)}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${theme === opt.key
                                            ? "border-amber-500 bg-amber-50 text-amber-700"
                                            : "border-slate-200 hover:bg-slate-50"
                                        }`}
                                >
                                    <span>{opt.icon}</span>
                                    <span className="font-medium">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Security Section */}
                <div className="bg-white rounded-xl border border-slate-200">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-slate-400" />
                        <h2 className="font-semibold text-slate-900">Security</h2>
                    </div>
                    <div className="p-5">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                            <div>
                                <p className="font-medium text-slate-900">Two-Factor Authentication</p>
                                <p className="text-sm text-slate-500">Add an extra layer of security to your account</p>
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                Enabled
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-3">
                            Security settings are managed by your organization's Super Admin.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
