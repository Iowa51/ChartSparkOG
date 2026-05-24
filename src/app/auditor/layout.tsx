import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AuditorSidebarNav } from "./_components/auditor-sidebar-nav";
import { CSShell } from "@/components/cs";

// Force dynamic rendering - auditor pages need authentication at runtime
export const dynamic = 'force-dynamic';

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

    const initials = profile?.first_name
        ? `${profile.first_name[0] ?? ''}${profile?.last_name?.[0] ?? ''}`.toUpperCase()
        : (user?.email?.[0]?.toUpperCase() ?? 'A');

    return (
        <CSShell
            sidebar={
                <AuditorSidebarNav
                    displayName={displayName}
                    email={user?.email ?? ''}
                    initials={initials}
                />
            }
        >
            {children}
        </CSShell>
    );
}
