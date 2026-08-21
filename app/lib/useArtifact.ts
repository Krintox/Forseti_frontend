'use client';

import { useCallback, useEffect, useState } from 'react';

/** Loads a REST artifact once, exposing loading/error state honestly. */
export function useArtifact<T>(loader: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loader());
    } catch (e: any) {
      // Free-tier hosting (Render et al.) can bounce a request during its own
      // routing warm-up right after a cold start, before the origin is fully
      // registered - a transient edge failure, not an application error. One
      // short-delayed retry absorbs exactly that window instead of leaving a
      // judge's first click on a page permanently showing "request failed".
      try {
        await new Promise((r) => setTimeout(r, 1500));
        setData(await loader());
      } catch (e2: any) {
        setError(e2?.message ?? e?.message ?? 'Request failed');
      }
    } finally {
      setLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    run();
  }, [run]);

  return { data, loading, error, reload: run };
}
