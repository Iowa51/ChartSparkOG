/**
 * Pricing Card Component
 * Displays a subscription tier with features and CTA
 * 
 * NOTE: This is a NEW component.
 */

'use client';

import { Check, Sparkles, Crown } from 'lucide-react';

interface PricingCardProps {
    tierCode: 'STARTER' | 'ELITE';
    name: string;
    price: number; // in dollars
    description: string;
    features: string[];
    highlighted?: boolean;
    currentTier?: boolean;
    onSelect: () => void;
    loading?: boolean;
}

export function PricingCard({
    tierCode,
    name,
    price,
    description,
    features,
    highlighted = false,
    currentTier = false,
    onSelect,
    loading = false,
}: PricingCardProps) {
    const Icon = tierCode === 'ELITE' ? Crown : Sparkles;

    return (
        <div className={`
      relative flex flex-col rounded-2xl border-2 p-8 transition-all
      ${highlighted
                ? 'border-teal-500 bg-gradient-to-br from-teal-50 to-white dark:from-teal-950/30 dark:to-slate-900 shadow-xl shadow-teal-500/10'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
            }
    `}>
            {/* Popular badge */}
            {highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-teal-500 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
                        Most Popular
                    </span>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className={`
          w-12 h-12 rounded-xl flex items-center justify-center
          ${highlighted
                        ? 'bg-teal-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }
        `}>
                    <Icon className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
                </div>
            </div>

            {/* Price */}
            <div className="mb-6">
                <span className="text-4xl font-black text-slate-900 dark:text-white">${price}</span>
                <span className="text-slate-500 dark:text-slate-400">/month</span>
            </div>

            {/* Features */}
            <ul className="flex-1 space-y-3 mb-8">
                {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                        <Check className={`h-5 w-5 mt-0.5 flex-shrink-0 ${highlighted ? 'text-teal-500' : 'text-slate-400'}`} />
                        <span className="text-slate-700 dark:text-slate-300 text-sm">{feature}</span>
                    </li>
                ))}
            </ul>

            {/* CTA */}
            <button
                onClick={onSelect}
                disabled={currentTier || loading}
                className={`
          w-full py-3 px-6 rounded-xl font-semibold transition-all
          ${currentTier
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                        : highlighted
                            ? 'bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/20'
                            : 'bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900'
                    }
          ${loading ? 'opacity-75 cursor-wait' : ''}
        `}
            >
                {loading ? 'Loading...' : currentTier ? 'Current Plan' : 'Get Started'}
            </button>
        </div>
    );
}

/**
 * Pricing comparison table for features
 */
interface PricingComparisonProps {
    features: {
        name: string;
        starter: boolean | string;
        elite: boolean | string;
    }[];
}

export function PricingComparison({ features }: PricingComparisonProps) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
                <thead>
                    <tr>
                        <th className="text-left py-4 px-4 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-medium">
                            Feature
                        </th>
                        <th className="text-center py-4 px-4 border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold">
                            Starter
                        </th>
                        <th className="text-center py-4 px-4 border-b border-slate-200 dark:border-slate-700 text-teal-600 dark:text-teal-400 font-semibold">
                            Elite
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {features.map((feature, index) => (
                        <tr key={index} className="border-b border-slate-100 dark:border-slate-800">
                            <td className="py-4 px-4 text-slate-700 dark:text-slate-300">{feature.name}</td>
                            <td className="py-4 px-4 text-center">
                                {feature.starter === true ? (
                                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                                ) : feature.starter === false ? (
                                    <span className="text-slate-300 dark:text-slate-600">—</span>
                                ) : (
                                    <span className="text-slate-600 dark:text-slate-400">{feature.starter}</span>
                                )}
                            </td>
                            <td className="py-4 px-4 text-center">
                                {feature.elite === true ? (
                                    <Check className="h-5 w-5 text-teal-500 mx-auto" />
                                ) : feature.elite === false ? (
                                    <span className="text-slate-300 dark:text-slate-600">—</span>
                                ) : (
                                    <span className="text-teal-600 dark:text-teal-400 font-medium">{feature.elite}</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
