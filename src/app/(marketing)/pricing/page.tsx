/**
 * Pricing Page
 * Public page displaying subscription tiers and pricing
 * 
 * 4 Tiers: Normal, Pro, Elite, Managed Billing
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Check, Receipt, FileText, TrendingUp, Shield, Zap, Brain, Stethoscope, Building2 } from 'lucide-react';

// Feature lists for each tier
const NORMAL_FEATURES = [
    'AI-Powered Clinical Notes',
    'Smart SOAP Documentation',
    'Voice-to-Text AI Scribe',
    'Patient Management',
    'Appointment Calendar',
    'Telehealth Integration',
    'Clinical Templates Library',
    'Quick Phrases',
    'Geriatric Assessments',
    'Basic Analytics',
    'Email Support',
];

const PRO_FEATURES = [
    'Everything in Normal, plus:',
    'AI Medical Coding (CPT/ICD-10)',
    'AI Treatment Planning',
    'AI Diagnostic Assistant',
    'Advanced Analytics Dashboard',
    'Custom Report Builder',
    'Priority Email Support',
];

const ELITE_FEATURES = [
    'Everything in Pro, plus:',
    'E-Prescribe Integration',
    'EHR Integration Hub',
    'API Access',
    'Custom Integrations',
    'Dedicated Account Manager',
    'Priority Phone Support',
    'Custom Branding',
];

const MANAGED_BILLING_FEATURES = [
    'Automated Claims Generation',
    'Real-time Claim Validation',
    'Clearinghouse Integration',
    'ERA/835 Payment Processing',
    'Revenue Analytics Dashboard',
    'Denial Management & Appeals',
    'Monthly Financial Reports',
    'Dedicated Billing Specialist',
];

type TierCode = 'NORMAL' | 'PRO' | 'ELITE' | 'MANAGED_BILLING';

export default function PricingPage() {
    const router = useRouter();
    const [loading, setLoading] = useState<TierCode | null>(null);

    async function handleSelectPlan(tierCode: TierCode) {
        setLoading(tierCode);

        try {
            // For Managed Billing, redirect to contact
            if (tierCode === 'MANAGED_BILLING') {
                router.push('/contact?plan=managed-billing');
                return;
            }

            const priceIdMap: Record<string, string | undefined> = {
                NORMAL: process.env.NEXT_PUBLIC_STRIPE_NORMAL_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
                PRO: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
                ELITE: process.env.NEXT_PUBLIC_STRIPE_ELITE_PRICE_ID,
            };

            const priceId = priceIdMap[tierCode];

            const response = await fetch('/api/subscriptions/create-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tierCode, priceId }),
            });

            if (response.ok) {
                const { url } = await response.json();
                if (url) {
                    window.location.href = url;
                    return;
                }
            }

            // Fallback - redirect to signup
            router.push(`/signup?plan=${tierCode.toLowerCase()}`);
        } catch (error) {
            console.error('Checkout error:', error);
            router.push(`/signup?plan=${tierCode.toLowerCase()}`);
        } finally {
            setLoading(null);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
            {/* Header */}
            <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Link>
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-teal-500" />
                        <span className="font-bold text-xl text-slate-900 dark:text-white">ChartSpark</span>
                    </div>
                    <Link
                        href="/login"
                        className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                        Sign In
                    </Link>
                </div>
            </header>

            {/* Hero */}
            <section className="max-w-7xl mx-auto px-6 py-16 text-center">
                <div className="inline-flex items-center gap-2 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 px-4 py-2 rounded-full text-sm font-medium mb-6">
                    <Sparkles className="h-4 w-4" />
                    7-Day Free Trial • No Credit Card Required
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4">
                    Choose Your Plan
                </h1>
                <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    From solo practitioners to full billing operations. Find the perfect fit for your practice.
                </p>
            </section>

            {/* Pricing Cards - 4 Tiers */}
            <section className="max-w-7xl mx-auto px-6 pb-16">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Normal Tier */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col">
                        <div className="mb-6">
                            <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                <Stethoscope className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Normal</h3>
                            <p className="text-sm text-slate-500 mt-1">Essential clinical tools</p>
                        </div>
                        <div className="mb-6">
                            <span className="text-4xl font-black text-slate-900 dark:text-white">$99</span>
                            <span className="text-slate-500">/month</span>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                            {NORMAL_FEATURES.map((feature, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                                    <Check className="h-4 w-4 text-teal-500 mt-0.5 flex-shrink-0" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() => handleSelectPlan('NORMAL')}
                            disabled={loading === 'NORMAL'}
                            className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                        >
                            {loading === 'NORMAL' ? 'Loading...' : 'Start Free Trial'}
                        </button>
                    </div>

                    {/* Pro Tier */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-blue-500 p-6 flex flex-col relative">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">POPULAR</span>
                        </div>
                        <div className="mb-6">
                            <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mb-4">
                                <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Pro</h3>
                            <p className="text-sm text-slate-500 mt-1">AI-powered intelligence</p>
                        </div>
                        <div className="mb-6">
                            <span className="text-4xl font-black text-slate-900 dark:text-white">$149</span>
                            <span className="text-slate-500">/month</span>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                            {PRO_FEATURES.map((feature, index) => (
                                <li key={index} className={`flex items-start gap-2 text-sm ${index === 0 ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
                                    <Check className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() => handleSelectPlan('PRO')}
                            disabled={loading === 'PRO'}
                            className="w-full py-3 px-4 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50"
                        >
                            {loading === 'PRO' ? 'Loading...' : 'Start Free Trial'}
                        </button>
                    </div>

                    {/* Elite Tier */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col">
                        <div className="mb-6">
                            <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mb-4">
                                <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Elite</h3>
                            <p className="text-sm text-slate-500 mt-1">Full integration suite</p>
                        </div>
                        <div className="mb-6">
                            <span className="text-4xl font-black text-slate-900 dark:text-white">$199</span>
                            <span className="text-slate-500">/month</span>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                            {ELITE_FEATURES.map((feature, index) => (
                                <li key={index} className={`flex items-start gap-2 text-sm ${index === 0 ? 'text-purple-600 dark:text-purple-400 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
                                    <Check className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() => handleSelectPlan('ELITE')}
                            disabled={loading === 'ELITE'}
                            className="w-full py-3 px-4 bg-purple-500 text-white font-semibold rounded-xl hover:bg-purple-600 transition-colors disabled:opacity-50"
                        >
                            {loading === 'ELITE' ? 'Loading...' : 'Start Free Trial'}
                        </button>
                    </div>

                    {/* Managed Billing Tier */}
                    <div className="bg-gradient-to-br from-teal-600 to-emerald-600 rounded-2xl p-6 flex flex-col text-white">
                        <div className="mb-6">
                            <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                                <Receipt className="h-6 w-6 text-white" />
                            </div>
                            <h3 className="text-xl font-bold">Managed Billing</h3>
                            <p className="text-sm text-teal-100 mt-1">Full-service billing</p>
                        </div>
                        <div className="mb-6">
                            <span className="text-4xl font-black">$149</span>
                            <span className="text-teal-100">/mo</span>
                            <div className="text-sm text-teal-100 mt-1">+ 3% of collections</div>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                            {MANAGED_BILLING_FEATURES.map((feature, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm text-teal-50">
                                    <Check className="h-4 w-4 text-white mt-0.5 flex-shrink-0" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() => handleSelectPlan('MANAGED_BILLING')}
                            disabled={loading === 'MANAGED_BILLING'}
                            className="w-full py-3 px-4 bg-white text-teal-600 font-semibold rounded-xl hover:bg-teal-50 transition-colors disabled:opacity-50"
                        >
                            {loading === 'MANAGED_BILLING' ? 'Loading...' : 'Contact Sales'}
                        </button>
                    </div>
                </div>
            </section>

            {/* Feature Comparison Table */}
            <section className="max-w-7xl mx-auto px-6 pb-16">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-8">
                    Compare All Features
                </h2>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <th className="text-left p-4 font-semibold text-slate-900 dark:text-white">Feature</th>
                                    <th className="text-center p-4 font-semibold text-slate-600 dark:text-slate-400">Normal</th>
                                    <th className="text-center p-4 font-semibold text-blue-600">Pro</th>
                                    <th className="text-center p-4 font-semibold text-purple-600">Elite</th>
                                    <th className="text-center p-4 font-semibold text-teal-600">Managed Billing</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {[
                                    { name: 'AI Clinical Notes', normal: true, pro: true, elite: true, billing: false },
                                    { name: 'Voice-to-Text AI Scribe', normal: true, pro: true, elite: true, billing: false },
                                    { name: 'Patient Management', normal: true, pro: true, elite: true, billing: false },
                                    { name: 'Appointment Calendar', normal: true, pro: true, elite: true, billing: false },
                                    { name: 'Telehealth', normal: true, pro: true, elite: true, billing: false },
                                    { name: 'Clinical Templates', normal: true, pro: true, elite: true, billing: false },
                                    { name: 'AI Medical Coding', normal: false, pro: true, elite: true, billing: false },
                                    { name: 'AI Treatment Planning', normal: false, pro: true, elite: true, billing: false },
                                    { name: 'AI Diagnostic Assistant', normal: false, pro: true, elite: true, billing: false },
                                    { name: 'Advanced Analytics', normal: false, pro: true, elite: true, billing: false },
                                    { name: 'E-Prescribe Integration', normal: false, pro: false, elite: true, billing: false },
                                    { name: 'EHR Integration', normal: false, pro: false, elite: true, billing: false },
                                    { name: 'API Access', normal: false, pro: false, elite: true, billing: false },
                                    { name: 'Claims Generation', normal: false, pro: false, elite: false, billing: true },
                                    { name: 'Claim Validation', normal: false, pro: false, elite: false, billing: true },
                                    { name: 'ERA Processing', normal: false, pro: false, elite: false, billing: true },
                                    { name: 'Clearinghouse Integration', normal: false, pro: false, elite: false, billing: true },
                                    { name: 'Revenue Dashboard', normal: false, pro: false, elite: false, billing: true },
                                    { name: 'Denial Management', normal: false, pro: false, elite: false, billing: true },
                                ].map((feature, index) => (
                                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="p-4 text-sm text-slate-700 dark:text-slate-300">{feature.name}</td>
                                        <td className="p-4 text-center">
                                            {feature.normal ? (
                                                <Check className="h-5 w-5 text-teal-500 mx-auto" />
                                            ) : (
                                                <span className="text-slate-300 dark:text-slate-600">—</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            {feature.pro ? (
                                                <Check className="h-5 w-5 text-blue-500 mx-auto" />
                                            ) : (
                                                <span className="text-slate-300 dark:text-slate-600">—</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            {feature.elite ? (
                                                <Check className="h-5 w-5 text-purple-500 mx-auto" />
                                            ) : (
                                                <span className="text-slate-300 dark:text-slate-600">—</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            {feature.billing ? (
                                                <Check className="h-5 w-5 text-teal-500 mx-auto" />
                                            ) : (
                                                <span className="text-slate-300 dark:text-slate-600">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Team Pricing */}
            <section className="max-w-4xl mx-auto px-6 pb-16">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-8 text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">
                        Team & Enterprise Plans
                    </h2>
                    <p className="text-slate-300 mb-6">
                        Special pricing for practices with multiple providers.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-6">
                        <div className="bg-white/10 rounded-xl p-4">
                            <div className="text-white font-bold">Team (2-5 users)</div>
                            <div className="text-slate-300">Starting at $399/mo</div>
                        </div>
                        <div className="bg-white/10 rounded-xl p-4">
                            <div className="text-white font-bold">Team (6-10 users)</div>
                            <div className="text-slate-300">Starting at $699/mo</div>
                        </div>
                    </div>
                    <Link
                        href="/contact"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition-colors"
                    >
                        Contact Sales
                    </Link>
                </div>
            </section>

            {/* FAQ */}
            <section className="max-w-3xl mx-auto px-6 pb-16">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-8">
                    Frequently Asked Questions
                </h2>
                <div className="space-y-4">
                    {[
                        {
                            q: 'Can I switch plans anytime?',
                            a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately with prorated billing.',
                        },
                        {
                            q: 'What happens when my trial ends?',
                            a: 'Your account enters read-only mode. You can still view your data but cannot create new records. Choose a plan to restore full access.',
                        },
                        {
                            q: 'Can I combine Managed Billing with other plans?',
                            a: 'Yes! Managed Billing can be added to any plan. Contact our sales team to set up a custom bundle.',
                        },
                        {
                            q: 'Is my data secure?',
                            a: 'Absolutely. ChartSpark is fully HIPAA compliant with enterprise-grade encryption, audit logging, and secure infrastructure.',
                        },
                        {
                            q: 'Do you offer discounts for annual billing?',
                            a: 'Yes! Annual plans receive a 20% discount. Contact us for details.',
                        },
                    ].map((faq, index) => (
                        <div key={index} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{faq.q}</h3>
                            <p className="text-slate-600 dark:text-slate-400">{faq.a}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-200 dark:border-slate-800 py-8">
                <div className="max-w-7xl mx-auto px-6 text-center text-slate-500 dark:text-slate-400 text-sm">
                    © {new Date().getFullYear()} ChartSpark. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
