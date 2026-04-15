"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CurrentUserProfile = {
    fullName: string;
    initials: string;
    subtitle: string;
};

const DEFAULT_PROFILE: CurrentUserProfile = {
    fullName: "Your Account",
    initials: "U",
    subtitle: "Active Session",
};

function buildInitials(firstName?: string | null, lastName?: string | null, email?: string | null): string {
    const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.trim();
    if (initials) return initials.toUpperCase();
    if (email?.[0]) return email[0].toUpperCase();
    return DEFAULT_PROFILE.initials;
}

function buildFullName(firstName?: string | null, lastName?: string | null, email?: string | null): string {
    const fullName = `${firstName ?? ""} ${lastName ?? ""}`.trim();
    return fullName || email || DEFAULT_PROFILE.fullName;
}

export function useCurrentUserProfile() {
    const [profile, setProfile] = useState<CurrentUserProfile>(DEFAULT_PROFILE);

    useEffect(() => {
        let isCancelled = false;

        async function loadProfile() {
            const supabase = createClient();
            if (!supabase) return;

            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser || isCancelled) return;

            const { data: userProfile } = await supabase
                .from("users")
                .select("first_name, last_name, email")
                .eq("id", authUser.id)
                .maybeSingle();

            const resolvedProfile = userProfile ?? (await supabase
                .from("profiles")
                .select("first_name, last_name")
                .eq("id", authUser.id)
                .maybeSingle()).data;

            if (isCancelled) return;

            setProfile({
                fullName: buildFullName(
                    resolvedProfile?.first_name,
                    resolvedProfile?.last_name,
                    userProfile?.email ?? authUser.email
                ),
                initials: buildInitials(
                    resolvedProfile?.first_name,
                    resolvedProfile?.last_name,
                    userProfile?.email ?? authUser.email
                ),
                subtitle: authUser.email || DEFAULT_PROFILE.subtitle,
            });
        }

        loadProfile();

        return () => {
            isCancelled = true;
        };
    }, []);

    return profile;
}
