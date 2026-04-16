"use client";

import { useState, useEffect } from "react";
import {
    X,
    Check,
    Zap,
    Crown,
    Star,
    LayoutDashboard,
    Users,
    Calendar,
    ClipboardList,
    FileText,
    BookOpen,
    Stethoscope,
    Pill,
    TrendingUp,
    Settings,
    Award,
    CreditCard,
    Video,
    HeartPulse,
    Receipt,
    DollarSign,
    AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
    packages?: string[];
}

interface FeaturePackageModalProps {
    isOpen: boolean;
    onClose: () => void;
    users: User[];
}

// Package definitions
const PACKAGES = {
    normal: {
        name: "Normal",
        description: "Base features for all users",
        icon: Star,
        color: "from-slate-500 to-slate-600",
        borderColor: "border-slate-400",
        bgColor: "bg-slate-50 dark:bg-slate-800/50",
        included: true, // Always included
        features: [
            { name: "Dashboard", icon: LayoutDashboard },
            { name: "Patients", icon: Users },
            { name: "Calendar", icon: Calendar },
            { name: "Encounters", icon: ClipboardList },
            { name: "Templates", icon: FileText },
            { name: "References", icon: BookOpen },
            { name: "Geriatric Guide", icon: HeartPulse },
        ],
    },
    elite: {
        name: "Elite",
        description: "Premium clinical intelligence",
        icon: Crown,
        color: "from-purple-500 to-indigo-600",
        borderColor: "border-purple-400",
        bgColor: "bg-purple-50 dark:bg-purple-900/20",
        included: false,
        features: [
            { name: "Clinical AI", icon: Stethoscope },
            { name: "Treatment Plan", icon: ClipboardList },
            { name: "Analytics", icon: TrendingUp },
            { name: "Integration", icon: Settings },
            { name: "E-Prescribe", icon: Pill },
        ],
    },
    pro: {
        name: "Pro",
        description: "Practice operations tools",
        icon: Zap,
        color: "from-teal-500 to-emerald-600",
        borderColor: "border-teal-400",
        bgColor: "bg-teal-50 dark:bg-teal-900/20",
        included: false,
        features: [
            { name: "License Tracking", icon: Award },
            { name: "Billing", icon: CreditCard },
            { name: "Telehealth", icon: Video },
        ],
    },
    managed_billing: {
        name: "Managed Billing",
        description: "Full-service billing operations",
        icon: Receipt,
        color: "from-emerald-500 to-teal-600",
        borderColor: "border-emerald-400",
        bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
        included: false,
        features: [
            { name: "Claims Generation", icon: FileText },
            { name: "ERA Processing", icon: Receipt },
            { name: "Revenue Dashboard", icon: DollarSign },
            { name: "Denial Management", icon: AlertCircle },
        ],
    },
};

// Demo users for testing
const demoUsers: User[] = [
    { id: "demo-1", email: "demo.user1@clinic.example", first_name: "Demo", last_name: "User 1", role: "USER", packages: ["normal"] },
    { id: "demo-2", email: "mike.j@clinic.com", first_name: "Mike", last_name: "Johnson", role: "USER", packages: ["normal", "elite"] },
    { id: "demo-3", email: "emily.r@clinic.com", first_name: "Emily", last_name: "Rodriguez", role: "USER", packages: ["normal", "pro"] },
    { id: "demo-4", email: "james.w@clinic.com", first_name: "James", last_name: "Wilson", role: "USER", packages: ["normal", "elite", "pro"] },
];

