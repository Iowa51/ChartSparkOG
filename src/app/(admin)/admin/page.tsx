import { createClient } from "@/lib/supabase/server";
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";

export default async function AdminDashboard() {
    const supabase = await createClient();

    let stats = {
        totalUsers: 0,
        activeUsers: 0,
        notesThisMonth: 0,
        pendingSubmissions: 0,
        approvalRate: 0,
    };

    let recentSubmissions: any[] = [];
    let organizationId: string | null = null;

    if (supabase) {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Get admin's organization
                const { data: profile } = await supabase
                    .from('users')
                    .select('organization_id')
                    .eq('id', user.id)
                    .single();

                organizationId = profile?.organization_id;

                if (organizationId) {
                    // Get users count for this organization
                    const { count: userCount } = await supabase
                        .from('users')
                        .select('*', { count: 'exact', head: true })
                        .eq('organization_id', organizationId);
                    stats.totalUsers = userCount || 0;

                    const { count: activeCount } = await supabase
                        .from('users')
                        .select('*', { count: 'exact', head: true })
                        .eq('organization_id', organizationId)
                        .eq('is_active', true);
                    stats.activeUsers = activeCount || 0;

                    // Get pending submissions
                    const { count: pendingCount } = await supabase
                        .from('submissions')
                        .select('*', { count: 'exact', head: true })
                        .eq('organization_id', organizationId)
                        .in('status', ['pending_audit', 'pending_approval']);
                    stats.pendingSubmissions = pendingCount || 0;

                    // Get approved submissions for approval rate (rough estimate)
                    const { count: approvedCount } = await supabase
                        .from('submissions')
                        .select('*', { count: 'exact', head: true })
                        .eq('organization_id', organizationId)
                        .eq('status', 'approved');

                    const totalSubmissions = (approvedCount || 0) + (pendingCount || 0);
                    stats.approvalRate = totalSubmissions > 0
                        ? Math.round(((approvedCount || 0) / totalSubmissions) * 100)
                        : 0;

                    // Get recent submissions
                    const { data: subsData } = await supabase
                        .from('submissions')
                        .select(`
                            id,
                            cpt_code,
                            status,
                            billing_amount,
                            created_at,
                            patients(first_name, last_name),
                            users(first_name, last_name)
                        `)
                        .eq('organization_id', organizationId)
                        .order('created_at', { ascending: false })
                        .limit(20); // Get more so filtering is useful
                    recentSubmissions = subsData || [];
                }
            }
        } catch (e) {
            console.error("Error fetching admin stats:", e);
        }
    }

    return <AdminDashboardClient stats={stats} recentSubmissions={recentSubmissions} />;
}
