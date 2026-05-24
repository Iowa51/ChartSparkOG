# ChartSparkOG — Tebra Redesign Phase 1 Audit

Read-only audit of the current state of the codebase prior to the Tebra-inspired
redesign. No files were modified, no builds were run, no packages installed.

---

## Section 1 — Design Token State

### 1.1 `src/app/globals.css` (full contents)

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

/* ChartSpark Design System - Teal Theme */
@theme inline {
  /* Core colors */
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-surface: var(--surface);
  --color-surface-foreground: var(--surface-foreground);
  
  /* Semantic colors */
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  
  /* UI components */
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  
  /* Sidebar */
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  
  /* Charts */
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  
  /* Typography */
  --font-sans: var(--font-display);
  --font-mono: var(--font-mono);
  
  /* Border radius */
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) + 8px);
}

:root {
  /* ChartSpark Teal Design System */
  --radius: 0.5rem;
  
  /* Primary: Teal #0d968b */
  --primary: #0d968b;
  --primary-foreground: #ffffff;
  
  /* Backgrounds */
  --background: #f6f8f8;
  --foreground: #111817;
  
  /* Surface (cards, panels) */
  --surface: #ffffff;
  --surface-foreground: #111817;
  
  /* Card */
  --card: #ffffff;
  --card-foreground: #111817;
  
  /* Popover */
  --popover: #ffffff;
  --popover-foreground: #111817;
  
  /* Secondary */
  --secondary: #f0f4f4;
  --secondary-foreground: #618986;
  
  /* Muted */
  --muted: #f0f4f4;
  --muted-foreground: #618986;
  
  /* Accent */
  --accent: rgba(13, 150, 139, 0.1);
  --accent-foreground: #0d968b;
  
  /* Destructive */
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  
  /* Border & Input */
  --border: #e5e7eb;
  --input: #e5e7eb;
  --ring: #0d968b;
  
  /* Sidebar */
  --sidebar: #ffffff;
  --sidebar-foreground: #111817;
  --sidebar-primary: #0d968b;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: rgba(13, 150, 139, 0.1);
  --sidebar-accent-foreground: #0d968b;
  --sidebar-border: #e5e7eb;
  --sidebar-ring: #0d968b;
  
  /* Charts */
  --chart-1: #0d968b;
  --chart-2: #06b6d4;
  --chart-3: #8b5cf6;
  --chart-4: #f59e0b;
  --chart-5: #ef4444;
}

.dark {
  /* Dark mode adjustments */
  --background: #102220;
  --foreground: #f1f5f9;
  
  --surface: #1c2e2c;
  --surface-foreground: #f1f5f9;
  
  --card: #1c2e2c;
  --card-foreground: #f1f5f9;
  
  --popover: #1c2e2c;
  --popover-foreground: #f1f5f9;
  
  --secondary: #233d3a;
  --secondary-foreground: #94a3b8;
  
  --muted: #233d3a;
  --muted-foreground: #94a3b8;
  
  --accent: rgba(13, 150, 139, 0.2);
  --accent-foreground: #14b8a6;
  
  --border: #2d4a47;
  --input: #2d4a47;
  
  --sidebar: #1c2e2c;
  --sidebar-foreground: #f1f5f9;
  --sidebar-border: #2d4a47;
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground font-sans antialiased;
  }
}

/* Custom scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 20px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #374151;
}
```

### 1.2 Other CSS files defining custom properties

Only one project CSS file declares CSS custom properties (--*):

| File | Variables defined |
|---|---|
| `src/app/globals.css` | `--radius`, `--primary`, `--primary-foreground`, `--background`, `--foreground`, `--surface`, `--surface-foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--destructive-foreground`, `--border`, `--input`, `--ring`, `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring`, `--chart-1` … `--chart-5`, plus the `--color-*`, `--font-*`, `--radius-*` aliases inside `@theme inline`. The `--font-display` variable is injected at runtime by `next/font` (Plus Jakarta Sans) from `src/app/layout.tsx`. |

No other `.css` file under `src/` defines custom properties. The only other CSS files in the repo live in `node_modules/`, `coverage/`, and `.next/`.

### 1.3 Tailwind config

There is **no** `tailwind.config.{js,ts,mjs}` file in the project. Tailwind v4 is in use and all theming is done inline via the `@theme inline { ... }` block in `src/app/globals.css`.

PostCSS is configured at `postcss.config.mjs`:

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

### 1.4 Theme files

Searched for:

- `src/styles/` — does not exist
- `src/theme/` — does not exist
- `theme.ts`, `theme.tsx`, `theme.js` — none found
- `tokens.ts`, `tokens.tsx`, `tokens.js` — none found
- `design-system.css` — does not exist

**All design tokens live in a single file: `src/app/globals.css`.**

---

## Section 2 — Layout Shell

### 2.1 `src/app/layout.tsx` (full contents)

```tsx
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "@/lib/env";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "ChartSpark - Clinical Documentation for Nurse Practitioners",
  description: "AI-powered clinical documentation and billing advisor for Nurse Practitioners",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${plusJakartaSans.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

### 2.2 Nested layout files

Found 6 nested layouts under `src/app/`:

#### `src/app/(app)/layout.tsx`

```tsx
import { Sidebar } from "@/components/layout";
import { DemoAuthGuard } from "@/components/auth/DemoAuthGuard";
import { MFAGate } from "@/components/auth/MFAGate";
import { SessionTimeout } from "@/components/SessionTimeout";
import { TrialBanner } from "@/components/subscriptions/trial-banner";
import { ReadOnlyBanner } from "@/components/subscriptions/read-only-banner";
import { PilotReadOnlyBanner } from "@/components/pilot/pilot-readonly-banner-server";
import { ToastProvider } from "@/components/ui/toast";

// Force dynamic rendering - app pages require authentication at runtime
export const dynamic = 'force-dynamic';

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Phase 2: Session timeout always enabled for HIPAA compliance
    const enableTimeout = true;

    return (
        <ToastProvider>
            <DemoAuthGuard>
                <PilotReadOnlyBanner />
                <TrialBanner />
                <ReadOnlyBanner />
                <div className="min-h-screen flex bg-background">
                    <Sidebar />
                    <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
                        {children}
                    </main>
                </div>
                <SessionTimeout enabled={enableTimeout} />
                <MFAGate />
            </DemoAuthGuard>
        </ToastProvider>
    );
}
```

#### `src/app/(admin)/layout.tsx`

```tsx
import { DemoAuthGuard } from "@/components/auth/DemoAuthGuard";
import { SessionTimeout } from "@/components/SessionTimeout";

// Force dynamic rendering - admin pages require authentication at runtime
export const dynamic = 'force-dynamic';

/**
 * Parent layout for admin route group.
 * Note: Individual child layouts (admin/layout.tsx, super-admin/layout.tsx)
 * provide their own context-specific sidebars. This parent layout only
 * provides the DemoAuthGuard wrapper to avoid duplicated sidebars.
 */
export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Phase 2: Session timeout always enabled for HIPAA compliance
    const enableTimeout = true;

    return (
        <DemoAuthGuard>
            {children}
            <SessionTimeout enabled={enableTimeout} />
        </DemoAuthGuard>
    );
}
```

#### `src/app/(admin)/admin/layout.tsx`

```tsx
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { redirect } from "next/navigation";
import Link from "next/link";

// Force dynamic rendering - admin pages need authentication at runtime
export const dynamic = 'force-dynamic';
import {
    LayoutDashboard,
    Users,
    FileText,
    Zap,
    MessageSquare,
    Settings,
    LogOut,
    User,
    ChevronLeft,
    Building2,
} from "lucide-react";

const adminNavItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Submissions", href: "/admin/submissions", icon: FileText },
    { label: "Features", href: "/admin/features", icon: Zap },
    { label: "Auditor Notes", href: "/admin/auditor-notes", icon: MessageSquare },
    { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    let user = null;
    let profile = null;
    let organization = null;

    if (supabase) {
        try {
            const { data } = await supabase.auth.getUser();
            user = data.user;

            if (user) {
                const { data: profileData } = await supabase
                    .from("users")
                    .select("role, first_name, last_name, organization_id")
                    .eq("id", user.id)
                    .single();
                profile = profileData;

                // Get organization info
                if (profileData?.organization_id) {
                    const { data: orgData } = await supabase
                        .from("organizations")
                        .select("id, name, subscription_tier")
                        .eq("id", profileData.organization_id)
                        .single();
                    organization = orgData;
                }
            }
        } catch (e) {
            console.error("Supabase error in AdminLayout:", e);
        }
    }

    // Authorization check - ADMIN and SUPER_ADMIN can access
    if (profile && profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN') {
        if (profile.role === 'AUDITOR') {
            redirect('/auditor');
        } else {
            redirect('/dashboard');
        }
    }

    // If no user at all, redirect to login
    if (!user) {
        redirect('/login');
    }

    const displayName = profile?.first_name
        ? `${profile.first_name} ${profile.last_name || ''}`.trim()
        : user?.email || 'Admin';

    return (
        <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
            {/* Sidebar */}
            <AdminSidebar role="ADMIN" context="admin" />

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {children}
            </main>
        </div>
    );
}
```

Note: this file declares a local `adminNavItems` array that is **not actually rendered** — the real admin nav list lives inside `AdminSidebar.tsx`. The local array is dead code.

#### `src/app/(admin)/super-admin/layout.tsx`

```tsx
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { redirect } from "next/navigation";
import Link from "next/link";

// Force dynamic rendering - super-admin pages need authentication at runtime
export const dynamic = 'force-dynamic';
import {
    LayoutDashboard,
    Building2,
    Users,
    UserCheck,
    DollarSign,
    Percent,
    ClipboardList,
    Settings,
    LogOut,
    User,
    ChevronLeft,
} from "lucide-react";

const superAdminNavItems = [
    { label: "Dashboard", href: "/super-admin", icon: LayoutDashboard },
    { label: "Organizations", href: "/super-admin/organizations", icon: Building2 },
    { label: "Users", href: "/super-admin/users", icon: Users },
    { label: "Auditors", href: "/super-admin/auditors", icon: UserCheck },
    { label: "Financials", href: "/super-admin/financials", icon: DollarSign },
    { label: "Platform Fees", href: "/super-admin/fees", icon: Percent },
    { label: "Audit Logs", href: "/super-admin/audit-logs", icon: ClipboardList },
    { label: "Settings", href: "/super-admin/settings", icon: Settings },
];

export default async function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    let user = null;
    let profile = null;

    if (supabase) {
        try {
            const { data } = await supabase.auth.getUser();
            user = data.user;

            if (user) {
                const { data: profileData } = await supabase
                    .from("users")
                    .select("role, first_name, last_name")
                    .eq("id", user.id)
                    .single();
                profile = profileData;
            }
        } catch (e) {
            console.error("Supabase error in SuperAdminLayout:", e);
        }
    }

    // Authorization check - only SUPER_ADMIN can access
    if (profile && profile.role !== 'SUPER_ADMIN') {
        if (profile.role === 'ADMIN') {
            redirect('/admin');
        } else if (profile.role === 'AUDITOR') {
            redirect('/auditor');
        } else {
            redirect('/dashboard');
        }
    }

    // If no user at all, redirect to login
    if (!user) {
        redirect('/login');
    }

    const displayName = profile?.first_name
        ? `${profile.first_name} ${profile.last_name || ''}`.trim()
        : user?.email || 'Super Admin';

    return (
        <div className="flex min-h-screen bg-slate-950">
            {/* Sidebar */}
            <AdminSidebar role="SUPER_ADMIN" context="super-admin" />

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
                {children}
            </main>
        </div>
    );
}
```

Same dead-code observation: the local `superAdminNavItems` array is unused. `AdminSidebar` carries its own copy.

#### `src/app/auditor/layout.tsx`

```tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

// Force dynamic rendering - auditor pages need authentication at runtime
export const dynamic = 'force-dynamic';
import {
    LayoutDashboard,
    FileText,
    ClipboardCheck,
    BarChart3,
    Flag,
    Settings,
    User,
    Building2,
    PieChart,
    ShieldAlert,
    Database,
    Fingerprint,
    Layers,
    SearchCode,
    Activity,
} from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";

const auditorNavItems = [
    { label: "General Dashboard", href: "/auditor", icon: LayoutDashboard },
    { label: "Submissions Queue", href: "/auditor/submissions", icon: ClipboardCheck },
    { label: "Notes Review", href: "/auditor/notes", icon: FileText },
    { label: "My Flags", href: "/auditor/flags", icon: Flag },
];

const financialNavItems = [
    { label: "Audit Overview", href: "/auditor/billing", icon: BarChart3 },
    { label: "Integrity Analytics", href: "/auditor/billing/analytics", icon: PieChart },
    { label: "Denial Forensics", href: "/auditor/billing/denials", icon: ShieldAlert },
    { label: "Fee Schedule Audit", href: "/auditor/billing/schedules", icon: Database },
    { label: "Matching Oversight", href: "/auditor/billing/era-audit", icon: Fingerprint },
    { label: "Benchmarking", href: "/auditor/billing/organizations", icon: Layers },
    { label: "Compliance Reports", href: "/auditor/reports", icon: Activity },
];

