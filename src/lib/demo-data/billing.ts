// Demo billing data for role-based dashboards
import { UserBillingStats, OrgBillingStats, PlatformBillingStats } from "@/types/database";

// Current demo user (USER role view)
export const currentUserBillingStats: UserBillingStats = {
    notes_generated: 47,
    total_billing: 6840.00,
    codes_used: {
        "99213": 12,
        "99214": 18,
        "99215": 5,
        "90834": 8,
        "90837": 4,
    },
};

// Organization billing stats (ADMIN role view)
export const orgBillingStats: OrgBillingStats = {
    organization_id: "org-1",
    organization_name: "Wellness Psychiatry Associates",
    total_users: 5,
    total_notes: 234,
    total_billing: 34125.00,
    total_fees: 341.25,
    users: [
        { user_id: "u1", user_name: "Dr. Sarah K.", notes_generated: 47, billing_amount: 6840.00, fee_amount: 68.40 },
        { user_id: "u2", user_name: "Dr. Michael Chen", notes_generated: 62, billing_amount: 9020.00, fee_amount: 90.20 },
        { user_id: "u3", user_name: "Dr. Lisa Park", notes_generated: 51, billing_amount: 7395.00, fee_amount: 73.95 },
        { user_id: "u4", user_name: "NP Jennifer Adams", notes_generated: 38, billing_amount: 5510.00, fee_amount: 55.10 },
        { user_id: "u5", user_name: "NP David Wilson", notes_generated: 36, billing_amount: 5360.00, fee_amount: 53.60 },
    ],
};

// Platform-wide stats (SUPER_ADMIN role view)
export const platformBillingStats: PlatformBillingStats = {
    total_organizations: 12,
    total_users: 48,
    total_notes: 1847,
    total_billing: 268315.00,
    total_fees_collected: 2683.15,
    organizations: [
        {
            organization_id: "org-1",
            organization_name: "Wellness Psychiatry Associates",
            total_users: 5,
            total_notes: 234,
            total_billing: 34125.00,
            total_fees: 341.25,
            users: [],
        },
        {
            organization_id: "org-2",
            organization_name: "Coastal Mental Health",
            total_users: 8,
            total_notes: 412,
            total_billing: 59740.00,
            total_fees: 597.40,
            users: [],
        },
        {
            organization_id: "org-3",
            organization_name: "Sunrise Behavioral Health",
            total_users: 6,
            total_notes: 287,
            total_billing: 41615.00,
            total_fees: 416.15,
            users: [],
        },
        {
            organization_id: "org-4",
            organization_name: "Mountain View Psychiatry",
            total_users: 4,
            total_notes: 198,
            total_billing: 28710.00,
            total_fees: 287.10,
            users: [],
        },
        {
            organization_id: "org-5",
            organization_name: "Valley Psychiatric Group",
            total_users: 7,
            total_notes: 356,
            total_billing: 51620.00,
            total_fees: 516.20,
            users: [],
        },
    ],
};

// Fee configuration demo data
export const feeConfigurations = [
    { org_id: "org-1", org_name: "Wellness Psychiatry Associates", fee_percentage: 1.0, method: "charge_separately" as const },
    { org_id: "org-2", org_name: "Coastal Mental Health", fee_percentage: 1.0, method: "deduct_from_billing" as const },
    { org_id: "org-3", org_name: "Sunrise Behavioral Health", fee_percentage: 0.75, method: "charge_separately" as const },
    { org_id: "org-4", org_name: "Mountain View Psychiatry", fee_percentage: 1.5, method: "charge_separately" as const },
    { org_id: "org-5", org_name: "Valley Psychiatric Group", fee_percentage: 1.0, method: "deduct_from_billing" as const },
];
