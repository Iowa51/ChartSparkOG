'use client';

import { useState, useCallback, useRef } from 'react';

/**
 * Optimistic Update Hook
 * Immediately updates UI while syncing with server, with automatic rollback on error
 *
 * OPTIMIZATION: Reduces perceived latency by 200-500ms on mutations
 *
 * @example
 * ```tsx
 * const { data, update, isUpdating, error } = useOptimisticUpdate(
 *   initialPatients,
 *   async (patients) => {
 *     await fetch('/api/patients', { method: 'PUT', body: JSON.stringify(patients) });
 *     return patients;
 *   }
 * );
 *
 * // Optimistically update a patient
 * update(patients => patients.map(p =>
 *   p.id === patientId ? { ...p, name: newName } : p
 * ));
 * ```
 */
export function useOptimisticUpdate<T>(
    initialData: T,
    syncFn: (data: T) => Promise<T>
) {
    const [data, setData] = useState<T>(initialData);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Keep track of the last confirmed server state
    const confirmedDataRef = useRef<T>(initialData);

    const update = useCallback(
        async (updater: (current: T) => T) => {
            // Store the previous state for potential rollback
            const previousData = data;

            // Optimistically update the UI immediately
            const optimisticData = updater(data);
            setData(optimisticData);
            setError(null);
            setIsUpdating(true);

            try {
                // Sync with server
                const serverData = await syncFn(optimisticData);

                // Update confirmed state
                confirmedDataRef.current = serverData;
                setData(serverData);

                return { success: true, data: serverData };
            } catch (err) {
                // Rollback on error
                setData(previousData);
                const error = err instanceof Error ? err : new Error('Update failed');
                setError(error);

                return { success: false, error };
            } finally {
                setIsUpdating(false);
            }
        },
        [data, syncFn]
    );

    // Force refresh from server
    const refresh = useCallback(async () => {
        setIsUpdating(true);
        try {
            const serverData = await syncFn(confirmedDataRef.current);
            confirmedDataRef.current = serverData;
            setData(serverData);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Refresh failed'));
        } finally {
            setIsUpdating(false);
        }
    }, [syncFn]);

    // Reset to initial state
    const reset = useCallback(() => {
        setData(initialData);
        confirmedDataRef.current = initialData;
        setError(null);
    }, [initialData]);

    return {
        data,
        update,
        refresh,
        reset,
        isUpdating,
        error,
        // Expose whether local state differs from confirmed server state
        isDirty: data !== confirmedDataRef.current,
    };
}

/**
 * Simpler optimistic update for single item mutations
 *
 * @example
 * ```tsx
 * const { mutate, isLoading } = useOptimisticMutation(
 *   async (patientId: string, updates: Partial<Patient>) => {
 *     const res = await fetch(`/api/patients/${patientId}`, {
 *       method: 'PATCH',
 *       body: JSON.stringify(updates)
 *     });
 *     return res.json();
 *   },
 *   {
 *     onMutate: (patientId, updates) => {
 *       // Optimistically update cache
 *       updatePatientInCache(patientId, updates);
 *     },
 *     onError: (error, patientId, updates) => {
 *       // Rollback cache
 *       revertPatientInCache(patientId);
 *     }
 *   }
 * );
 * ```
 */
export function useOptimisticMutation<TArgs extends unknown[], TResult>(
    mutationFn: (...args: TArgs) => Promise<TResult>,
    options?: {
        onMutate?: (...args: TArgs) => void | (() => void);
        onSuccess?: (result: TResult, ...args: TArgs) => void;
        onError?: (error: Error, ...args: TArgs) => void;
        onSettled?: (...args: TArgs) => void;
    }
) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutate = useCallback(
        async (...args: TArgs) => {
            setIsLoading(true);
            setError(null);

            // Call onMutate for optimistic update, get rollback function
            const rollback = options?.onMutate?.(...args);

            try {
                const result = await mutationFn(...args);
                options?.onSuccess?.(result, ...args);
                return result;
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Mutation failed');
                setError(error);

                // Execute rollback if provided
                if (typeof rollback === 'function') {
                    rollback();
                }

                options?.onError?.(error, ...args);
                throw error;
            } finally {
                setIsLoading(false);
                options?.onSettled?.(...args);
            }
        },
        [mutationFn, options]
    );

    return {
        mutate,
        isLoading,
        error,
    };
}

export default useOptimisticUpdate;
