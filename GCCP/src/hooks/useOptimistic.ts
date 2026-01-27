'use client';

import { useState, useCallback, useRef } from 'react';

/**
 * Optimistic UI state management hook
 * Allows showing immediate updates while background operations complete
 */

interface OptimisticState<T> {
    current: T;
    pending: T | null;
    isOptimistic: boolean;
}

type OptimisticUpdate<T> = (prev: T) => T;

export function useOptimisticState<T>(initialValue: T) {
    const [state, setState] = useState<OptimisticState<T>>({
        current: initialValue,
        pending: null,
        isOptimistic: false
    });

    const rollbackRef = useRef<T | null>(null);

    /**
     * Apply an optimistic update immediately
     * Store the original value for potential rollback
     */
    const optimisticUpdate = useCallback((update: OptimisticUpdate<T>) => {
        setState(prev => {
            const newValue = update(prev.current);
            rollbackRef.current = prev.current;
            return {
                current: newValue,
                pending: newValue,
                isOptimistic: true
            };
        });
    }, []);

    /**
     * Confirm the optimistic update succeeded
     * Clears the pending state
     */
    const confirm = useCallback((finalValue?: T) => {
        setState(prev => ({
            current: finalValue ?? prev.current,
            pending: null,
            isOptimistic: false
        }));
        rollbackRef.current = null;
    }, []);

    /**
     * Rollback to the previous value if operation failed
     */
    const rollback = useCallback(() => {
        if (rollbackRef.current !== null) {
            setState({
                current: rollbackRef.current,
                pending: null,
                isOptimistic: false
            });
            rollbackRef.current = null;
        }
    }, []);

    /**
     * Set the value directly (non-optimistic)
     */
    const set = useCallback((value: T) => {
        setState({
            current: value,
            pending: null,
            isOptimistic: false
        });
        rollbackRef.current = null;
    }, []);

    return {
        value: state.current,
        isOptimistic: state.isOptimistic,
        isPending: state.pending !== null,
        optimisticUpdate,
        confirm,
        rollback,
        set
    };
}

/**
 * Hook for optimistic list operations (add, remove, update)
 */
export function useOptimisticList<T extends { id: string | number }>(initialItems: T[] = []) {
    const { value, isOptimistic, optimisticUpdate, confirm, rollback, set } = useOptimisticState(initialItems);

    const addItem = useCallback((item: T) => {
        optimisticUpdate(items => [...items, item]);
    }, [optimisticUpdate]);

    const removeItem = useCallback((id: string | number) => {
        optimisticUpdate(items => items.filter(item => item.id !== id));
    }, [optimisticUpdate]);

    const updateItem = useCallback((id: string | number, updates: Partial<T>) => {
        optimisticUpdate(items =>
            items.map(item => item.id === id ? { ...item, ...updates } : item)
        );
    }, [optimisticUpdate]);

    return {
        items: value,
        isOptimistic,
        addItem,
        removeItem,
        updateItem,
        confirm,
        rollback,
        set
    };
}

/**
 * Simple optimistic action wrapper
 * Shows immediate feedback while async action completes
 */
export async function withOptimisticFeedback<T>(
    action: () => Promise<T>,
    onStart: () => void,
    onSuccess: (result: T) => void,
    onError: (error: Error) => void
): Promise<T | null> {
    onStart();
    try {
        const result = await action();
        onSuccess(result);
        return result;
    } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
        return null;
    }
}