export function FeaturePackageModal({ isOpen, onClose, users }: FeaturePackageModalProps) {
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const [selectedPackages, setSelectedPackages] = useState<string[]>(["normal"]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Use provided users or fallback to demo
    const displayUsers = users.length > 0 ? users : demoUsers;

    useEffect(() => {
        if (selectedUserId) {
            const user = displayUsers.find(u => u.id === selectedUserId);
            if (user?.packages) {
                setSelectedPackages(user.packages);
            } else {
                setSelectedPackages(["normal"]);
            }
        }
    }, [selectedUserId, displayUsers]);

    const handlePackageToggle = (packageKey: string) => {
        if (packageKey === "normal") return; // Normal is always included

        setSelectedPackages(prev => {
            if (prev.includes(packageKey)) {
                return prev.filter(p => p !== packageKey);
            }
            return [...prev, packageKey];
        });
    };

    const handleAssignAll = () => {
        setSelectedPackages(["normal", "elite", "pro", "managed_billing"]);
    };

    const handleResetToNormal = () => {
        setSelectedPackages(["normal"]);
    };

    const handleSave = async () => {
        if (!selectedUserId) return;

        setSaving(true);

        // Simulate saving - in production this would call the API
        await new Promise(resolve => setTimeout(resolve, 1000));

        // SEC-AUDIT-2026-04-10: Guard localStorage parsing. If another tab (or
        // an extension) has written garbage into this key, silently reset it
        // rather than throwing an uncaught SyntaxError from the save handler.
        let savedPackages: Record<string, string[]> = {};
        try {
            const raw = localStorage.getItem("cs_user_packages");
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                    savedPackages = parsed as Record<string, string[]>;
                }
            }
        } catch {
            savedPackages = {};
        }
        savedPackages[selectedUserId] = selectedPackages;
        localStorage.setItem("cs_user_packages", JSON.stringify(savedPackages));

        setSaving(false);
        setSaved(true);

        setTimeout(() => {
            setSaved(false);
            onClose();
        }, 1500);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-700">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            Assign Feature Package
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            Select a user and assign feature packages based on their subscription
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {/* User Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Select User
                        </label>
                        <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        >
                            <option value="">Choose a user...</option>
                            {displayUsers.map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.first_name && user.last_name
                                        ? `${user.first_name} ${user.last_name}`
                                        : user.email
                                    } ({user.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-3 mb-6">
                        <button
                            onClick={handleAssignAll}
                            disabled={selectedPackages.length === 4}
                            className={cn(
                                "px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                                selectedPackages.length === 4
                                    ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                                    : "bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 shadow-lg"
                            )}
                        >
                            <Crown className="h-4 w-4" />
                            Assign All Packages
                        </button>
                        <button
                            onClick={handleResetToNormal}
                            disabled={selectedPackages.length === 1}
                            className={cn(
                                "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                                selectedPackages.length === 1
                                    ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
                            )}
                        >
                            Reset to Normal Only
                        </button>
                    </div>

                    {/* Package Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {Object.entries(PACKAGES).map(([key, pkg]) => {
                            const isSelected = selectedPackages.includes(key);
                            const Icon = pkg.icon;

                            return (
                                <div
                                    key={key}
                                    onClick={() => handlePackageToggle(key)}
                                    className={cn(
                                        "relative rounded-2xl border-2 p-5 transition-all cursor-pointer",
                                        isSelected
                                            ? `${pkg.borderColor} ${pkg.bgColor} shadow-lg`
                                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
                                        key === "normal" && "cursor-default opacity-90"
                                    )}
                                >
                                    {/* Selection indicator */}
                                    {isSelected && (
                                        <div className={cn(
                                            "absolute top-3 right-3 h-6 w-6 rounded-full flex items-center justify-center",
                                            `bg-gradient-to-br ${pkg.color}`
                                        )}>
                                            <Check className="h-4 w-4 text-white" />
                                        </div>
                                    )}

                                    {/* Package Header */}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={cn(
                                            "h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br",
                                            pkg.color
                                        )}>
                                            <Icon className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white">
                                                {pkg.name}
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {pkg.description}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Features List */}
                                    <div className="space-y-2">
                                        {pkg.features.map((feature) => {
                                            const FeatureIcon = feature.icon;
                                            return (
                                                <div
                                                    key={feature.name}
                                                    className="flex items-center gap-2 text-sm"
                                                >
                                                    <FeatureIcon className={cn(
                                                        "h-4 w-4 shrink-0",
                                                        isSelected ? "text-slate-600 dark:text-slate-300" : "text-slate-400"
                                                    )} />
                                                    <span className={cn(
                                                        isSelected ? "text-slate-700 dark:text-slate-200" : "text-slate-500"
                                                    )}>
                                                        {feature.name}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Status Badge */}
                                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                        {key === "normal" ? (
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                Always Included
                                            </span>
                                        ) : (
                                            <button
                                                className={cn(
                                                    "w-full py-2 rounded-lg text-sm font-bold transition-all",
                                                    isSelected
                                                        ? `bg-gradient-to-r ${pkg.color} text-white`
                                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                )}
                                            >
                                                {isSelected ? "Selected" : "Click to Add"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Current Assignment Summary */}
                    {selectedUserId && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                Current Assignment:
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {selectedPackages.map(pkg => (
                                    <span
                                        key={pkg}
                                        className={cn(
                                            "px-3 py-1 rounded-lg text-sm font-bold text-white bg-gradient-to-r",
                                            PACKAGES[pkg as keyof typeof PACKAGES]?.color || "from-slate-400 to-slate-500"
                                        )}
                                    >
                                        {PACKAGES[pkg as keyof typeof PACKAGES]?.name || pkg}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!selectedUserId || saving}
                        className={cn(
                            "px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all flex items-center gap-2",
                            selectedUserId && !saving
                                ? "bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 shadow-lg"
                                : "bg-slate-300 dark:bg-slate-700 cursor-not-allowed"
                        )}
                    >
                        {saving ? (
                            <>
                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : saved ? (
                            <>
                                <Check className="h-4 w-4" />
                                Saved!
                            </>
                        ) : (
                            "Save Assignment"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
