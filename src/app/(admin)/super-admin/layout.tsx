import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();

    // Check if user is logged in
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Check if user is super admin
    // Try to check from profiles table first
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    // If profiles table exists and has role
    if (profile && profile.role !== "SUPER_ADMIN") {
        redirect("/dashboard");
    }

    // If profiles table doesn't exist (or empty), check by email (temporary for demo)
    if (!profile && user.email !== "admin@chartspark.com") {
        redirect("/dashboard");
    }

    return <>{children}</>;
}
