'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getAllGenerations,
  deleteGeneration,
  clearAllGenerations,
  getGenerationCount,
  getTotalCost,
  getLatestGenerationDate,
  type StoredGeneration,
} from '@/lib/storage/db';

export function useGenerations() {
  const [generations, setGenerations] = useState<StoredGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [latestDate, setLatestDate] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [gens, cnt, cost, date] = await Promise.all([
        getAllGenerations(),
        getGenerationCount(),
        getTotalCost(),
        getLatestGenerationDate(),
      ]);
      setGenerations(gens);
      setCount(cnt);
      setTotalCost(cost);
      setLatestDate(date);
    } catch (error) {
      console.error('Failed to load generations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remove = useCallback(
    async (id: number) => {
      await deleteGeneration(id);
      await refresh();
    },
    [refresh]
  );

  const clearAll = useCallback(async () => {
    await clearAllGenerations();
    await refresh();
  }, [refresh]);

  return { generations, loading, count, totalCost, latestDate, refresh, remove, clearAll };
}
