'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { enrollMFA, verifyMFA, getMFAFactors, unenrollMFA, hasMFAEnabled } from '@/lib/auth/mfa';
import {
    ArrowLeft,
    Shield,
    ShieldCheck,
    ShieldOff,
    Smartphone,
    Copy,
    Check,
    Loader2,
    AlertTriangle,
} from 'lucide-react';

export default function MFASettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [enrolling, setEnrolling] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [factors, setFactors] = useState<any[]>([]);

    // Enrollment state
    const [showEnrollment, setShowEnrollment] = useState(false);
    const [qrCode, setQrCode] = useState('');
    const [secret, setSecret] = useState('');
    const [factorId, setFactorId] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadMFAStatus();
    }, []);

    const loadMFAStatus = async () => {
        setLoading(true);
        try {
            const enabled = await hasMFAEnabled();
            setMfaEnabled(enabled);

            const factorList = await getMFAFactors();
            setFactors(factorList);
        } catch (err) {
            console.error('Error loading MFA status:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleStartEnrollment = async () => {
        setEnrolling(true);
        setError('');
        try {
            const result = await enrollMFA();
            setQrCode(result.qrCode);
            setSecret(result.secret);
            setFactorId(result.factorId);
            setShowEnrollment(true);
        } catch (err: any) {
            setError(err.message || 'Failed to start MFA enrollment');
        } finally {
            setEnrolling(false);
        }
    };

    const handleVerifyCode = async () => {
        if (verificationCode.length !== 6) {
            setError('Please enter a 6-digit code');
            return;
        }

        setVerifying(true);
        setError('');
        try {
            await verifyMFA(factorId, verificationCode);
            setShowEnrollment(false);
            setMfaEnabled(true);
            await loadMFAStatus();
        } catch (err: any) {
            setError(err.message || 'Invalid verification code');
        } finally {
            setVerifying(false);
        }
    };

    const handleDisableMFA = async (factorId: string) => {
        if (!confirm('Are you sure you want to disable two-factor authentication?')) {
            return;
        }

        try {
            await unenrollMFA(factorId);
            await loadMFAStatus();
        } catch (err: any) {
            setError(err.message || 'Failed to disable MFA');
        }
    };

    const copySecret = () => {
        navigator.clipboard.writeText(secret);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatSecret = (secret: string) => {
        // Format as XXXX-XXXX-XXXX-XXXX
        return secret.match(/.{1,4}/g)?.join('-') || secret;
    };

    if (loading) {
        return (
            <div className="flex-1 p-6 lg:p-8 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-slate-500">Loading security settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link
                    href="/settings"
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Two-Factor Authentication
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Secure your account with an authenticator app
                    </p>
                </div>
            </div>

            {/* Current Status */}
            <div className={`rounded-2xl p-6 mb-6 ${mfaEnabled
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                }`}>
                <div className="flex items-center gap-4">
                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${mfaEnabled
                            ? 'bg-emerald-100 dark:bg-emerald-900/50'
                            : 'bg-amber-100 dark:bg-amber-900/50'
                        }`}>
                        {mfaEnabled
                            ? <ShieldCheck className="h-7 w-7 text-emerald-600" />
                            : <ShieldOff className="h-7 w-7 text-amber-600" />
                        }
                    </div>
                    <div>
                        <h2 className={`text-lg font-bold ${mfaEnabled
                                ? 'text-emerald-900 dark:text-emerald-300'
                                : 'text-amber-900 dark:text-amber-300'
                            }`}>
                            {mfaEnabled ? 'MFA Enabled' : 'MFA Not Enabled'}
                        </h2>
                        <p className={`text-sm ${mfaEnabled
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-amber-700 dark:text-amber-400'
                            }`}>
                            {mfaEnabled
                                ? 'Your account is protected with two-factor authentication'
                                : 'Enable MFA to add an extra layer of security'
                            }
                        </p>
                    </div>
                </div>
            </div>

            {/* HIPAA Notice */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                        <p className="font-medium text-blue-900 dark:text-blue-300">HIPAA Security Requirement</p>
                        <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                            Multi-factor authentication is required for Admin and Super Admin accounts to protect patient health information.
                        </p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <p className="text-red-800 dark:text-red-300">{error}</p>
                    </div>
                </div>
            )}

            {/* Enrolled Factors */}
            {factors.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-4">Enrolled Authenticators</h3>
                    <div className="space-y-3">
                        {factors.map((factor) => (
                            <div
                                key={factor.id}
                                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl"
                            >
                                <div className="flex items-center gap-3">
                                    <Smartphone className="h-5 w-5 text-slate-500" />
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white">{factor.friendlyName}</p>
                                        <p className="text-xs text-slate-500">
                                            Added {new Date(factor.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDisableMFA(factor.id)}
                                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Enrollment Section */}
            {!showEnrollment && !mfaEnabled && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-2">Set Up Authenticator</h3>
                    <p className="text-slate-500 text-sm mb-6">
                        Use Google Authenticator, Microsoft Authenticator, Authy, or any TOTP-compatible app.
                    </p>
                    <button
                        onClick={handleStartEnrollment}
                        disabled={enrolling}
                        className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                        {enrolling ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Shield className="h-5 w-5" />
                        )}
                        {enrolling ? 'Setting up...' : 'Enable Two-Factor Authentication'}
                    </button>
                </div>
            )}

            {/* Enrollment Flow */}
            {showEnrollment && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                    {/* Step 1: QR Code */}
                    <div className="mb-8">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4">
                            Step 1: Scan QR Code
                        </h3>
                        <p className="text-slate-500 text-sm mb-4">
                            Scan this QR code with your authenticator app
                        </p>

                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                {qrCode && (
                                    <img
                                        src={qrCode}
                                        alt="MFA QR Code"
                                        className="w-48 h-48"
                                    />
                                )}
                            </div>

                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                    Supported apps:
                                </p>
                                <ul className="text-sm text-slate-500 space-y-1 mb-4">
                                    <li>• Google Authenticator</li>
                                    <li>• Microsoft Authenticator</li>
                                    <li>• Authy</li>
                                    <li>• 1Password</li>
                                </ul>

                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                    Can't scan? Enter this code manually:
                                </p>
                                <div className="flex items-center gap-2">
                                    <code className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-mono">
                                        {formatSecret(secret)}
                                    </code>
                                    <button
                                        onClick={copySecret}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                    >
                                        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-slate-400" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Verify */}
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4">
                            Step 2: Enter Verification Code
                        </h3>
                        <p className="text-slate-500 text-sm mb-4">
                            Enter the 6-digit code from your authenticator app
                        </p>

                        <div className="flex items-center gap-3">
                            <input
                                type="text"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000000"
                                maxLength={6}
                                className="w-40 px-4 py-3 text-center text-2xl font-mono tracking-widest bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                            <button
                                onClick={handleVerifyCode}
                                disabled={verifying || verificationCode.length !== 6}
                                className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                            >
                                {verifying && <Loader2 className="h-5 w-5 animate-spin" />}
                                {verifying ? 'Verifying...' : 'Verify and Enable'}
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowEnrollment(false)}
                        className="mt-6 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                        Cancel
                    </button>
                </div>
            )}
        </div>
    );
}
