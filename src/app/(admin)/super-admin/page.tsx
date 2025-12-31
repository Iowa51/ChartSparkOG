"use client";

import {
    Building2,
    Users,
    FileText,
    DollarSign,
    TrendingUp,
    Activity,
    ArrowRight,
    AlertTriangle,
    ShieldAlert,
    Building,
    Plus,
    Search,
    X,
    MoreHorizontal,
    KeyRound,
    UserCircle,
    Download
} from "lucide-react";
import { platformBillingStats } from "@/lib/demo-data/billing";
import Link from "next/link";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useState } from "react";

// Local Component Definitions (simulating UI library for consistency)
const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}>{children}</div>
);
const CardHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`p-6 pb-2 ${className}`}>{children}</div>
);
const CardTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 className={`font-semibold leading-none tracking-tight text-slate-900 dark:text-white ${className}`}>{children}</h3>
);
const CardDescription = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <p className={`text-sm text-slate-500 dark:text-slate-400 mt-2 ${className}`}>{children}</p>
);
const CardContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`p-6 pt-0 ${className}`}>{children}</div>
);

// Mock Data for Organizations
const initialOrganizations = [
    {
        id: 1,
        name: "Mountain View Clinic",
        userCount: 24,
        tier: "Professional",
        customFee: 15,
        status: "active",
        revenue: 45600,
        joined: "2023-08-15"
    },
    {
        id: 2,
        name: "Coastal Mental Health",
        userCount: 18,
        tier: "Enterprise",
        customFee: 12,
        status: "active",
        revenue: 67800,
        joined: "2023-09-22"
    },
    {
        id: 3,
        name: "Valley Wellness Center",
        userCount: 32,
        tier: "Enterprise",
        customFee: 10,
        status: "active",
        revenue: 89400,
        joined: "2023-07-10"
    },
    {
        id: 4,
        name: "Riverside Behavioral Health",
        userCount: 15,
        tier: "Professional",
        customFee: 15,
        status: "active",
        revenue: 38200,
        joined: "2023-10-05"
    },
    {
        id: 5,
        name: "Summit Psychiatric Services",
        userCount: 28,
        tier: "Professional",
        customFee: 13,
        status: "active",
        revenue: 52900,
        joined: "2023-06-18"
    },
    {
        id: 6,
        name: "Harbor Health Associates",
        userCount: 12,
        tier: "Starter",
        customFee: 18,
        status: "active",
        revenue: 24300,
        joined: "2024-01-08"
    },
    {
        id: 7,
        name: "Meadow Springs Therapy",
        userCount: 8,
        tier: "Starter",
        customFee: 18,
        status: "inactive",
        revenue: 15600,
        joined: "2023-11-20"
    }
];

// Mock Data for Users
const initialUsers = [
    {
        id: 1,
        name: "Dr. Sarah Johnson",
        email: "sarah.johnson@mountainview.com",
        organization: "Mountain View Clinic",
        role: "ADMIN",
        customFee: null,
        status: "active",
        lastActive: "2024-01-15"
    },
    {
        id: 2,
        name: "Dr. Michael Chen",
        email: "m.chen@coastal.com",
        organization: "Coastal Mental Health",
        role: "USER",
        customFee: 10,
        status: "active",
        lastActive: "2024-01-14"
    },
    {
        id: 3,
        name: "Dr. Emily Rodriguez",
        email: "e.rodriguez@valley.com",
        organization: "Valley Wellness Center",
        role: "USER",
        customFee: null,
        status: "active",
        lastActive: "2024-01-15"
    },
    {
        id: 4,
        name: "Dr. James Wilson",
        email: "j.wilson@riverside.com",
        organization: "Riverside Behavioral Health",
        role: "ADMIN",
        customFee: null,
        status: "active",
        lastActive: "2024-01-13"
    },
    {
        id: 5,
        name: "Dr. Lisa Anderson",
        email: "l.anderson@summit.com",
        organization: "Summit Psychiatric Services",
        role: "USER",
        customFee: 12,
        status: "active",
        lastActive: "2024-01-15"
    },
    {
        id: 6,
        name: "Dr. Robert Taylor",
        email: "r.taylor@mountainview.com",
        organization: "Mountain View Clinic",
        role: "USER",
        customFee: null,
        status: "active",
        lastActive: "2024-01-12"
    },
    {
        id: 7,
        name: "Dr. Jennifer Lee",
        email: "j.lee@harbor.com",
        organization: "Harbor Health Associates",
        role: "ADMIN",
        customFee: null,
        status: "inactive",
        lastActive: "2023-12-20"
    }
];

