// Demo organizations data for admin dashboard
import { Organization } from "@/types/database";

export const demoOrganizations: (Organization & {
    users_count: number;
    notes_count: number;
    billing_total: number;
    fees_total: number;
})[] = [
        {
            id: "org-1",
            name: "Wellness Psychiatry Associates",
            slug: "wellness-psychiatry",
            subscription_tier: "complete",
            subscription_status: "active",
            platform_fee_percentage: 1.0,
            fee_collection_method: "charge_separately",
            created_at: "2024-01-15T10:00:00Z",
            updated_at: "2024-12-01T10:00:00Z",
            users_count: 5,
            notes_count: 234,
            billing_total: 34125.00,
            fees_total: 341.25,
        },
        {
            id: "org-2",
            name: "Coastal Mental Health",
            slug: "coastal-mental",
            subscription_tier: "pro",
            subscription_status: "active",
            platform_fee_percentage: 1.0,
            fee_collection_method: "deduct_from_billing",
            created_at: "2024-02-20T10:00:00Z",
            updated_at: "2024-11-15T10:00:00Z",
            users_count: 8,
            notes_count: 412,
            billing_total: 59740.00,
            fees_total: 597.40,
        },
        {
            id: "org-3",
            name: "Sunrise Behavioral Health",
            slug: "sunrise-behavioral",
            subscription_tier: "complete",
            subscription_status: "active",
            platform_fee_percentage: 0.75,
            fee_collection_method: "charge_separately",
            created_at: "2024-03-10T10:00:00Z",
            updated_at: "2024-12-10T10:00:00Z",
            users_count: 6,
            notes_count: 287,
            billing_total: 41615.00,
            fees_total: 416.15,
        },
        {
            id: "org-4",
            name: "Mountain View Psychiatry",
            slug: "mountain-view",
            subscription_tier: "starter",
            subscription_status: "active",
            platform_fee_percentage: 1.5,
            fee_collection_method: "charge_separately",
            created_at: "2024-04-05T10:00:00Z",
            updated_at: "2024-10-20T10:00:00Z",
            users_count: 4,
            notes_count: 198,
            billing_total: 28710.00,
            fees_total: 287.10,
        },
        {
            id: "org-5",
            name: "Valley Psychiatric Group",
            slug: "valley-psychiatric",
            subscription_tier: "pro",
            subscription_status: "trial",
            platform_fee_percentage: 1.0,
            fee_collection_method: "deduct_from_billing",
            created_at: "2024-11-01T10:00:00Z",
            updated_at: "2024-12-15T10:00:00Z",
            users_count: 7,
            notes_count: 356,
            billing_total: 51620.00,
            fees_total: 516.20,
        },
    ];

export function getOrganizationById(id: string) {
    return demoOrganizations.find((org) => org.id === id);
}
