'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
    SESSION_CONFIG,
    recordActivity,
    getLastActivity,
    clearSessionActivity,
    hasAbsoluteTimeoutExpired
} from '@/lib/auth/session';
import { Clock, LogOut, RefreshCw } from 'lucide-react';

interface SessionTimeoutProps {
    enabled?: boolean;
}

/**
 * Session timeout component that tracks user activity and shows warning before auto-logout
 * Mount this component at the app layout level
 */
export function SessionTimeout({ enabled = true }: SessionTimeoutProps) {
    const [showWarning, setShowWarning] = useState(false);
    const [countdown, setCountdown] = useState(120);
    const lastActivity = useRef(Date.now());
    const router = useRouter();

    const handleLogout = useCallback(async (reason: string) => {
        console.log('Session ending:', reason);
        clearSessionActivity();

        const supabase = createClient();
        if (supabase) {
            await supabase.auth.signOut();
        }

        // Redirect to login with message
        router.push(`/login?session_expired=${encodeURIComponent(reason)}`);
    }, [router]);

    const handleStayLoggedIn = useCallback(() => {
        lastActivity.current = Date.now();
        recordActivity();
        setShowWarning(false);
        setCountdown(Math.floor(SESSION_CONFIG.warningBefore / 1000));
    }, []);

    useEffect(() => {
        if (!enabled) return;

        // Initialize last activity
        lastActivity.current = getLastActivity();

        const checkActivity = setInterval(() => {
            const idle = Date.now() - lastActivity.current;

            // Check absolute timeout first
            if (hasAbsoluteTimeoutExpired()) {
                handleLogout('Maximum session duration reached (8 hours)');
                return;
            }

            // Check if within warning window
            const warningThreshold = SESSION_CONFIG.inactivityTimeout - SESSION_CONFIG.warningBefore;

            if (idle > warningThreshold && idle <= SESSION_CONFIG.inactivityTimeout) {
                if (!showWarning) {
                    setShowWarning(true);
                }
                const remaining = Math.floor((SESSION_CONFIG.inactivityTimeout - idle) / 1000);
                setCountdown(Math.max(0, remaining));
            }

            // Check if expired
            if (idle > SESSION_CONFIG.inactivityTimeout) {
                handleLogout('Session expired due to inactivity');
            }
        }, 1000);

        // Track user activity
        const trackActivity = () => {
            lastActivity.current = Date.now();
            recordActivity();
            if (showWarning) {
                setShowWarning(false);
                setCountdown(Math.floor(SESSION_CONFIG.warningBefore / 1000));
            }
        };

        // Activity events to track
        const events = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'];

        events.forEach(event => {
            window.addEventListener(event, trackActivity, { passive: true });
        });

        // Initial activity record
        recordActivity();

        return () => {
            clearInterval(checkActivity);
            events.forEach(event => {
                window.removeEventListener(event, trackActivity);
            });
        };
    }, [enabled, showWarning, handleLogout]);

    if (!enabled || !showWarning) {
        return null;
    }

    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <Clock className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            Session Expiring
                        </h2>
                        <p className="text-sm text-slate-500">
                            Security timeout due to inactivity
                        </p>
                    </div>
                </div>

                {/* Countdown */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 mb-6 text-center">
                    <p className="text-slate-600 dark:text-slate-400 mb-2">
                        You will be logged out in
                    </p>
                    <p className="text-4xl font-mono font-bold text-red-600 dark:text-red-400">
                        {minutes}:{seconds.toString().padStart(2, '0')}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                        HIPAA requires automatic logout after 15 minutes of inactivity
                    </p>
                </div>

                {/* Message */}
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
                    Click "Stay Logged In" to continue your session, or your work will be saved and you'll be redirected to the login page.
                </p>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={() => handleLogout('User chose to log out')}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        Log Out
                    </button>
                    <button
                        onClick={handleStayLoggedIn}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Stay Logged In
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SessionTimeout;