// Mock Data for Revenue Dashboard
const revenueData = [
    { month: 'Jul', revenue: 380000, fees: 57000, orgs: 38 },
    { month: 'Aug', revenue: 410000, fees: 61500, orgs: 40 },
    { month: 'Sep', revenue: 435000, fees: 65250, orgs: 42 },
    { month: 'Oct', revenue: 455000, fees: 68250, orgs: 44 },
    { month: 'Nov', revenue: 470000, fees: 70500, orgs: 45 },
    { month: 'Dec', revenue: 487650, fees: 73147, orgs: 47 },
];

const orgRevenue = [
    { name: "Valley Wellness Center", revenue: 89400, fees: 8940 },
    { name: "Coastal Mental Health", revenue: 67800, fees: 8136 },
    { name: "Summit Psychiatric Services", revenue: 52900, fees: 6877 },
    { name: "Mountain View Clinic", revenue: 45600, fees: 6840 },
    { name: "Riverside Behavioral Health", revenue: 38200, fees: 5730 },
];

const topUsers = [
    { name: "Dr. Emily Rodriguez", org: "Valley Wellness", revenue: 28400 },
    { name: "Dr. Michael Chen", org: "Coastal Mental Health", revenue: 24600 },
    { name: "Dr. Sarah Johnson", org: "Mountain View", revenue: 22100 },
    { name: "Dr. Lisa Anderson", org: "Summit Psychiatric", revenue: 19800 },
    { name: "Dr. James Wilson", org: "Riverside Behavioral", revenue: 18500 },
];

const platformStats = {
    totalOrgs: 47,
    totalUsers: 1243,
    totalRevenue: 487650,
    platformFees: 73147,
    trends: {
        orgs: [38, 40, 42, 44, 45, 47].map((value, index) => ({ value, index })),
        users: [980, 1050, 1120, 1180, 1220, 1243].map((value, index) => ({ value, index })),
        revenue: [380000, 410000, 435000, 455000, 470000, 487650].map((value, index) => ({ value, index })),
        fees: [57000, 61500, 65250, 68250, 70500, 73147].map((value, index) => ({ value, index }))
    }
};

