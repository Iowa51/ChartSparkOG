/**
 * Pricing Page
 * Public page displaying subscription tiers and pricing
 * 
 * NOTE: This is a NEW page.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PricingCard, PricingComparison } from '@/components/subscriptions';
import { ArrowLeft, Sparkles, Check } from 'lucide-react';

const STARTER_FEATURES = [
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
];

const ELITE_FEATURES = [
    'Everything in Starter, plus:',
    'AI Medical Coding (CPT/ICD-10)',
    'AI Treatment Planning',
    'AI Diagnostic Assistant',
    'Advanced Analytics Dashboard',
    'E-Prescribe Integration',
    'EHR Integration Hub',
    'API Access',
    'Priority Support',
    'Custom Integrations',
];

const COMPARISON_FEATURES = [
    { name: 'AI Clinical Notes', starter: true, elite: true },
    { name: 'Voice-to-Text AI Scribe', starter: true, elite: true },
    { name: 'Patient Management', starter: true, elite: true },
    { name: 'Appointment Calendar', starter: true, elite: true },
    { name: 'Telehealth', starter: true, elite: true },
    { name: 'Clinical Templates', starter: true, elite: true },
    { name: 'Quick Phrases', starter: true, elite: true },
    { name: 'Geriatric Tools', starter: true, elite: true },
    { name: 'AI Medical Coding', starter: false, elite: true },
    { name: 'AI Treatment Planning', starter: false, elite: true },
    { name: 'AI Diagnostic Assistant', starter: false, elite: true },
    { name: 'Advanced Analytics', starter: false, elite: true },
    { name: 'E-Prescribe', starter: false, elite: true },
    { name: 'EHR Integration', starter: false, elite: true },
    { name: 'API Access', starter: false, elite: true },
    { name: 'Support', starter: 'Standard', elite: 'Priority' },
];

export default function PricingPage() {
    const router = useRouter();
    const [loading, setLoading] = useState<'STARTER' | 'ELITE' | null>(null);

    async function handleSelectPlan(tierCode: 'STARTER' | 'ELITE') {
        setLoading(tierCode);

        try {
            // In production, this would create a checkout session
            // For now, redirect to signup with tier preselected
            const priceId = tierCode === 'STARTER'
                ? process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID
                : process.env.NEXT_PUBLIC_STRIPE_ELITE_PRICE_ID;

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
                    Simple, Transparent Pricing
                </h1>
                <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    Choose the plan that fits your practice. Upgrade or downgrade anytime.
                </p>
            </section>

            {/* Pricing Cards */}
            <section className="max-w-5xl mx-auto px-6 pb-16">
                <div className="grid md:grid-cols-2 gap-8">
                    <PricingCard
                        tierCode="STARTER"
                        name="Starter"
                        price={99}
                        description="Essential AI tools for your practice"
                        features={STARTER_FEATURES}
                        onSelect={() => handleSelectPlan('STARTER')}
                        loading={loading === 'STARTER'}
                    />
                    <PricingCard
                        tierCode="ELITE"
                        name="Elite"
                        price={199}
                        description="Advanced clinical intelligence"
                        features={ELITE_FEATURES}
                        highlighted
                        onSelect={() => handleSelectPlan('ELITE')}
                        loading={loading === 'ELITE'}
                    />
                </div>
            </section>

            {/* Feature Comparison */}
            <section className="max-w-4xl mx-auto px-6 pb-16">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-8">
                    Compare Plans
                </h2>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                    <PricingComparison features={COMPARISON_FEATURES} />
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