export default async function AuditorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();

    let user = null;
    let profile = null;

    if (supabase) {
        try {
            const { data } = await supabase.auth.getUser();
            user = data.user;

            if (user) {
                const { data: profileData } = await supabase
                    .from("users")
                    .select("role, first_name, last_name, organization_id")
                    .eq("id", user.id)
                    .single();
                profile = profileData;

                // Authorization check - only AUDITOR and SUPER_ADMIN can access
                if (profile?.role !== 'AUDITOR' && profile?.role !== 'SUPER_ADMIN') {
                    redirect('/dashboard');
                }
            }
        } catch (e) {
            console.error("Supabase error in AuditorLayout:", e);
        }
    }

    const displayName = profile?.first_name
        ? `${profile.first_name} ${profile.last_name || ''}`.trim()
        : user?.email || 'Auditor';

    return (
        <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen sticky top-0">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                            AUDITOR
                        </span>
                        <span className="text-xs text-slate-500">Read-Only Access</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
                    <div className="space-y-1">
                        <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Clinical Oversight</p>
                        {auditorNavItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    <div className="space-y-1">
                        <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Financial Suite</p>
                        {financialNavItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                        <Link
                            href="/auditor/settings"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                            <Settings className="h-5 w-5" />
                            System Settings
                        </Link>
                    </div>
                </nav>

                {/* User Info & Logout */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                    <Link
                        href="/auditor/settings"
                        className="flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                    >
                        <div className="h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center group-hover:ring-2 ring-amber-400 transition-all">
                            <User className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                {displayName}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                                {user?.email}
                            </p>
                        </div>
                    </Link>
                    <LogoutButton />
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {children}
            </main>
        </div>
    );
}
```

#### `src/app/telehealth/join/layout.tsx`

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "ChartSpark Telehealth - Join Your Session",
    description:
        "Join your secure, HIPAA-compliant video session with your healthcare provider.",
    openGraph: {
        title: "ChartSpark Telehealth Session",
        description:
            "Your provider has invited you to a secure telehealth session. Click to join.",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "ChartSpark Telehealth Session",
        description:
            "Your provider has invited you to a secure telehealth session. Click to join.",
    },
    robots: { index: false, follow: false },
};

export default function TelehealthJoinLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
```

### 2.3 Sidebar component

The clinician sidebar lives at `src/components/layout/Sidebar.tsx` (full contents shown — file is 211 lines):

```tsx
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUserProfile } from "@/components/layout/use-current-user-profile";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  FileText,
  Settings,
  Stethoscope,
  ClipboardList,
  BookOpen,
  Video,
  Pill,
  LogOut,
  Shield,
  Award,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tier?: "starter" | "pro" | "complete";
}

const navSections = [
  {
    title: "Care Standards",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Patients", href: "/patients", icon: Users },
      { label: "Encounters", href: "/encounters", icon: ClipboardList },
      { label: "Notes", href: "/notes", icon: FileText },
      { label: "Templates", href: "/templates", icon: BookOpen },
      { label: "References", href: "/references", icon: BookOpen },
      { label: "Geriatric Guide", href: "/references/geriatric", icon: BookOpen },
    ]
  },
  {
    title: "Intelligence & Hub",
    items: [
      { label: "Clinical AI", href: "/ai-assistant", icon: Stethoscope, tier: "complete" as const },
      { label: "Smart Triage", href: "/smart-triage", icon: ShieldCheck, tier: "complete" as const },
      { label: "Treatment Plan", href: "/treatment-planner", icon: ClipboardList, tier: "complete" as const },
      { label: "Analytics", href: "/analytics/relapse", icon: LayoutDashboard, tier: "complete" as const },
      { label: "Integration", href: "/integrations", icon: Settings, tier: "complete" as const },
    ]
  },
  {
    title: "Practice Operations",
    items: [
      { label: "E-Prescribe", href: "/e-prescribe", icon: Pill, tier: "complete" },
      { label: "License Tracking", href: "/licensing", icon: Award, tier: "pro" },
      { label: "Billing", href: "/billing", icon: CreditCard },
      { label: "Claims Manager", href: "/billing/claims", icon: ClipboardList, tier: "complete" },
      { label: "Calendar", href: "/calendar", icon: Calendar, tier: "pro" },
      { label: "Telehealth", href: "/telehealth", icon: Video, tier: "pro" },
    ]
  }
];

const bottomNavItems: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [hasMounted, setHasMounted] = useState(false);
  const supabase = createClient();
  const profile = useCurrentUserProfile();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const handleLogout = async () => {
    // 1. Clear Demo Mode session data
    localStorage.removeItem("demoMode");
    document.cookie = "demoMode=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";

    // 2. Perform Supabase Sign Out if available
    if (supabase) {
      await supabase.auth.signOut();
    }

    // 3. Clear application states
    localStorage.removeItem("cs_notifications");
    localStorage.removeItem("cs_licenses");

    // 4. Force navigation and refresh
    router.push("/login");
    router.refresh();
  };

  if (!hasMounted) return null;

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-surface border-r border-border h-screen sticky top-0" role="complementary" aria-label="Main sidebar navigation">
      {/* Navigation */}
      <div className="px-6 pb-4 pt-6">

        {/* Navigation Sections */}
        <nav className="flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar max-h-[calc(100vh-320px)]" aria-label="Main navigation">
          {navSections.map((section) => (
            <div key={section.title} className="flex flex-col gap-1">
              <h3 className="px-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 pl-4" id={`nav-section-${section.title.replace(/\s+/g, '-').toLowerCase()}`}>
                {section.title}
              </h3>
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group relative",
                      isActive
                        ? "bg-primary/10 text-primary font-bold shadow-sm border border-primary/10"
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 w-1 h-5 bg-primary rounded-r-full shadow-lg shadow-primary/40" />
                    )}
                    <Icon className={cn(
                      "h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110",
                      isActive ? "text-primary" : "text-slate-400 dark:text-slate-500"
                    )} />
                    <span className="text-[13px] font-semibold whitespace-nowrap">{item.label}</span>
                    {item.tier && (
                      <span className={cn(
                        "ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-md tracking-tighter shadow-sm",
                        item.tier === "pro"
                          ? "bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30"
                          : "bg-purple-50 text-purple-600 border border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-900/30"
                      )}>
                        {item.tier === "complete" ? "ELITE" : "PRO"}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="mt-auto p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
        <div className="space-y-1 mb-6">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-[13px] font-bold",
                  isActive
                    ? "bg-primary/5 text-primary border border-primary/10"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* User Profile Card */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
              <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border border-primary/10">
                {profile.initials}
              </div>
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-lg shadow-sm" aria-label="Online" role="status" />
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-slate-900 dark:text-white text-xs font-black truncate">{profile.fullName}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-tight truncate">{profile.subtitle}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all text-xs font-black uppercase tracking-widest border border-slate-100 dark:border-slate-800 hover:border-red-100 dark:hover:border-red-900/30"
            aria-label="Log out of your account"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
```

A second sidebar — `src/components/admin/AdminSidebar.tsx` (236 lines) — handles ADMIN and SUPER_ADMIN contexts. Its full contents are reproduced under section 3 because that's the only place its nav items are listed.

### 2.4 Top navbar / header component

`src/components/layout/Header.tsx` (193 lines) is the page-level header used per-page (not at the layout level). Full contents:

```tsx
"use client";

import { Menu, Bell, MessageSquare, AlertCircle, CheckCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface HeaderProps {
    title: string;
    description?: string;
    breadcrumbs?: { label: string; href?: string }[];
    actions?: React.ReactNode;
}

export function Header({ title, description, breadcrumbs, actions }: HeaderProps) {
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const notificationRef = useRef<HTMLDivElement>(null);

    // Sync notifications with localStorage
    useEffect(() => {
        const loadNotifications = () => {
            const saved = localStorage.getItem('cs_notifications');
            if (saved) {
                try { setNotifications(JSON.parse(saved)); } catch (e) { }
            }
        };

        loadNotifications();
        // Custom event to listen for updates from other pages
        window.addEventListener('notificationsUpdated', loadNotifications);
        return () => window.removeEventListener('notificationsUpdated', loadNotifications);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleMarkAsRead = (id: number) => {
        const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
        setNotifications(updated);
        localStorage.setItem('cs_notifications', JSON.stringify(updated));
        window.dispatchEvent(new Event('notificationsUpdated'));
    };

    const handleMarkAllRead = () => {
        const updated = notifications.map(n => ({ ...n, read: true }));
        setNotifications(updated);
        localStorage.setItem('cs_notifications', JSON.stringify(updated));
        window.dispatchEvent(new Event('notificationsUpdated'));
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    return (
        <header className="bg-surface/80 backdrop-blur-xl sticky top-0 z-30 border-b border-border px-6 py-4 lg:px-10 shadow-sm">
            <div className="max-w-7xl mx-auto w-full">
                {/* Breadcrumbs */}
                {breadcrumbs && breadcrumbs.length > 0 && (
                    <div className="flex items-center gap-2 mb-2 text-sm">
                        {breadcrumbs.map((crumb, index) => (
                            <span key={index} className="flex items-center gap-2">
                                {index > 0 && (
                                    <span className="text-border">/</span>
                                )}
                                {crumb.href ? (
                                    <Link
                                        href={crumb.href}
                                        className="text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        {crumb.label}
                                    </Link>
                                ) : (
                                    <span className="text-primary font-medium">{crumb.label}</span>
                                )}
                            </span>
                        ))}
                    </div>
                )}

                {/* Title Row */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                        <div>
                            <h1 className="text-foreground text-2xl md:text-3xl font-bold tracking-tight">
                                {title}
                            </h1>
                            {description && (
                                <p className="text-muted-foreground text-base mt-1">{description}</p>
                            )}
                        </div>
                        <img
                            src="/assets/logo.svg"
                            alt="ChartSpark"
                            className="h-24 w-auto hidden lg:block ml-auto"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Mobile menu toggle */}
                        <button className="flex items-center justify-center h-10 w-10 rounded-xl border border-border bg-surface text-muted-foreground hover:bg-muted/50 transition-colors lg:hidden">
                            <Menu className="h-5 w-5" />
                        </button>

                        {/* Notifications */}
                        <div className="relative" id="notifications-menu" ref={notificationRef}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowNotifications(!showNotifications);
                                }}
                                className={`relative flex items-center justify-center h-10 w-10 rounded-xl transition-all shadow-sm ${showNotifications ? 'bg-primary text-primary-foreground scale-105' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border/50'}`}
                            >
                                <Bell className="h-5 w-5" />
                                {unreadCount > 0 && (
                                    <span className={`absolute top-2.5 right-2.5 h-2 w-2 rounded-full ring-2 ring-surface transition-colors ${showNotifications ? 'bg-white' : 'bg-red-500'}`} />
                                )}
                            </button>

                            {showNotifications && (
                                <div className="absolute right-0 mt-3 w-80 bg-card rounded-2xl border border-border shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300 ring-1 ring-black/5">
                                    <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-foreground/70">Notifications</h3>
                                        <button
                                            onClick={handleMarkAllRead}
                                            disabled={unreadCount === 0}
                                            className="text-[10px] text-primary font-black uppercase tracking-wider hover:underline disabled:opacity-50 disabled:no-underline"
                                        >
                                            Mark all as read
                                        </button>
                                    </div>
                                    <div className="max-h-[380px] overflow-y-auto divide-y divide-border custom-scrollbar">
                                        {notifications.length === 0 ? (
                                            <div className="py-12 px-4 text-center">
                                                <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-50" />
                                                <p className="text-xs font-bold text-muted-foreground">All caught up!</p>
                                            </div>
                                        ) : (
                                            notifications.slice(0, 5).map((n) => {
                                                const Icon = Bell; // Use generic Bell or better icon mapping logic
                                                return (
                                                    <div
                                                        key={n.id}
                                                        onClick={() => {
                                                            handleMarkAsRead(n.id);
                                                            if (n.link) window.location.href = n.link;
                                                        }}
                                                        className={`p-4 hover:bg-muted/30 transition-colors cursor-pointer group ${!n.read ? 'bg-primary/5' : ''}`}
                                                    >
                                                        <div className="flex gap-4">
                                                            <div className={`p-2.5 rounded-xl shrink-0 ${n.color || 'text-primary bg-primary/5'} dark:bg-opacity-10 border border-current/10 shadow-sm`}>
                                                                <Bell className="h-4 w-4" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-start gap-2">
                                                                    <p className={`text-xs font-black group-hover:text-primary transition-colors truncate uppercase tracking-tight ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                                                                    <span className="text-[9px] font-bold text-muted-foreground whitespace-nowrap">{n.time}</span>
                                                                </div>
                                                                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 font-medium">{n.description}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    <div className="px-4 py-3 border-t border-border bg-muted/10">
                                        <Link
                                            href="/notifications"
                                            onClick={() => setShowNotifications(false)}
                                            className="block w-full py-2 text-[10px] font-black uppercase tracking-[0.2em] text-center text-primary hover:bg-primary/5 transition-colors rounded-lg"
                                        >
                                            View all activity
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Custom actions */}
                        {actions}
                    </div>
                </div>
            </div>
        </header>
    );
}
```

A separate mobile drawer lives at `src/components/layout/MobileNav.tsx` (143 lines). It is **defined and exported** from `src/components/layout/index.ts` but is not actually rendered anywhere in `src/app/(app)/layout.tsx`; the mobile button in `Header.tsx` is decorative and does not open it. (See section 5 for full file location list.)

### 2.5 Main authenticated layout wrapper

There is no single "authenticated shell" component — `(app)/layout.tsx`, `(admin)/admin/layout.tsx`, `(admin)/super-admin/layout.tsx`, and `auditor/layout.tsx` each compose their own sidebar + main pairing. The most representative is `src/app/(app)/layout.tsx` (already reproduced under section 2.2 above). It wires:

- `ToastProvider`
- `DemoAuthGuard` (auth gate, must be inside ToastProvider for toasts to work after sign-out)
- `PilotReadOnlyBanner` → `TrialBanner` → `ReadOnlyBanner` (stacked status banners)
- `<div className="min-h-screen flex bg-background">` outer flex container
  - `<Sidebar />` (fixed `w-60`, only visible at `lg:` breakpoint)
  - `<main className="flex-1 flex flex-col min-h-screen overflow-y-auto">` page slot
- `SessionTimeout enabled={true}` (HIPAA — must stay)
- `MFAGate` (modal that intercepts if MFA challenge is pending)

Pages render their own `<Header />` per-route (it is not in the layout).

---

## Section 3 — Sidebar Navigation Inventory

### 3.1 Clinician sidebar (`src/components/layout/Sidebar.tsx`)

The clinician sidebar is what most users see (route group `(app)`). Items are grouped into three sections; no role gating is applied at the component level (gating happens via tier badges + the `FeatureGate` wrapper on individual pages).

| Group/Section | Label | Route | Icon | Role gating |
|---|---|---|---|---|
| Care Standards | Dashboard | `/dashboard` | `LayoutDashboard` | None |
| Care Standards | Patients | `/patients` | `Users` | None |
| Care Standards | Encounters | `/encounters` | `ClipboardList` | None |
| Care Standards | Notes | `/notes` | `FileText` | None |
| Care Standards | Templates | `/templates` | `BookOpen` | None |
| Care Standards | References | `/references` | `BookOpen` | None |
| Care Standards | Geriatric Guide | `/references/geriatric` | `BookOpen` | None |
| Intelligence & Hub | Clinical AI | `/ai-assistant` | `Stethoscope` | tier: `complete` (ELITE badge) |
| Intelligence & Hub | Smart Triage | `/smart-triage` | `ShieldCheck` | tier: `complete` (ELITE) |
| Intelligence & Hub | Treatment Plan | `/treatment-planner` | `ClipboardList` | tier: `complete` (ELITE) |
| Intelligence & Hub | Analytics | `/analytics/relapse` | `LayoutDashboard` | tier: `complete` (ELITE) |
| Intelligence & Hub | Integration | `/integrations` | `Settings` | tier: `complete` (ELITE) |
| Practice Operations | E-Prescribe | `/e-prescribe` | `Pill` | tier: `complete` (ELITE) |
| Practice Operations | License Tracking | `/licensing` | `Award` | tier: `pro` (PRO) |
| Practice Operations | Billing | `/billing` | `CreditCard` | None |
| Practice Operations | Claims Manager | `/billing/claims` | `ClipboardList` | tier: `complete` (ELITE) |
| Practice Operations | Calendar | `/calendar` | `Calendar` | tier: `pro` (PRO) |
| Practice Operations | Telehealth | `/telehealth` | `Video` | tier: `pro` (PRO) |
| (bottom) | Settings | `/settings` | `Settings` | None |

### 3.1.a AdminSidebar — ADMIN context (`src/components/admin/AdminSidebar.tsx`)

When `context="admin"` is passed, the following list is rendered as a single (ungrouped) block under the heading "Management Console":

| Group/Section | Label | Route | Icon | Role gating |
|---|---|---|---|---|
| Management Console | Admin Home | `/admin` | `LayoutDashboard` | ADMIN + SUPER_ADMIN |
| Management Console | Analytics | `/admin/analytics` | `Activity` | ADMIN + SUPER_ADMIN |
| Management Console | Users | `/admin/users` | `Users` | ADMIN + SUPER_ADMIN |
| Management Console | Profile Approvals | `/admin/profile-approvals` | `UserCog` | ADMIN + SUPER_ADMIN |
| Management Console | Invitations | `/admin/invitations` | `UserPlus` | ADMIN + SUPER_ADMIN |
| Management Console | Templates | `/admin/templates` | `FileText` | ADMIN + SUPER_ADMIN |
| Management Console | Submissions | `/admin/submissions` | `ClipboardList` | ADMIN + SUPER_ADMIN |
| Management Console | Reports | `/admin/reports` | `BarChart3` | ADMIN + SUPER_ADMIN |
| Management Console | Scheduled Reports | `/admin/scheduled-reports` | `Calendar` | ADMIN + SUPER_ADMIN |
| Management Console | Webhooks | `/admin/webhooks` | `Webhook` | ADMIN + SUPER_ADMIN |
| Management Console | Security Logs | `/admin/security/audit-logs` | `Shield` | ADMIN + SUPER_ADMIN |
| Management Console | Integrations | `/admin/integrations` | `Plug` | ADMIN + SUPER_ADMIN |
| Management Console | Billing Console | `/admin/billing` | `CreditCard` | ADMIN + SUPER_ADMIN |
| Management Console | Admin Settings | `/admin/settings` | `Settings` | ADMIN + SUPER_ADMIN |

### 3.1.b AdminSidebar — SUPER_ADMIN context

| Group/Section | Label | Route | Icon | Role gating |
|---|---|---|---|---|
| Platform Master | Platform Overview | `/super-admin` | `LayoutDashboard` | SUPER_ADMIN |
| Platform Master | All Organizations | `/super-admin/organizations` | `Building2` | SUPER_ADMIN |
| Platform Master | Platform Users | `/super-admin/users` | `Users` | SUPER_ADMIN |
| Platform Master | Analytics | `/super-admin/analytics` | `Activity` | SUPER_ADMIN |
| Platform Master | Invitations | `/super-admin/invitations` | `UserPlus` | SUPER_ADMIN |
| Platform Master | Templates | `/super-admin/templates` | `FileText` | SUPER_ADMIN |
| Platform Master | Reports | `/super-admin/reports` | `BarChart3` | SUPER_ADMIN |
| Platform Master | Scheduled Reports | `/super-admin/scheduled-reports` | `Calendar` | SUPER_ADMIN |
| Platform Master | Webhooks | `/super-admin/webhooks` | `Webhook` | SUPER_ADMIN |
| Platform Master | Security Logs | `/super-admin/audit-logs` | `Shield` | SUPER_ADMIN |
| Platform Master | Auditors Hub | `/super-admin/auditors` | `ClipboardList` | SUPER_ADMIN |
| Platform Master | Integrations | `/super-admin/integrations` | `Plug` | SUPER_ADMIN |
| Platform Master | Billing Overview | `/super-admin/managed-billing` | `Receipt` | SUPER_ADMIN |
| Platform Master | Revenue Analytics | `/super-admin/managed-billing/analytics` | `PieChart` | SUPER_ADMIN |
| Platform Master | Denial Forensics | `/super-admin/managed-billing/denials` | `ShieldAlert` | SUPER_ADMIN |
| Platform Master | Fee Schedules | `/super-admin/managed-billing/schedules` | `Database` | SUPER_ADMIN |
| Platform Master | ERA Verification | `/super-admin/managed-billing/era-audit` | `Fingerprint` | SUPER_ADMIN |
| Platform Master | Org Benchmarking | `/super-admin/managed-billing/organizations` | `Layers` | SUPER_ADMIN |
| Platform Master | Platform Billing | `/super-admin/financials` | `DollarSign` | SUPER_ADMIN |

### 3.1.c Auditor sidebar (inline in `src/app/auditor/layout.tsx`)

| Group/Section | Label | Route | Icon | Role gating |
|---|---|---|---|---|
| Clinical Oversight | General Dashboard | `/auditor` | `LayoutDashboard` | AUDITOR + SUPER_ADMIN |
| Clinical Oversight | Submissions Queue | `/auditor/submissions` | `ClipboardCheck` | AUDITOR + SUPER_ADMIN |
| Clinical Oversight | Notes Review | `/auditor/notes` | `FileText` | AUDITOR + SUPER_ADMIN |
| Clinical Oversight | My Flags | `/auditor/flags` | `Flag` | AUDITOR + SUPER_ADMIN |
| Financial Suite | Audit Overview | `/auditor/billing` | `BarChart3` | AUDITOR + SUPER_ADMIN |
| Financial Suite | Integrity Analytics | `/auditor/billing/analytics` | `PieChart` | AUDITOR + SUPER_ADMIN |
| Financial Suite | Denial Forensics | `/auditor/billing/denials` | `ShieldAlert` | AUDITOR + SUPER_ADMIN |
| Financial Suite | Fee Schedule Audit | `/auditor/billing/schedules` | `Database` | AUDITOR + SUPER_ADMIN |
| Financial Suite | Matching Oversight | `/auditor/billing/era-audit` | `Fingerprint` | AUDITOR + SUPER_ADMIN |
| Financial Suite | Benchmarking | `/auditor/billing/organizations` | `Layers` | AUDITOR + SUPER_ADMIN |
| Financial Suite | Compliance Reports | `/auditor/reports` | `Activity` | AUDITOR + SUPER_ADMIN |
| (bottom) | System Settings | `/auditor/settings` | `Settings` | AUDITOR + SUPER_ADMIN |

### 3.2 Badges, counts, indicators on sidebar items

- **Clinician sidebar** — tier badges only:
  - `tier: "pro"` → renders blue **PRO** chip (`bg-blue-50 text-blue-600`)
  - `tier: "complete"` → renders purple **ELITE** chip (`bg-purple-50 text-purple-600`)
  - No notification dots, no counts, no NEW labels.
- **User profile card (bottom)** — small emerald presence dot pinned to the avatar via `absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500` (decorative; always green, not driven by real status).
- **AdminSidebar** — no badges at all; just the active-item highlight.
- **Auditor sidebar** — amber `AUDITOR` pill in the header reading "Read-Only Access"; no per-item badges/counts.
- **Header (`Header.tsx`)** — bell button shows a red `bg-red-500` dot when there is at least one unread item (`notifications.filter(n => !n.read).length > 0`). Notifications themselves are read from `localStorage` key `cs_notifications` (no server count).

### 3.3 Active-item visual style

**Clinician sidebar (`Sidebar.tsx`)** — when `pathname === item.href || pathname.startsWith(item.href + '/')`:
- Background: `bg-primary/10` (10% teal #0d968b)
- Text color: `text-primary` (teal)
- Font weight: `font-bold`
- Border: `border border-primary/10`
- Shadow: `shadow-sm`
- A short vertical accent rail is absolutely positioned at the left edge: `absolute left-0 w-1 h-5 bg-primary rounded-r-full shadow-lg shadow-primary/40`
- Icon color flips from `text-slate-400` to `text-primary`
- Icon scales `1.0 → 1.1` on hover (`group-hover:scale-110`)

**AdminSidebar** — same accent-rail pattern, but on a dark sidebar:
- admin context: `bg-primary/20 text-primary border border-primary/20` + teal rail
- super-admin context: `bg-purple-600/20 text-purple-400 border border-purple-500/20` + purple rail with `shadow-purple-500/40`

**Auditor sidebar** — has **no active state styling at all**. Every link uses the same `text-slate-600 hover:bg-slate-100` classes regardless of current route. This is a pre-existing UX bug that the redesign should fix.

---

## Section 4 — Route Inventory

### 4.1 All page routes

Derived from every `page.tsx` under `src/app/`. Next.js route groups (`(app)`, `(admin)`, `(auth)`, `(marketing)`) are stripped from URLs.

**Public / marketing / auth (no app shell):**
- `/` (redirects to `/dashboard`)
- `/pricing`
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/auth/mfa-challenge`
- `/auth/auth-code-error`
- `/accept-invitation`
- `/pilot-ended`
- `/telehealth/join` (patient telehealth landing — different layout)

**Clinician (`(app)` group):**
- `/dashboard`
- `/patients`
- `/patients/new`
- `/patients/[id]`
- `/patients/[id]/risk/new`
- `/encounters`
- `/encounters/new`
- `/encounters/[id]`
- `/notes`
- `/notes/new`
- `/notes/[id]`
- `/templates`
- `/references`
- `/references/geriatric`
- `/ai-assistant`
- `/smart-triage`
- `/treatment-planner`
- `/analytics/relapse`
- `/integrations`
- `/e-prescribe`
- `/licensing`
- `/billing`
- `/billing/claims`
- `/billing/fee-schedule`
- `/billing/revenue`
- `/billing/era-inbox`
- `/calendar`
- `/telehealth`
- `/telehealth/setup`
- `/notifications`
- `/submissions`
- `/settings`
- `/settings/security`
- `/settings/security/mfa`
- `/settings/security/change-password`
- `/test-ai`

**Admin (`(admin)/admin`):**
- `/admin`
- `/admin/analytics`
- `/admin/auditor-notes`
- `/admin/billing`
- `/admin/features`
- `/admin/integrations`
- `/admin/invitations`
- `/admin/managed-billing`
- `/admin/managed-billing/claims`
- `/admin/managed-billing/era`
- `/admin/managed-billing/fee-schedules`
- `/admin/managed-billing/unmatched`
- `/admin/organizations`
- `/admin/profile-approvals`
- `/admin/reports`
- `/admin/scheduled-reports`
- `/admin/security/audit-logs`
- `/admin/settings`
- `/admin/submissions`
- `/admin/system-health`
- `/admin/templates`
- `/admin/users`
- `/admin/users/[id]/features`
- `/admin/webhooks`

**Super-admin (`(admin)/super-admin`):**
- `/super-admin`
- `/super-admin/analytics`
- `/super-admin/audit-logs`
- `/super-admin/auditors`
- `/super-admin/fees`
- `/super-admin/financials`
- `/super-admin/integrations`
- `/super-admin/invitations`
- `/super-admin/managed-billing`
- `/super-admin/managed-billing/analytics`
- `/super-admin/managed-billing/claims`
- `/super-admin/managed-billing/clearinghouse`
- `/super-admin/managed-billing/denials`
- `/super-admin/managed-billing/era`
- `/super-admin/managed-billing/era-audit`
- `/super-admin/managed-billing/organizations`
- `/super-admin/managed-billing/schedules`
- `/super-admin/managed-billing/unmatched`
- `/super-admin/organizations`
- `/super-admin/reports`
- `/super-admin/scheduled-reports`
- `/super-admin/settings`
- `/super-admin/templates`
- `/super-admin/templates/[id]`
- `/super-admin/users`
- `/super-admin/users/[id]/features`
- `/super-admin/webhooks`

**Auditor:**
- `/auditor`
- `/auditor/billing`
- `/auditor/billing/analytics`
- `/auditor/billing/claims/[id]`
- `/auditor/billing/denials`
- `/auditor/billing/era-audit`
- `/auditor/billing/organizations`
- `/auditor/billing/schedules`
- `/auditor/flags`
- `/auditor/notes`
- `/auditor/reports`
- `/auditor/settings`
- `/auditor/submissions`
- `/auditor/submissions/[id]`

### 4.2 First-impression styling label per route

The codebase has no literal "Stitch" markers — `grep -i stitch` returns zero hits. Every page is a hand-written React component using Tailwind utility classes against the teal token system. The visual identity is heavy on `rounded-2xl`, `bg-primary/10`, `font-black`, gradient avatars, and emoji-style icon tiles — playful but already constrained to the teal palette. With no leftover markers to distinguish auto-generated from hand-authored screens, the most defensible classification is:

- **Stitch-generated**: none cleanly identified — no marker survived
- **Custom**: all routes
- **Unknown**: every page (no way to recover Stitch provenance from the source)

Routes that visually lean hardest into the playful/decorative aesthetic (and so are the strongest redesign candidates) — first impression:

| Route | Impression |
|---|---|
| `/dashboard` | Custom — heavy decorative cards, gradient avatars |
| `/patients` | Custom — pill status chips, dotted indicators |
| `/notes` | Custom |
| `/encounters` | Custom |
| `/ai-assistant` | Custom — sparkle/glow accents |
| `/smart-triage` | Custom — large colored severity cards |
| `/treatment-planner` | Custom |
| `/billing` (+ children) | Custom |
| `/pricing` | Custom marketing — gradients, sparkles, tier cards |
| `/auditor` (+ children) | Custom — amber-themed, distinct from clinician |
| `/admin` (+ children) | Custom — dark slate, very different from clinician shell |
| `/super-admin` (+ children) | Custom — purple/indigo gradient theme |

### 4.3 Routes that look unwired / dead

Routes that exist but have no inbound link from any sidebar/header/Page-level Link (best-effort):

- `/test-ai` — `src/app/(app)/test-ai/page.tsx`. Self-gated to ADMIN/SUPER_ADMIN inside the page; not referenced by any sidebar. Looks like a dev harness left behind.
- `/billing/fee-schedule` — clinician sidebar links to `/billing/claims` but not `/billing/fee-schedule` or `/billing/revenue` or `/billing/era-inbox`. These exist but are only reachable from sub-navigation inside `/billing`. Worth confirming during Phase 2 whether they should stay.
- `/admin/auditor-notes` — referenced in dead-code `adminNavItems` inside `(admin)/admin/layout.tsx` but **not** in the real `AdminSidebar.tsx` nav list. Inbound link risk.
- `/admin/features` — `page.tsx` exists, but `AdminSidebar` does not link to it. Reached only via `/admin/users/[id]/features` flow. Likely intentional but worth confirming.
- `/super-admin/fees` — declared in dead-code `superAdminNavItems` in `(admin)/super-admin/layout.tsx` but **not** in the live `AdminSidebar`. Inbound link risk.
- `/super-admin/audit-logs` — linked from AdminSidebar as "Security Logs"; both `audit-logs` and `security/audit-logs` exist across admin vs super-admin and are easy to mix up — confirm both are wired.

The dead-code `adminNavItems` / `superAdminNavItems` arrays inside the parent layouts under `src/app/(admin)/` should be deleted in Phase 2 — they confuse navigation auditing.

---

## Section 5 — Component Inventory

### 5.1 Directory tree of `src/components/` (depth 3)

```
src/components/
├── admin/
│   ├── AdminDashboardClient.tsx
│   ├── AdminPageHeader.tsx
│   ├── AdminSidebar.tsx
│   ├── ChangeRoleModal.tsx
│   ├── FeaturePackageModal.tsx
│   ├── ProfileApprovalActions.tsx
│   ├── SuperAdminQuickActions.tsx
│   └── index.ts
├── agent/
│   └── EndSessionButton.tsx
├── auditor/
│   ├── AuditWorkspace.tsx
│   ├── ProfileEditForm.tsx
│   ├── ReportsExportButton.tsx
│   └── SubmissionsTable.tsx
├── auth/
│   ├── DemoAuthGuard.tsx
│   ├── MFAChallengeModal.tsx
│   └── MFAGate.tsx
├── billing/
│   ├── BillingSetup.tsx
│   ├── ClaimValidationModal.tsx
│   ├── ClaimsManagerTable.tsx
│   ├── ConnectivityDashboard.tsx
│   ├── DenialWorklist.tsx
│   ├── PatientStatement.tsx
│   ├── SuperbillWidget.tsx
│   └── index.ts
├── FeatureGate.tsx
├── layout/
│   ├── Header.tsx
│   ├── MobileNav.tsx
│   ├── Sidebar.tsx
│   ├── index.ts
│   └── use-current-user-profile.ts
├── LogoutButton.tsx
├── notes/
│   ├── PatientQuickSelectModal.tsx
│   ├── QuickPhrasePanel.tsx
│   ├── new-note-form.test.tsx
│   └── new-note-form.tsx
├── patients/
│   ├── InsuranceForm.tsx
│   └── PatientDocuments.tsx
├── pilot/
│   ├── pilot-readonly-banner-server.tsx
│   ├── pilot-readonly-banner.tsx
│   ├── pilot-readonly-form-banner.test.tsx
│   └── pilot-readonly-form-banner.tsx
├── security/                              (empty directory)
├── SessionTimeout.tsx
├── smart-triage/
│   ├── ChartSummaryCard.tsx
│   ├── LabMonitoringCard.tsx
│   ├── MedicationSafetyCard.tsx
│   ├── PrescribingCheckDialog.tsx
│   ├── SmartTriagePanel.tsx
│   └── TriageBadge.tsx
├── subscriptions/
│   ├── index.ts
│   ├── pricing-card.tsx
│   ├── read-only-banner.tsx
│   ├── trial-banner.tsx
│   └── upgrade-prompt.tsx
├── telehealth/
│   └── DailyVideoCall.tsx
├── ui/
│   ├── ConfirmModal.tsx
│   ├── DetailModal.tsx
│   ├── error-boundary.tsx
│   ├── skeleton.tsx
│   └── toast.tsx
└── vitals/
    ├── ScreeningPanel.tsx
    ├── ScreeningTrendChart.tsx
    ├── VitalsEntryPanel.tsx
    └── WeightTrendChart.tsx
```

### 5.2 Components grouped by apparent purpose

**Layout components**
- `layout/Sidebar.tsx` — clinician shell sidebar
- `layout/Header.tsx` — per-page header with title/breadcrumbs/notifications
- `layout/MobileNav.tsx` — mobile drawer (exported but not mounted)
- `admin/AdminSidebar.tsx` — admin & super-admin shell sidebar
- `admin/AdminPageHeader.tsx` — admin page header
- `layout/use-current-user-profile.ts` — supporting hook (not strictly layout, but lives here)

**Card / surface components**
- `smart-triage/ChartSummaryCard.tsx`
- `smart-triage/LabMonitoringCard.tsx`
- `smart-triage/MedicationSafetyCard.tsx`
- `smart-triage/SmartTriagePanel.tsx`
- `subscriptions/pricing-card.tsx`
- `billing/SuperbillWidget.tsx`
- `billing/ConnectivityDashboard.tsx`

**Form components**
- `notes/new-note-form.tsx`
- `notes/QuickPhrasePanel.tsx`
- `patients/InsuranceForm.tsx`
- `vitals/VitalsEntryPanel.tsx`
- `vitals/ScreeningPanel.tsx`
- `auditor/ProfileEditForm.tsx`

**Button components**
- `agent/EndSessionButton.tsx`
- `LogoutButton.tsx`
- `auditor/ReportsExportButton.tsx`

**Data display (tables, lists, badges)**
- `auditor/SubmissionsTable.tsx`
- `billing/ClaimsManagerTable.tsx`
- `billing/DenialWorklist.tsx`
- `patients/PatientDocuments.tsx`
- `smart-triage/TriageBadge.tsx`
- `vitals/ScreeningTrendChart.tsx`
- `vitals/WeightTrendChart.tsx`

**Modal / dialog components**
- `ui/ConfirmModal.tsx`
- `ui/DetailModal.tsx`
- `notes/PatientQuickSelectModal.tsx`
- `billing/ClaimValidationModal.tsx`
- `admin/ChangeRoleModal.tsx`
- `admin/FeaturePackageModal.tsx`
- `auth/MFAChallengeModal.tsx`
- `smart-triage/PrescribingCheckDialog.tsx`

**Page-specific components** (only used by one page or one feature area)
- `admin/AdminDashboardClient.tsx`
- `admin/SuperAdminQuickActions.tsx`
- `admin/ProfileApprovalActions.tsx`
- `auditor/AuditWorkspace.tsx`
- `billing/BillingSetup.tsx`
- `billing/PatientStatement.tsx`
- `telehealth/DailyVideoCall.tsx`

**Banners & gating wrappers**
- `subscriptions/trial-banner.tsx`
- `subscriptions/read-only-banner.tsx`
- `subscriptions/upgrade-prompt.tsx`
- `pilot/pilot-readonly-banner.tsx`
- `pilot/pilot-readonly-banner-server.tsx`
- `pilot/pilot-readonly-form-banner.tsx`
- `FeatureGate.tsx`

**Utility / wrapper / infra**
- `ui/error-boundary.tsx`
- `ui/skeleton.tsx`
- `ui/toast.tsx`
- `SessionTimeout.tsx`
- `auth/DemoAuthGuard.tsx`
- `auth/MFAGate.tsx`

**Empty / TBD**
- `security/` — directory exists, contains no files

### 5.3 Components flagged as Stitch-aesthetic / decorative-heavy

Top candidates for replacement during Phase 2 because of heavy use of gradients, decorative rings, oversized `font-black uppercase tracking-widest` flourishes, or playful chrome that diverges from Tebra's flatter UI:

- `components/layout/Sidebar.tsx` — emerald presence-dot, gradient profile card, `font-black uppercase tracking-widest` logout button, animated icon scale-on-hover, `tier` chips with shadowed borders.
- `components/layout/Header.tsx` — `backdrop-blur-xl`, oversized 24-px logo at top right, `animate-in zoom-in-95 slide-in-from-top-2` notification dropdown, `font-black uppercase tracking-[0.2em]` headings.
- `components/admin/AdminSidebar.tsx` — gradient avatar tiles (`bg-gradient-to-br from-blue-600 to-primary` / `from-purple-600 to-indigo-700`), purple glow shadows on super-admin (`shadow-[0_0_15px_rgba(147,51,234,0.1)]`), "Terminate Session" red-bordered logout button.
- `components/subscriptions/pricing-card.tsx` (and `app/(marketing)/pricing/page.tsx`) — gradient tier hero, sparkles iconography, large pricing tiles.
- `components/subscriptions/trial-banner.tsx`, `subscriptions/read-only-banner.tsx`, `pilot/pilot-readonly-banner.tsx` — colorful full-width banners stacked at the top of `(app)` shell.
- `components/smart-triage/SmartTriagePanel.tsx` and its sibling cards — heavy severity-colored cards, large icons.
- `app/(app)/dashboard/page.tsx` — "Quick tools" deck of large colored icon tiles (`bg-blue-50`, `bg-purple-50`, `bg-teal-50`), gradient-styled cards.

`components/ui/` is sparse (`ConfirmModal`, `DetailModal`, `error-boundary`, `skeleton`, `toast`) — there is no shared Button, Input, Card, Badge, or DataTable primitive. Phase 2 will likely need to introduce those.

---

## Section 6 — Dependencies (`package.json`)

- **Next.js:** `next@16.1.6`
- **React:** `react@19.2.3` / `react-dom@19.2.3`
- **Tailwind:** `tailwindcss@4.1.18` (devDep) + `@tailwindcss/postcss@4.1.18` (PostCSS plugin). Tailwind v4, no `tailwind.config` file, theme inline in `globals.css`.
- **UI libraries:** **none of the usual ones.** No `shadcn/ui`, no Radix UI, no Headless UI, no MUI, no Chakra, no Mantine, no Ant Design, no Aria/React-Aria, no Stitches. All UI is hand-built from Tailwind primitives.
- **Icon library:** `lucide-react@0.562.0` (single source, used everywhere).
- **Styling helpers:** `class-variance-authority@0.7.1`, `clsx@2.1.1`, `tailwind-merge@3.4.0`. Note: `cva` is installed but I did not see it used in any layout/sidebar file. `clsx` + `tailwind-merge` are wrapped by `cn()` in `src/lib/utils`.
- **Animation:** `tw-animate-css@1.4.0` (devDep) — provides `animate-in`, `fade-in`, `zoom-in-95`, `slide-in-from-top-2` utility variants used in `Header.tsx` notification dropdown.
- **Charts:** `recharts@3.6.0` (used in `vitals/*Chart.tsx` and analytics pages).
- **Auth / data:** `@supabase/ssr@0.8.0`, `@supabase/supabase-js@2.89.0`, `@supabase/auth-helpers-nextjs@0.15.0`.
- **AI / video / billing infra:** `@azure/openai`, `openai`, `@daily-co/daily-js`, `@daily-co/daily-react`, `stripe`, `resend`, `@react-email/*`.
- **Observability / rate-limit:** `@sentry/nextjs@10.39.0`, `@upstash/ratelimit`, `@upstash/redis`.
- **Validation:** `zod@4.3.6`.
- **Tooling:** `eslint@9.39.2`, `prettier@3.8.2`, `vitest@4.0.18`, `@playwright/test@1.58.2`, `husky@9.1.7`, `lint-staged`.
- **Fonts:** Plus Jakarta Sans via `next/font/google` in `src/app/layout.tsx`, wired to `--font-display` and mapped to `--font-sans` in `globals.css`.

There is **no** design-system package (e.g., no internal `@chartspark/ui` workspace). The Tebra redesign will either need to introduce one (shadcn/ui is the obvious match given `class-variance-authority` is already a dep) or continue building primitives from Tailwind utilities.

---

## Section 7 — Do-Not-Touch Zones

### 7.1 HIPAA-related components and files

These files implement session security, audit logging, and HIPAA-compliance plumbing. **Do not modify during the redesign:**

- `src/components/SessionTimeout.tsx` — idle warning + auto-logout (HIPAA Privacy Rule §164.312(a)(2)(iii))
- `src/lib/auth/session.ts` — `SESSION_CONFIG`, `recordActivity`, `getLastActivity`, `clearSessionActivity`, `hasAbsoluteTimeoutExpired`
- `src/lib/security/audit-log.ts` — audit log writer
- `src/lib/security/audit-error-codes.ts`
- `src/lib/security/intrusion-detection.ts`
- `src/lib/security/intrusion-detection-edge.ts`
- `src/lib/security/encryption.ts`
- `src/lib/security/masking.ts`
- `src/lib/security/file-security.ts`
- `src/lib/security/redirects.ts`
- `src/lib/security/timing-safe.ts`
- `src/lib/security/validation.ts`
- `src/lib/security/rate-limit.ts`
- `src/lib/security/alerts.ts`
- `src/lib/security/slack-alerts.ts`
- `src/lib/security/csrf.ts`
- `src/lib/security/telehealth-invite-tokens.ts`
- `src/lib/security/telehealth-session-tokens.ts`
- `src/lib/sentry/scrub-phi.ts` — PHI scrubbing before Sentry events
- Admin pages that surface audit data — `src/app/(admin)/admin/security/audit-logs/page.tsx` and `src/app/(admin)/super-admin/audit-logs/page.tsx`. UI can be reskinned but the data flow must not change.
- `src/app/pilot-ended/page.tsx` — pilot read-only end-of-life screen (compliance gate)
- `src/components/pilot/pilot-readonly-banner.tsx`, `pilot-readonly-banner-server.tsx`, `pilot-readonly-form-banner.tsx` — pilot read-only enforcement banners

### 7.2 Authentication components and files

- `src/components/auth/DemoAuthGuard.tsx` — gates `(app)` and `(admin)` route groups
- `src/components/auth/MFAGate.tsx` — modal-based MFA challenge interception
- `src/components/auth/MFAChallengeModal.tsx`
- `src/components/LogoutButton.tsx`
- `src/lib/auth/api-auth.ts`
- `src/lib/auth/lockout.ts`
- `src/lib/auth/mfa.ts`
- `src/lib/auth/password-validation.ts`
- `src/lib/auth/confirmation-callback.ts`
- `src/lib/auth/session.ts` (also listed under HIPAA)
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/service-role-client.ts`
- `src/lib/supabase/route-handler-client.ts`
- `src/lib/supabase/middleware.ts`
- `src/lib/supabase/index.ts`
- Auth pages — `src/app/(auth)/login/page.tsx` + `LoginPageClient.tsx`, `(auth)/register/page.tsx`, `(auth)/forgot-password/page.tsx`, `(auth)/reset-password/page.tsx`, `auth/mfa-challenge/page.tsx`, `auth/auth-code-error/page.tsx`, `accept-invitation/page.tsx`, `app/(app)/settings/security/**`. UI may be reskinned but the auth flow logic, credential handling, and redirects must not change.

### 7.3 AI scribe / Whisper / transcription components

- `src/app/api/ai/transcribe-and-generate/route.ts` — Whisper transcription + note generation API
- `src/services/safeAzureOpenAI.ts` — Azure OpenAI client wrapper used for transcription
- `src/components/notes/new-note-form.tsx` — clinician-facing recording + transcription UI (also calls `transcribe-and-generate`)
- `src/components/notes/PatientQuickSelectModal.tsx` (paired with the form above)
- `src/app/(app)/notes/new/page.tsx` (entry route)
- `src/app/api/ai/generate-note/route.ts` (sibling text-only note generation)
- `src/app/api/ai/chat/route.ts`, `diagnose/route.ts`, `recommendations/route.ts`, `treatment-plan/route.ts`, `validate-codes/route.ts`, `smart-triage/chart-summary/route.ts`, `medication-review/route.ts`, `prescribing-check/route.ts` — sibling AI endpoints. Treat the whole `src/app/api/ai/**` tree and `src/services/safeAzureOpenAI*` as do-not-touch.

---

## Summary observations (informational, not part of the audit spec)

- All theming lives in a single CSS file. Migrating to a Tebra design system is mostly a token swap + sidebar/header rebuild — there is no `tailwind.config.ts` to edit and no third-party design system to dislodge.
- Four parallel sidebar implementations (`Sidebar`, `AdminSidebar` admin context, `AdminSidebar` super-admin context, inline auditor sidebar) — Phase 2 should consolidate to a single role-aware sidebar.
- `MobileNav` is dead-imported. `auditor/layout.tsx` has no active-state styling on links. Multiple `*NavItems` arrays inside layout files are unused. Clean-up opportunities for Phase 2.
- No primitive `Button`, `Input`, `Card`, `Badge`, `Table` components exist — Tebra-aligned primitives are the natural Phase 2 foundation. `class-variance-authority` is already installed.