export default function SuperAdminDashboardPage() {
    const [organizations, setOrganizations] = useState(initialOrganizations);
    const [showCreateOrg, setShowCreateOrg] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const [users, setUsers] = useState(initialUsers);
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [userSearchTerm, setUserSearchTerm] = useState("");

    const filteredOrgs = organizations.filter(org =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
    );

    const toggleStatus = (id: number) => {
        setOrganizations(prev => prev.map(org => {
            if (org.id === id) {
                return { ...org, status: org.status === "active" ? "inactive" : "active" };
            }
            return org;
        }));
    };

    const toggleUserStatus = (id: number) => {
        setUsers(prev => prev.map(user => {
            if (user.id === id) {
                return { ...user, status: user.status === "active" ? "inactive" : "active" };
            }
            return user;
        }));
    };

    const exportRevenue = () => {
        const csv = [
            ["Organization", "Revenue", "Platform Fees"].join(","),
            ...orgRevenue.map(org => [org.name, org.revenue, org.fees].join(","))
        ].join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `revenue_report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <ShieldAlert className="h-7 w-7 text-primary" />
                        SUPER ADMIN CONSOLE
                    </h1>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-[0.2em] opacity-70">
                        Platform Governance & Revenue Control
                    </p>
                    <div className="absolute top-4 right-6">
                        <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-2">
                            <ShieldAlert className="h-3 w-3" />
                            Super Admin Access
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50 dark:bg-slate-950/50">
                <div className="max-w-7xl mx-auto space-y-8">

                    {/* Platform Overview Cards with Sparklines */}
                    <div id="overview" className="grid gap-4 md:grid-cols-4 scroll-mt-24">
                        {/* Total Organizations */}
                        <Card className="hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Total Organizations</CardTitle>
                                <Building className="h-4 w-4 text-slate-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{platformStats.totalOrgs}</div>
                                <div className="h-[40px] mt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={platformStats.trends.orgs}>
                                            <Line
                                                type="monotone"
                                                dataKey="value"
                                                stroke="#8884d8"
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-medium">
                                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                                    +9 from last period
                                </p>
                            </CardContent>
                        </Card>

                        {/* Total Users */}
                        <Card className="hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                                <Users className="h-4 w-4 text-slate-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{platformStats.totalUsers.toLocaleString()}</div>
                                <div className="h-[40px] mt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={platformStats.trends.users}>
                                            <Line
                                                type="monotone"
                                                dataKey="value"
                                                stroke="#82ca9d"
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-medium">
                                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                                    +263 from last period
                                </p>
                            </CardContent>
                        </Card>

                        {/* Total Revenue */}
                        <Card className="hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                                <DollarSign className="h-4 w-4 text-slate-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">${(platformStats.totalRevenue / 1000).toFixed(0)}K</div>
                                <div className="h-[40px] mt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={platformStats.trends.revenue}>
                                            <Line
                                                type="monotone"
                                                dataKey="value"
                                                stroke="#ffc658"
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-medium">
                                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                                    +12.3% from last period
                                </p>
                            </CardContent>
                        </Card>

                        {/* Platform Fees */}
                        <Card className="hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Platform Fees</CardTitle>
                                <DollarSign className="h-4 w-4 text-slate-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">${(platformStats.platformFees / 1000).toFixed(0)}K</div>
                                <div className="h-[40px] mt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={platformStats.trends.fees}>
                                            <Line
                                                type="monotone"
                                                dataKey="value"
                                                stroke="#ff7c7c"
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-medium">
                                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                                    15% fee rate
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Organization Management Section */}
                    <Card id="organizations" className="mt-6 border-slate-200 dark:border-slate-800 scroll-mt-24">
                        <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Organization Management</CardTitle>
                                    <CardDescription>Manage all clinical tenants and organizations on the platform.</CardDescription>
                                </div>
                                <button
                                    onClick={() => setShowCreateOrg(true)}
                                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Organization
                                </button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-6 mt-6">
                                <div className="relative max-w-sm">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        placeholder="Search organizations..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9 pr-4 py-2 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-4">Organization</th>
                                            <th className="px-6 py-4">Users</th>
                                            <th className="px-6 py-4">Tier</th>
                                            <th className="px-6 py-4">Fee %</th>
                                            <th className="px-6 py-4">Revenue</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                                        {filteredOrgs.map(org => (
                                            <tr key={org.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white">{org.name}</p>
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            Joined {new Date(org.joined).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-400">{org.userCount}</td>
                                                <td className="px-6 py-4">
                                                    <select
                                                        defaultValue={org.tier.toLowerCase()}
                                                        className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                                    >
                                                        <option value="starter">Starter</option>
                                                        <option value="professional">Professional</option>
                                                        <option value="enterprise">Enterprise</option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="relative max-w-[80px]">
                                                        <input
                                                            type="number"
                                                            defaultValue={org.customFee}
                                                            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-2 py-1 text-xs font-bold text-right outline-none focus:ring-2 focus:ring-purple-500/20"
                                                            min="0"
                                                            max="100"
                                                        />
                                                        <span className="absolute right-7 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">%</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">${org.revenue.toLocaleString()}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${org.status === "active"
                                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400"
                                                        : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                                                        }`}>
                                                        {org.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-primary transition-all">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => toggleStatus(org.id)}
                                                            className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${org.status === "active"
                                                                ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
                                                                : "border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                                                                }`}
                                                        >
                                                            {org.status === "active" ? "Deactivate" : "Activate"}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* User Management Section */}
                    <Card id="users" className="mt-6 border-slate-200 dark:border-slate-800 scroll-mt-24">
                        <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>User Management</CardTitle>
                                    <CardDescription>Manage all users across all organizations</CardDescription>
                                </div>
                                <button
                                    onClick={() => setShowCreateUser(true)}
                                    className="flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create User
                                </button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-6 mt-6">
                                <div className="relative max-w-sm">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        placeholder="Search users by name or email..."
                                        value={userSearchTerm}
                                        onChange={(e) => setUserSearchTerm(e.target.value)}
                                        className="pl-9 pr-4 py-2 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-4">User</th>
                                            <th className="px-6 py-4">Organization</th>
                                            <th className="px-6 py-4">Role</th>
                                            <th className="px-6 py-4">Custom Fee</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Last Active</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                                        {filteredUsers.map(user => (
                                            <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                                                            <UserCircle className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 dark:text-white">{user.name}</p>
                                                            <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                                                    {user.organization}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <select
                                                        defaultValue={user.role}
                                                        className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                                    >
                                                        <option value="USER">User</option>
                                                        <option value="ADMIN">Admin</option>
                                                        <option value="SUPER_ADMIN">Super Admin</option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {user.customFee ? (
                                                        <div className="relative max-w-[80px]">
                                                            <input
                                                                type="number"
                                                                defaultValue={user.customFee}
                                                                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-2 py-1 text-xs font-bold text-right outline-none focus:ring-2 focus:ring-purple-500/20"
                                                                min="0"
                                                                max="100"
                                                            />
                                                            <span className="absolute right-7 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">%</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">Org default</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${user.status === "active"
                                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400"
                                                        : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                                                        }`}>
                                                        {user.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-500 font-medium whitespace-nowrap">
                                                    {new Date(user.lastActive).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-500 transition-all"
                                                            onClick={() => alert("Password reset link sent to " + user.email)}
                                                            title="Reset Password"
                                                        >
                                                            <KeyRound className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => toggleUserStatus(user.id)}
                                                            className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${user.status === "active"
                                                                ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
                                                                : "border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                                                                }`}
                                                        >
                                                            {user.status === "active" ? "Deactivate" : "Activate"}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Revenue Analytics Section */}
                    <Card id="revenue" className="mt-6 border-slate-200 dark:border-slate-800 scroll-mt-24">
                        <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Revenue Analytics</CardTitle>
                                    <CardDescription>Platform revenue and fee collection insights</CardDescription>
                                </div>
                                <button
                                    className="flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
                                    onClick={exportRevenue}
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Export Report
                                </button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-8 mt-6">
                                {/* Revenue Chart */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wider">Revenue Trend (Last 6 Months)</h3>
                                    <div className="h-[300px] w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={revenueData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis
                                                    dataKey="month"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                                    dy={10}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                                    tickFormatter={(value) => `$${value / 1000}k`}
                                                />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]}
                                                />
                                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                                <Line
                                                    type="monotone"
                                                    dataKey="revenue"
                                                    stroke="#8884d8"
                                                    strokeWidth={3}
                                                    name="Total Revenue"
                                                    activeDot={{ r: 8 }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="fees"
                                                    stroke="#82ca9d"
                                                    strokeWidth={3}
                                                    name="Platform Fees"
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-8">
                                    {/* Revenue by Organization */}
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wider">Top Organizations by Revenue</h3>
                                        <div className="space-y-3">
                                            {orgRevenue.map((org, index) => (
                                                <div key={index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                                    <div className="flex-1">
                                                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{org.name}</p>
                                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                                                            Fees Yield: ${org.fees.toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-black text-slate-900 dark:text-white">${org.revenue.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Top Users by Revenue */}
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wider">Top Users by Revenue</h3>
                                        <div className="space-y-3">
                                            {topUsers.map((user, index) => (
                                                <div key={index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                                                                {index + 1}
                                                            </div>
                                                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{user.name}</p>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-1 ml-8">{user.org}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-black text-slate-900 dark:text-white">${user.revenue.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>


                    {/* Create Organization Modal Overlay */}
                    {showCreateOrg && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCreateOrg(false)} />
                            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create New Organization</h3>
                                    <button onClick={() => setShowCreateOrg(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                                        <X className="h-4 w-4 text-slate-500" />
                                    </button>
                                </div>
                                <form className="p-6 space-y-4" onSubmit={(e) => {
                                    e.preventDefault();
                                    alert("Organization created successfully! Provisioning resources...");
                                    setShowCreateOrg(false);
                                }}>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Organization Name</label>
                                        <input className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium" placeholder="e.g. Acme Mental Health" required />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Subscription Tier</label>
                                            <select className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium appearance-none">
                                                <option value="starter">Starter ($99/mo)</option>
                                                <option value="professional">Professional ($299/mo)</option>
                                                <option value="enterprise">Enterprise ($799/mo)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Custom Fee %</label>
                                            <input type="number" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium" placeholder="15" min="0" max="100" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Admin Email</label>
                                        <input type="email" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium" placeholder="admin@organization.com" required />
                                    </div>

                                    <div className="pt-4 flex items-center justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateOrg(false)}
                                            className="px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-6 py-2 rounded-lg bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                                        >
                                            Create Organization
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Create User Modal Overlay */}
                    {showCreateUser && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCreateUser(false)} />
                            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create New User</h3>
                                    <button onClick={() => setShowCreateUser(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                                        <X className="h-4 w-4 text-slate-500" />
                                    </button>
                                </div>
                                <form className="p-6 space-y-4" onSubmit={(e) => {
                                    e.preventDefault();
                                    alert("User created successfully!");
                                    setShowCreateUser(false);
                                }}>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                                        <input className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium" placeholder="Dr. John Doe" required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
                                        <input type="email" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium" placeholder="john.doe@example.com" required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Organization</label>
                                        <select className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium appearance-none">
                                            <option value="">Assign to organization</option>
                                            {organizations.map(org => (
                                                <option key={org.id} value={org.id}>{org.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
                                            <select className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium appearance-none">
                                                <option value="USER">User</option>
                                                <option value="ADMIN">Admin</option>
                                                <option value="SUPER_ADMIN">Super Admin</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Custom Fee % (Opt)</label>
                                            <input type="number" className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium" placeholder="Default" min="0" max="100" />
                                        </div>
                                    </div>

                                    <div className="pt-4 flex items-center justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateUser(false)}
                                            className="px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-6 py-2 rounded-lg bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                                        >
                                            Create User
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
