"use client";

import { useState, useMemo } from "react";
import {
    quickPhrases,
    getQuickPhraseCategories,
    searchQuickPhrases,
    QuickPhrase
} from "@/lib/demo-data/quick-phrases";
import {
    Zap,
    Search,
    X,
    Copy,
    Check,
    ChevronDown,
    Brain,
    AlertTriangle,
    Heart,
    FileText,
    Clock,
} from "lucide-react";

interface QuickPhrasePanelProps {
    specialty: 'mental_health' | 'geriatric' | 'both';
    onInsert: (content: string) => void;
    isOpen: boolean;
    onClose: () => void;
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    "Cognitive Assessment": Brain,
    "Fall Risk": AlertTriangle,
    "Depression Screening": Heart,
    "Functional Status": FileText,
    "Mental Status": Brain,
    "Safety Assessment": AlertTriangle,
    "Time Documentation": Clock,
};

export function QuickPhrasePanel({ specialty, onInsert, isOpen, onClose }: QuickPhrasePanelProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const categories = useMemo(() => getQuickPhraseCategories(), []);

    const filteredPhrases = useMemo(() => {
        let phrases = quickPhrases.filter(
            qp => qp.specialty === specialty || qp.specialty === 'both'
        );

        if (searchQuery) {
            phrases = searchQuickPhrases(searchQuery).filter(
                qp => qp.specialty === specialty || qp.specialty === 'both'
            );
        }

        if (selectedCategory) {
            phrases = phrases.filter(qp => qp.category === selectedCategory);
        }

        return phrases;
    }, [specialty, searchQuery, selectedCategory]);

    const handleInsert = (phrase: QuickPhrase) => {
        onInsert(phrase.content);
        setCopiedId(phrase.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-500" />
                    <h2 className="font-bold text-slate-900 dark:text-white">Quick Phrases</h2>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search phrases or type /shortcut..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                </div>
            </div>

            {/* Category Filter */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${selectedCategory === null
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                            }`}
                    >
                        All
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${selectedCategory === cat
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Phrase List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredPhrases.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No phrases found</p>
                    </div>
                ) : (
                    filteredPhrases.map((phrase) => {
                        const CategoryIcon = categoryIcons[phrase.category] || FileText;

                        return (
                            <div
                                key={phrase.id}
                                className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <CategoryIcon className="h-4 w-4 text-slate-400" />
                                        <span className="font-medium text-sm text-slate-900 dark:text-white">
                                            {phrase.label}
                                        </span>
                                    </div>
                                    <code className="text-xs text-amber-600 dark:text-amber-400 font-mono bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                                        {phrase.shortcut}
                                    </code>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                                    {phrase.content.slice(0, 100)}...
                                </p>
                                <button
                                    onClick={() => handleInsert(phrase)}
                                    className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${copiedId === phrase.id
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 hover:bg-amber-200'
                                        }`}
                                >
                                    {copiedId === phrase.id ? (
                                        <>
                                            <Check className="h-3 w-3" />
                                            Inserted!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-3 w-3" />
                                            Insert into Note
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer Tip */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                <p className="text-xs text-slate-500">
                    <strong>Tip:</strong> Type a shortcut like <code className="text-amber-600">/mmse</code> in your note
                    to quickly insert a phrase.
                </p>
            </div>
        </div>
    );
}

// Button to open the panel
export function QuickPhraseButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-2 px-3 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-400 rounded-xl text-sm font-medium transition-colors"
        >
            <Zap className="h-4 w-4" />
            Quick Phrases
        </button>
    );
}
