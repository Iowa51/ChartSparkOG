'use client';

// src/components/security/SessionTimeout.tsx
// SEC-015: Session timeout component with warning and logout

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface SessionTimeoutProps {
    timeoutMs?: number;      // Total timeout (default 15 min)
    warningMs?: number;      // Warning before timeout (default 2 min)
    onTimeout?: () => void;  // Custom timeout handler
}

export function SessionTimeout({
    timeoutMs = 15 * 60 * 1000,  // 15 minutes
    warningMs = 2 * 60 * 1000,   // 2 minutes warning
    onTimeout,
}: SessionTimeoutProps) {
    const router = useRouter();
    const [showWarning, setShowWarning] = useState(false);
    const [remainingTime, setRemainingTime] = useState(0);
    const [lastActivity, setLastActivity] = useState(Date.now());

    // Reset timer on user activity
    const resetTimer = useCallback(() => {
        setLastActivity(Date.now());
        setShowWarning(false);
    }, []);

    // Handle logout
    const handleLogout = useCallback(async () => {
        try {
            await fetch('/api/auth/signout', { method: 'POST' });
        } catch {
            // Ignore errors
        }
        if (onTimeout) {
            onTimeout();
        } else {
            router.push('/login?reason=session_expired');
        }
    }, [router, onTimeout]);

    // Track user activity
    useEffect(() => {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

        events.forEach(event => {
            window.addEventListener(event, resetTimer, { passive: true });
        });

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [resetTimer]);

    // Check for timeout
    useEffect(() => {
        const checkInterval = setInterval(() => {
            const elapsed = Date.now() - lastActivity;
            const remaining = timeoutMs - elapsed;

            if (remaining <= 0) {
                handleLogout();
                return;
            }

            if (remaining <= warningMs && !showWarning) {
                setShowWarning(true);
            }

            if (showWarning) {
                setRemainingTime(Math.ceil(remaining / 1000));
            }
        }, 1000);

        return () => clearInterval(checkInterval);
    }, [lastActivity, timeoutMs, warningMs, showWarning, handleLogout]);

    // Keep session alive button
    const handleKeepAlive = () => {
        resetTimer();
        // Optionally ping server to keep session alive
        fetch('/api/auth/check-lockout', { method: 'GET' }).catch(() => { });
    };

    if (!showWarning) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md mx-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Session Expiring
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Your session will expire in <strong>{remainingTime} seconds</strong> due to inactivity.
                    Would you like to stay logged in?
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={handleKeepAlive}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        Stay Logged In
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        Log Out
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SessionTimeout;
