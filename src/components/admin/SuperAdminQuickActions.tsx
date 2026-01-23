"use client";

import { useState } from "react";
import { Plus, UserCheck, TrendingUp, Zap } from "lucide-react";
import Link from "next/link";
import { FeaturePackageModal } from "./FeaturePackageModal";

interface User {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
    packages?: string[];
}

interface SuperAdminQuickActionsProps {
    users?: User[];
}

export function SuperAdminQuickActions({ users = [] }: SuperAdminQuickActionsProps) {
    const [showFeatureModal, setShowFeatureModal] = useState(false);

    return (
        <>
            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
                <Link
                    href="/super-admin/organizations?action=create"
                    className="flex items-center gap-3 p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors shadow-lg shadow-purple-500/20"
                >
                    <Plus className="h-5 w-5" />
                    <span className="font-bold">Create Organization</span>
                </Link>
                <Link
                    href="/super-admin/users?action=create"
                    className="flex items-center gap-3 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-lg shadow-blue-500/20"
                >
                    <Plus className="h-5 w-5" />
                    <span className="font-bold">Create User</span>
                </Link>
                <Link
                    href="/super-admin/auditors"
                    className="flex items-center gap-3 p-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors shadow-lg shadow-amber-500/20"
                >
                    <UserCheck className="h-5 w-5" />
                    <span className="font-bold">Assign Auditor</span>
                </Link>
                <button
                    onClick={() => setShowFeatureModal(true)}
                    className="flex items-center gap-3 p-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl transition-all shadow-lg shadow-teal-500/20"
                >
                    <Zap className="h-5 w-5" />
                    <span className="font-bold">Assign Features</span>
                </button>
            </div>

            {/* Feature Package Modal */}
            <FeaturePackageModal
                isOpen={showFeatureModal}
                onClose={() => setShowFeatureModal(false)}
                users={users}
            />
        </>
    );
}
