// Demo users data for admin dashboard
import { User } from "@/types/database";

export const demoUsers: (User & {
    organization_name: string;
    notes_count: number;
    last_active: string;
})[] = [
        {
            id: "u1",
            email: "sarah.k@wellness-psychiatry.com",
            first_name: "Sarah",
            last_name: "Kim",
            role: "ADMIN",
            organization_id: "org-1",
            organization_name: "Wellness Psychiatry Associates",
            specialty: "Adult Psychiatry",
            custom_fee_percentage: undefined,
            created_at: "2024-01-15T10:00:00Z",
            updated_at: "2024-12-28T10:00:00Z",
            notes_count: 47,
            last_active: "2 hours ago",
        },
        {
            id: "u2",
            email: "michael.c@wellness-psychiatry.com",
            first_name: "Michael",
            last_name: "Chen",
            role: "USER",
            organization_id: "org-1",
            organization_name: "Wellness Psychiatry Associates",
            specialty: "Child & Adolescent Psychiatry",
            custom_fee_percentage: undefined,
            created_at: "2024-02-01T10:00:00Z",
            updated_at: "2024-12-27T10:00:00Z",
            notes_count: 62,
            last_active: "1 day ago",
        },
        {
            id: "u3",
            email: "lisa.p@coastal-mental.com",
            first_name: "Lisa",
            last_name: "Park",
            role: "ADMIN",
            organization_id: "org-2",
            organization_name: "Coastal Mental Health",
            specialty: "Geriatric Psychiatry",
            custom_fee_percentage: 0.5,
            created_at: "2024-02-20T10:00:00Z",
            updated_at: "2024-12-28T10:00:00Z",
            notes_count: 51,
            last_active: "5 hours ago",
        },
        {
            id: "u4",
            email: "jennifer.a@sunrise-behavioral.com",
            first_name: "Jennifer",
            last_name: "Adams",
            role: "USER",
            organization_id: "org-3",
            organization_name: "Sunrise Behavioral Health",
            specialty: "Psychiatric Mental Health NP",
            custom_fee_percentage: undefined,
            created_at: "2024-03-15T10:00:00Z",
            updated_at: "2024-12-26T10:00:00Z",
            notes_count: 38,
            last_active: "3 days ago",
        },
        {
            id: "u5",
            email: "david.w@mountain-view.com",
            first_name: "David",
            last_name: "Wilson",
            role: "ADMIN",
            organization_id: "org-4",
            organization_name: "Mountain View Psychiatry",
            specialty: "Addiction Psychiatry",
            custom_fee_percentage: undefined,
            created_at: "2024-04-10T10:00:00Z",
            updated_at: "2024-12-28T10:00:00Z",
            notes_count: 36,
            last_active: "30 minutes ago",
        },
        {
            id: "u6",
            email: "admin@chartspark.io",
            first_name: "Platform",
            last_name: "Admin",
            role: "SUPER_ADMIN",
            organization_id: "org-1",
            organization_name: "ChartSpark (Platform)",
            specialty: undefined,
            custom_fee_percentage: undefined,
            created_at: "2024-01-01T10:00:00Z",
            updated_at: "2024-12-28T10:00:00Z",
            notes_count: 0,
            last_active: "Just now",
        },
    ];

export function getUsersByOrganization(orgId: string) {
    return demoUsers.filter((user) => user.organization_id === orgId);
}

export function getUserById(id: string) {
    return demoUsers.find((user) => user.id === id);
}
