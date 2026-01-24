/**
 * Fee Schedule Management Page
 * Allows admins to manage CPT fee schedules for billing
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    Plus,
    Edit2,
    Trash2,
    Save,
    X,
    DollarSign,
    FileSpreadsheet,
    Search,
    Building2
} from 'lucide-react';

interface FeeScheduleItem {
    id: string;
    cptCode: string;
    description: string;
    allowedAmount: number;
}

interface FeeSchedule {
    id: string;
    name: string;
    payerName: string | null;
    isDefault: boolean;
    effectiveDate: string;
    items: FeeScheduleItem[];
}

// Demo data
const demoSchedules: FeeSchedule[] = [
    {
        id: '1',
        name: 'Default Medicare Rates',
        payerName: null,
        isDefault: true,
        effectiveDate: '2026-01-01',
        items: [
            { id: '1', cptCode: '99213', description: 'Office Visit - Est, Low-Mod', allowedAmount: 9500 },
            { id: '2', cptCode: '99214', description: 'Office Visit - Est, Moderate', allowedAmount: 13500 },
            { id: '3', cptCode: '99215', description: 'Office Visit - Est, High', allowedAmount: 18500 },
            { id: '4', cptCode: '90834', description: 'Psychotherapy 45 min', allowedAmount: 9500 },
            { id: '5', cptCode: '90837', description: 'Psychotherapy 60 min', allowedAmount: 13000 },
        ],
    },
    {
        id: '2',
        name: 'BlueCross BlueShield',
        payerName: 'BCBS',
        isDefault: false,
        effectiveDate: '2026-01-01',
        items: [
            { id: '6', cptCode: '99213', description: 'Office Visit - Est, Low-Mod', allowedAmount: 10200 },
            { id: '7', cptCode: '99214', description: 'Office Visit - Est, Moderate', allowedAmount: 14800 },
            { id: '8', cptCode: '90834', description: 'Psychotherapy 45 min', allowedAmount: 10500 },
        ],
    },
];

export default function FeeSchedulesPage() {
    const [schedules, setSchedules] = useState<FeeSchedule[]>(demoSchedules);
    const [selectedSchedule, setSelectedSchedule] = useState<FeeSchedule | null>(demoSchedules[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingItem, setEditingItem] = useState<string | null>(null);
    const [newItem, setNewItem] = useState<Partial<FeeScheduleItem> | null>(null);
    const [showNewSchedule, setShowNewSchedule] = useState(false);

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(cents / 100);
    };

    const filteredItems = selectedSchedule?.items.filter(item =>
        item.cptCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const handleSaveItem = (item: FeeScheduleItem) => {
        if (!selectedSchedule) return;

        setSchedules(prev => prev.map(schedule => {
            if (schedule.id !== selectedSchedule.id) return schedule;
            return {
                ...schedule,
                items: schedule.items.map(i => i.id === item.id ? item : i),
            };
        }));
        setSelectedSchedule(prev => prev ? {
            ...prev,
            items: prev.items.map(i => i.id === item.id ? item : i),
        } : null);
        setEditingItem(null);
    };

    const handleAddItem = () => {
        if (!selectedSchedule || !newItem?.cptCode || !newItem?.description) return;

        const item: FeeScheduleItem = {
            id: Date.now().toString(),
            cptCode: newItem.cptCode,
            description: newItem.description,
            allowedAmount: newItem.allowedAmount || 0,
        };

        setSchedules(prev => prev.map(schedule => {
            if (schedule.id !== selectedSchedule.id) return schedule;
            return {
                ...schedule,
                items: [...schedule.items, item],
            };
        }));
        setSelectedSchedule(prev => prev ? {
            ...prev,
            items: [...prev.items, item],
        } : null);
        setNewItem(null);
    };

    const handleDeleteItem = (itemId: string) => {
        if (!selectedSchedule) return;

        setSchedules(prev => prev.map(schedule => {
            if (schedule.id !== selectedSchedule.id) return schedule;
            return {
                ...schedule,
                items: schedule.items.filter(i => i.id !== itemId),
            };
        }));
        setSelectedSchedule(prev => prev ? {
            ...prev,
            items: prev.items.filter(i => i.id !== itemId),
        } : null);
    };

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

            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid lg:grid-cols-4 gap-6">
                    {/* Schedule List */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between">
                                    <h2 className="font-semibold text-slate-900 dark:text-white">
                                        Schedules
                                    </h2>
                                    <button
                                        onClick={() => setShowNewSchedule(true)}
                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                    >
                                        <Plus className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                                    </button>
                                </div>
                            </div>
                            <div className="divide-y divide-slate-200 dark:divide-slate-700">
                                {schedules.map(schedule => (
                                    <button
                                        key={schedule.id}
                                        onClick={() => setSelectedSchedule(schedule)}
                                        className={`w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${selectedSchedule?.id === schedule.id
                                                ? 'bg-teal-50 dark:bg-teal-900/20 border-l-4 border-teal-500'
                                                : ''
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                                {schedule.payerName ? (
                                                    <Building2 className="h-4 w-4 text-blue-600" />
                                                ) : (
                                                    <FileSpreadsheet className="h-4 w-4 text-teal-600" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900 dark:text-white text-sm">
                                                    {schedule.name}
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                                    {schedule.items.length} codes
                                                </div>
                                                {schedule.isDefault && (
                                                    <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
                                                        Default
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Fee Schedule Items */}
                    <div className="lg:col-span-3">
                        {selectedSchedule ? (
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                                {/* Schedule Header */}
                                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                                {selectedSchedule.name}
                                            </h2>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                Effective: {new Date(selectedSchedule.effectiveDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setNewItem({})}
                                            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Add Code
                                        </button>
                                    </div>

                                    {/* Search */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search codes..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                                        />
                                    </div>
                                </div>

                                {/* Items Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 dark:bg-slate-800">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                    CPT Code
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                    Description
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                    Allowed Amount
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {/* New Item Row */}
                                            {newItem && (
                                                <tr className="bg-teal-50 dark:bg-teal-900/20">
                                                    <td className="px-6 py-3">
                                                        <input
                                                            type="text"
                                                            placeholder="99213"
                                                            value={newItem.cptCode || ''}
                                                            onChange={(e) => setNewItem({ ...newItem, cptCode: e.target.value })}
                                                            className="w-24 px-2 py-1 border rounded text-sm"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <input
                                                            type="text"
                                                            placeholder="Description"
                                                            value={newItem.description || ''}
                                                            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                                            className="w-full px-2 py-1 border rounded text-sm"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <div className="relative">
                                                            <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-slate-400" />
                                                            <input
                                                                type="number"
                                                                placeholder="95.00"
                                                                value={(newItem.allowedAmount || 0) / 100}
                                                                onChange={(e) => setNewItem({ ...newItem, allowedAmount: Math.round(parseFloat(e.target.value) * 100) })}
                                                                className="w-24 pl-6 pr-2 py-1 border rounded text-sm"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={handleAddItem}
                                                                className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded"
                                                            >
                                                                <Save className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setNewItem(null)}
                                                                className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}

                                            {/* Existing Items */}
                                            {filteredItems.map((item) => (
                                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="font-mono font-medium text-slate-900 dark:text-white">
                                                            {item.cptCode}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                                        {item.description}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {editingItem === item.id ? (
                                                            <div className="relative w-24">
                                                                <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-slate-400" />
                                                                <input
                                                                    type="number"
                                                                    defaultValue={item.allowedAmount / 100}
                                                                    onBlur={(e) => handleSaveItem({
                                                                        ...item,
                                                                        allowedAmount: Math.round(parseFloat(e.target.value) * 100),
                                                                    })}
                                                                    className="w-full pl-6 pr-2 py-1 border rounded text-sm"
                                                                    autoFocus
                                                                />
                                                            </div>
                                                        ) : (
                                                            <span className="font-medium text-slate-900 dark:text-white">
                                                                {formatCurrency(item.allowedAmount)}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button
                                                                onClick={() => setEditingItem(item.id)}
                                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteItem(item.id)}
                                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
                                <FileSpreadsheet className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                                <p className="text-slate-500 dark:text-slate-400">
                                    Select a fee schedule to view and edit codes
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
