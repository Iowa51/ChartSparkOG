/**
 * Skeleton Loading Components
 * Reusable skeletons for loading states
 */

import { cn } from "@/lib/utils";
import { CSSProperties } from "react";

interface SkeletonProps {
    className?: string;
    style?: CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-md bg-slate-200 dark:bg-slate-800",
                className
            )}
            style={style}
        />
    );
}

export function SkeletonCard() {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </div>
        </div>
    );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800">
                <Skeleton className="h-4 w-1/4" />
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="px-4 py-3 flex items-center gap-4">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <div className="flex-1 space-y-1">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-3 w-1/4" />
                        </div>
                        <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
    return (
        <div className={`grid grid-cols-${count} gap-4`}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <Skeleton className="h-3 w-20 mb-2" />
                    <Skeleton className="h-6 w-12" />
                </div>
            ))}
        </div>
    );
}

export function SkeletonChart() {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <Skeleton className="h-4 w-1/4 mb-4" />
            <div className="flex items-end gap-2 h-48">
                {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton
                        key={i}
                        className="flex-1"
                        style={{ height: `${Math.random() * 60 + 40}%` }}
                    />
                ))}
            </div>
        </div>
    );
}
