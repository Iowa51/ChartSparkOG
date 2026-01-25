/**
 * Error Boundary and Error Display Components
 */

'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <ErrorDisplay
                    title="Something went wrong"
                    message={this.state.error?.message || 'An unexpected error occurred'}
                    onRetry={() => this.setState({ hasError: false })}
                />
            );
        }

        return this.props.children;
    }
}

interface ErrorDisplayProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
    showHomeLink?: boolean;
}

export function ErrorDisplay({
    title = 'Error',
    message = 'Something went wrong. Please try again.',
    onRetry,
    showHomeLink = true,
}: ErrorDisplayProps) {
    return (
        <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h2>
                <p className="text-slate-500 mb-6">{message}</p>
                <div className="flex items-center justify-center gap-3">
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Try Again
                        </button>
                    )}
                    {showHomeLink && (
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                            <Home className="h-4 w-4" />
                            Go Home
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            {icon && (
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                    {icon}
                </div>
            )}
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{title}</h3>
            {description && (
                <p className="text-slate-500 max-w-sm mb-4">{description}</p>
            )}
            {action && (
                <button
                    onClick={action.onClick}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}
