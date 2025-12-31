"use client";

import { Settings as SettingsIcon, Bell, Shield, Building2, Mail, Save } from "lucide-react";
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
const CardDescription = ({ children }: { children: React.ReactNode }) => (
    <p className="text-sm text-muted-foreground mt-1">{children}</p>
);
const CardContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`p-6 pt-4 ${className}`}>{children}</div>
);

export default function AdminSettingsPage() {
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
            <header className="flex-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            <SettingsIcon className="h-6 w-6" />
                            Admin Settings
                        </h1>
                        <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest opacity-70">
                            Configure organization preferences
                        </p>
                    </div>
                    <button
                        onClick={handleSave}
                        className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-primary/20 flex items-center gap-2"
                    >
                        <Save className="h-4 w-4" />
                        {saved ? "Saved!" : "Save Changes"}
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div className="max-w-3xl mx-auto space-y-6">
                    {/* Organization Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-primary" />
                                Organization Details
                            </CardTitle>
                            <CardDescription>Basic information about your organization</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Organization Name</label>
                                <input type="text" defaultValue="Mountain View Clinic" className="w-full px-3 py-2 border rounded-lg" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Phone</label>
                                    <input type="tel" defaultValue="(555) 123-4567" className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Fax</label>
                                    <input type="tel" defaultValue="(555) 123-4568" className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Address</label>
                                <input type="text" defaultValue="123 Healthcare Way, Suite 100" className="w-full px-3 py-2 border rounded-lg" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notification Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bell className="h-5 w-5 text-primary" />
                                Notifications
                            </CardTitle>
                            <CardDescription>Configure how you receive alerts</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[
                                { label: "Email notifications for new users", defaultChecked: true },
                                { label: "Alert when billing is due", defaultChecked: true },
                                { label: "System maintenance notifications", defaultChecked: true },
                                { label: "Weekly usage reports", defaultChecked: false },
                            ].map(item => (
                                <label key={item.label} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                    <span className="text-sm font-medium">{item.label}</span>
                                    <input type="checkbox" defaultChecked={item.defaultChecked} className="rounded h-5 w-5" />
                                </label>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Security Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-primary" />
                                Security
                            </CardTitle>
                            <CardDescription>Manage security preferences</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Session Timeout (minutes)</label>
                                <select className="w-full px-3 py-2 border rounded-lg">
                                    <option>15 minutes</option>
                                    <option selected>30 minutes</option>
                                    <option>60 minutes</option>
                                    <option>Never</option>
                                </select>
                            </div>
                            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <div>
                                    <span className="text-sm font-medium">Require 2FA for all users</span>
                                    <p className="text-xs text-muted-foreground">Enforce two-factor authentication</p>
                                </div>
                                <input type="checkbox" defaultChecked className="rounded h-5 w-5" />
                            </label>
                            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <div>
                                    <span className="text-sm font-medium">Audit logging</span>
                                    <p className="text-xs text-muted-foreground">Track all user actions</p>
                                </div>
                                <input type="checkbox" defaultChecked className="rounded h-5 w-5" />
                            </label>
                        </CardContent>
                    </Card>

                    {/* Email Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Mail className="h-5 w-5 text-primary" />
                                Email Configuration
                            </CardTitle>
                            <CardDescription>Configure email sender settings</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Reply-to Email</label>
                                <input type="email" defaultValue="admin@mountainviewclinic.com" className="w-full px-3 py-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Email Footer Text</label>
                                <textarea
                                    defaultValue="Mountain View Clinic - Providing compassionate mental healthcare since 2010."
                                    className="w-full px-3 py-2 border rounded-lg h-20 resize-none"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
