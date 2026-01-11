"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    Percent,
    Building2,
    Save,
    RefreshCw,
} from "lucide-react";

interface Organization {
    id: string;
    name: string;
    platform_fee_percentage: number;
    fee_collection_method: string;
}

export default function FeesPage() {
    const supabase = createClient();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [defaultFee, setDefaultFee] = useState(1.0);
    const [defaultMethod, setDefaultMethod] = useState("DEDUCT");

    useEffect(() => {
        fetchOrganizations();
    }, []);

    const fetchOrganizations = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('organizations')
                .select('id, name, platform_fee_percentage, fee_collection_method')
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            setOrganizations(data || []);
        } catch (error) {
            console.error("Error fetching organizations:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateOrgFee = async (orgId: string, fee: number, method: string) => {
        try {
            const { error } = await supabase
                .from('organizations')
                .update({
                    platform_fee_percentage: fee,
                    fee_collection_method: method,
                })
                .eq('id', orgId);

            if (error) throw error;
            fetchOrganizations();
        } catch (error) {
            console.error("Error updating organization fee:", error);
            alert("Failed to update fee");
        }
    };

    const handleApplyDefaultToAll = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('organizations')
                .update({
                    platform_fee_percentage: defaultFee,
                    fee_collection_method: defaultMethod,
                })
                .eq('is_active', true);

            if (error) throw error;
            fetchOrganizations();
            alert("Default fee applied to all organizations");
        } catch (error) {
            console.error("Error applying default fee:", error);
            alert("Failed to apply default fee");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Platform Fees
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Configure platform fee percentages for organizations
                </p>
            </div>

            {/* Default Fee Section */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-8">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Percent className="h-5 w-5 text-purple-600" />
                    Default Platform Fee
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Fee Percentage
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="10"
                                value={defaultFee}
                                onChange={(e) => setDefaultFee(parseFloat(e.target.value))}
                                className="w-full px-4 py-2 pr-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Collection Method
                        </label>
                        <select
                            value={defaultMethod}
                            onChange={(e) => setDefaultMethod(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                            <option value="DEDUCT">Deduct from payment</option>
                            <option value="INVOICE">Invoice separately</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={handleApplyDefaultToAll}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                        >
                            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Apply to All Organizations
                        </button>
                    </div>
                </div>
            </div>

            {/* Per-Organization Overrides */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-blue-600" />
                        Per-Organization Fees
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Override the default fee for specific organizations
                    </p>
                </div>
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Organization</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Fee %</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Collection Method</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                    Loading...
                                </td>
                            </tr>
                        ) : organizations.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                    No organizations found
                                </td>
                            </tr>
                        ) : (
                            organizations.map((org) => (
                                <OrgFeeRow
                                    key={org.id}
                                    org={org}
                                    onSave={handleUpdateOrgFee}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function OrgFeeRow({ org, onSave }: { org: Organization; onSave: (id: string, fee: number, method: string) => void }) {
    const [fee, setFee] = useState(org.platform_fee_percentage);
    const [method, setMethod] = useState(org.fee_collection_method);
    const [changed, setChanged] = useState(false);

    const handleSave = () => {
        onSave(org.id, fee, method);
        setChanged(false);
    };

    return (
        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                {org.name}
            </td>
            <td className="px-6 py-4">
                <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={fee}
                    onChange={(e) => { setFee(parseFloat(e.target.value)); setChanged(true); }}
                    className="w-20 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
            </td>
            <td className="px-6 py-4">
                <select
                    value={method}
                    onChange={(e) => { setMethod(e.target.value); setChanged(true); }}
                    className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                >
                    <option value="DEDUCT">Deduct</option>
                    <option value="INVOICE">Invoice</option>
                </select>
            </td>
            <td className="px-6 py-4 text-right">
                {changed && (
                    <button
                        onClick={handleSave}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg font-medium transition-colors"
                    >
                        Save
                    </button>
                )}
            </td>
        </tr>
    );
}
