"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface Props {
    changeId: string;
    userId: string;
    fieldName: string;
    newValue: string;
}

export function ProfileApprovalActions({ changeId, userId, fieldName, newValue }: Props) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [action, setAction] = useState<'approve' | 'reject' | null>(null);

    const handleAction = async (actionType: 'approve' | 'reject') => {
        setIsProcessing(true);
        setAction(actionType);

        try {
            const response = await fetch('/api/admin/profile-approvals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    changeId,
                    userId,
                    fieldName,
                    newValue,
                    action: actionType,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to process request');
            }

            // Refresh page to show updated list
            window.location.reload();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to process request';
            console.error('Error processing approval:', error);
            alert(message);
            setIsProcessing(false);
            setAction(null);
        }
    };

    return (
        <div className="flex items-center gap-2 flex-shrink-0">
            <button
                onClick={() => handleAction('approve')}
                disabled={isProcessing}
                className="flex items-center gap-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg text-sm font-medium transition-colors"
            >
                {isProcessing && action === 'approve' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <CheckCircle className="h-4 w-4" />
                )}
                Approve
            </button>
            <button
                onClick={() => handleAction('reject')}
                disabled={isProcessing}
                className="flex items-center gap-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg text-sm font-medium transition-colors"
            >
                {isProcessing && action === 'reject' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <XCircle className="h-4 w-4" />
                )}
                Reject
            </button>
        </div>
    );
}
