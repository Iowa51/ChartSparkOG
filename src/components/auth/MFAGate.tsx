"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { MFAChallengeModal } from "./MFAChallengeModal";

export function MFAGate() {
    const [needsMFA, setNeedsMFA] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    const checkMFA = useCallback(async () => {
        setIsChecking(true);

        try {
            const supabase = createClient();
            if (!supabase) {
                setNeedsMFA(false);
                return;
            }

            const {
                data: { session },
                error: sessionError,
            } = await supabase.auth.getSession();

            if (sessionError || !session?.user) {
                setNeedsMFA(false);
                return;
            }

            const { data, error } =
                await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

            if (error || !data) {
                setNeedsMFA(false);
                return;
            }

            setNeedsMFA(
                data.nextLevel === "aal2" && data.currentLevel !== "aal2"
            );
        } catch {
            setNeedsMFA(false);
        } finally {
            setIsChecking(false);
        }
    }, []);

    useEffect(() => {
        void checkMFA();

        const supabase = createClient();
        if (!supabase) {
            setIsChecking(false);
            return;
        }

        const { data: listener } = supabase.auth.onAuthStateChange(
            (_event: AuthChangeEvent, session: Session | null) => {
                if (!session?.user) {
                    setNeedsMFA(false);
                    setIsChecking(false);
                    return;
                }

                void checkMFA();
            }
        );

        return () => {
            listener.subscription.unsubscribe();
        };
    }, [checkMFA]);

    const handleVerified = () => {
        setNeedsMFA(false);

        if (typeof window !== "undefined") {
            window.location.reload();
        }
    };

    return (
        <MFAChallengeModal
            open={!isChecking && needsMFA}
            onVerified={handleVerified}
        />
    );
}

export default MFAGate;
