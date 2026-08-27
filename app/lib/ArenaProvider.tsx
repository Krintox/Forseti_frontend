'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { API_BASE, WS_URL, api } from './api';
import type { ArenaEvent, ArenaState, CampaignResult, RoundResult } from './types';

/**
 * Single shared connection to the backend event stream.
 *
 * Every page reads from here, so navigating between pages never drops the live
 * battle. Crucially, ALL animation state is derived from events the backend
 * actually emitted - there is no client-side scripted timeline.
 */

interface ArenaContextValue {
  connected: boolean;
  state: ArenaState | null;
  events: ArenaEvent[];
  latest: ArenaEvent | null;
  activeEdge: { source: string | null; target: string | null; label: string; severity: string } | null;
  exposure: number;
  ceiling: number;
  headroom: number;
  utilization: number;
  railTotals: Record<string, number>;
  currentStep: number;
  totalSteps: number;
  strategy: string | null;
  isRunning: boolean;
  lastRound: RoundResult | null;
  winner: 'RED' | 'BLUE' | 'NONE' | null;
  speed: number;
  setSpeed: (s: number) => void;
  refreshState: () => Promise<void>;
  runRound: (round: number, dtlEnabled: boolean, strategy?: string | null) => Promise<void>;
  runBackendCampaign: (roundNumbers?: number[] | null) => Promise<CampaignResult | null>;
  reset: (limit?: number) => Promise<void>;
  setLimit: (limit: number) => Promise<void>;
  lastError: string | null;
  clearEvents: () => void;
  loadReplay: (events: ArenaEvent[]) => void;
}

const ArenaContext = createContext<ArenaContextValue | null>(null);

const RAIL_KEYS: Record<string, string> = {
  CARD_TOKEN: 'CARD_TOKEN',
  UPI_CIRCLE: 'UPI_CIRCLE',
  AGENTIC_AP2: 'AGENTIC_AP2',
};

export function ArenaProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<ArenaState | null>(null);
  const [events, setEvents] = useState<ArenaEvent[]>([]);
  const [lastRound, setLastRound] = useState<RoundResult | null>(null);
  const [speed, setSpeed] = useState(1.0);
  const [isRunning, setIsRunning] = useState(false);
  // A ceiling the operator just applied. Event history carries the ceiling that
  // was in force WHEN each event fired, so without this a fresh manual change
  // was immediately overwritten by stale values from earlier rounds.
  const [manualCeiling, setManualCeiling] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Incoming frames are BUFFERED and flushed once per animation frame.
  //
  // This used to call setEvents() once per WebSocket message. That is fine for
  // a single round, and it breaks under a campaign: the backend emits ~700
  // events, they arrive in bursts, and React counts a burst of updates
  // originating from the same tick as nested re-renders. Past the limit it logs
  // "Maximum update depth exceeded" and bails out of the update - so the event
  // log and the flow canvas silently stop tracking the very demo they exist to
  // show. It reproduced only under a full 17-vector run, which is why every
  // single-round check was clean.
  //
  // Batching collapses a burst into one state update. Nothing is dropped; the
  // frames are held in a ref, which does not trigger renders, until the flush.
  const pendingRef = useRef<ArenaEvent[]>([]);
  const flushRef = useRef<number | null>(null);

  const flushEvents = useCallback(() => {
    flushRef.current = null;
    const batch = pendingRef.current;
    if (!batch.length) return;
    pendingRef.current = [];
    setEvents((prev) => {
      const next = prev.concat(batch);
      // Keep the buffer bounded so a long demo cannot grow without limit.
      return next.length > 600 ? next.slice(next.length - 600) : next;
    });
  }, []);

  const pushEvent = useCallback(
    (evt: ArenaEvent) => {
      // Guarantee a stable unique React key even if a frame arrives without an
      // event_id. Two keyless frames previously collided as duplicate keys.
      const safe: ArenaEvent = evt.event_id
        ? evt
        : {
            ...evt,
            event_id: `local_${Date.now()}_${pendingRef.current.length}_${Math.random()
              .toString(36)
              .slice(2, 8)}`,
          };
      pendingRef.current.push(safe);
      if (flushRef.current === null) {
        // A FIXED interval, not requestAnimationFrame.
        //
        // rAF still fires up to 60x/second, which under a full campaign is
        // enough setEvents calls for React to declare a runaway update. A
        // 100 ms flush hard-caps this at 10 state updates per second no matter
        // how fast the backend emits, and the arena is paced in hundreds of
        // milliseconds, so nothing about the demo looks different.
        flushRef.current = setTimeout(flushEvents, 100) as unknown as number;
      }
    },
    [flushEvents],
  );

  // Never leave buffered frames behind on unmount.
  useEffect(
    () => () => {
      if (flushRef.current !== null) clearTimeout(flushRef.current);
    },
    [],
  );

  // ---- websocket lifecycle -------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!cancelled) setConnected(true);
        };

        ws.onmessage = (msg) => {
          try {
            const data = JSON.parse(msg.data);
            if (data.event_type === 'PONG') return;
            if (data.event_type === 'CONNECTED') {
              if (data.payload) setState(data.payload as ArenaState);
              return;
            }
            pushEvent(data as ArenaEvent);
          } catch {
            /* ignore malformed frames */
          }
        };

        ws.onclose = () => {
          if (cancelled) return;
          setConnected(false);
          retryRef.current = setTimeout(connect, 2000);
        };

        ws.onerror = () => ws.close();
      } catch {
        retryRef.current = setTimeout(connect, 2500);
      }
    };

    connect();
    return () => {
      cancelled = true;
      if (retryRef.current) clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [pushEvent]);

  const refreshState = useCallback(async () => {
    try {
      setState(await api.state());
    } catch {
      /* backend may be restarting; the socket will reconnect */
    }
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  // ---- derived live values -------------------------------------------------
  const latest = events.length ? events[events.length - 1] : null;

  const derived = useMemo(() => {
    let exposure = state?.authority_state?.total_exposure_global ?? 0;
    let ceiling = state?.authority_state?.global_budget_ceiling ?? 10000;
    let strategy: string | null = null;
    let currentStep = 0;
    let totalSteps = 0;
    let winner: 'RED' | 'BLUE' | 'NONE' | null = null;
    const railTotals: Record<string, number> = {
      CARD_TOKEN: 0,
      UPI_CIRCLE: 0,
      AGENTIC_AP2: 0,
    };

    for (const e of events) {
      const p = e.payload || {};
      if (e.event_type === 'ROUND_STARTED') {
        strategy = p.strategy ?? strategy;
        totalSteps = p.planned_steps ?? totalSteps;
        if (typeof p.delegated_ceiling === 'number') ceiling = p.delegated_ceiling;
        // A new round resets the per-rail tally.
        railTotals.CARD_TOKEN = 0;
        railTotals.UPI_CIRCLE = 0;
        railTotals.AGENTIC_AP2 = 0;
        winner = null;
      }
      if (e.event_type === 'ATTACK_STARTED') {
        strategy = p.strategy ?? strategy;
        if (typeof p.delegated_ceiling === 'number') ceiling = p.delegated_ceiling;
      }
      if (e.event_type === 'ATTACK_STEP') {
        currentStep = p.step ?? currentStep;
        totalSteps = p.of ?? totalSteps;
      }
      if (e.event_type === 'RAIL_APPROVED' && p.rail && RAIL_KEYS[p.rail]) {
        railTotals[p.rail] += Number(p.amount ?? 0);
      }
      if (e.event_type === 'DTL_EXPOSURE_UPDATED') {
        if (typeof p.exposure_after === 'number') exposure = p.exposure_after;
        if (typeof p.ceiling === 'number') ceiling = p.ceiling;
      }
      if (e.event_type === 'ATTACK_COMPLETE') {
        winner = (p.winner as 'RED' | 'BLUE' | 'NONE') ?? null;
        if (typeof p.final_exposure === 'number') exposure = p.final_exposure;
      }
    }

    // An operator-applied ceiling wins over the ceiling recorded in event
    // history. runRound() clears it when a new round starts, so no extra guard
    // is needed here - and guarding on "a round has been seen" was wrong,
    // because a PAST round leaves ROUND_STARTED in the buffer permanently.
    if (manualCeiling !== null) ceiling = manualCeiling;

    const headroom = Math.max(0, ceiling - exposure);
    const utilization = ceiling > 0 ? (exposure / ceiling) * 100 : 0;
    return { exposure, ceiling, headroom, utilization, railTotals, strategy, currentStep, totalSteps, winner };
  }, [events, state, manualCeiling]);

  // The edge currently "lit up" in the flow diagram.
  //
  // Lifecycle events (ROUND_STARTED, ATTACK_COMPLETE) carry no source/target.
  // Rather than blanking the diagram on those, we hold the most recent edge
  // that actually described a movement, so the picture stays continuous while
  // still only ever showing something the backend emitted.
  const activeEdge = useMemo(() => {
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i];
      if (e.source && e.target) {
        return {
          source: e.source,
          target: e.target,
          label: e.arrow_label,
          severity: e.severity,
          eventId: e.event_id,
        };
      }
    }
    return null;
  }, [events]);

  // ---- actions -------------------------------------------------------------
  const runRound = useCallback(
    async (round: number, dtlEnabled: boolean, strategy?: string | null) => {
      setIsRunning(true);
      setManualCeiling(null);
      setLastError(null);
      try {
        const result = await api.runRound({
          round_number: round,
          dtl_enabled: dtlEnabled,
          speed,
          strategy: strategy ?? null,
        });
        setLastRound(result);
        await refreshState();
      } catch (e: any) {
        // A dropped request must not become an unhandled rejection.
        setLastError(`Attack request failed: ${e?.message ?? e}`);
      } finally {
        setIsRunning(false);
      }
    },
    [speed, refreshState],
  );

  // Runs a server-orchestrated sequence of rounds in ONE call - the way to
  // demonstrate the Blue escalation ladder (Module 5), which needs the SAME
  // invariant to fire multiple times this session. The multi-vector campaign
  // in ArenaControls loops runRound() client-side over DIFFERENT strategies;
  // this is the complementary case (same strategy, repeated), and every
  // event still streams over the same WebSocket in real time either way.
  const runBackendCampaign = useCallback(
    async (roundNumbers?: number[] | null) => {
      setIsRunning(true);
      setManualCeiling(null);
      setLastError(null);
      try {
        const result = await api.runCampaign({ round_numbers: roundNumbers ?? null, dtl_enabled: true, speed });
        if (result.rounds.length) setLastRound(result.rounds[result.rounds.length - 1]);
        await refreshState();
        return result;
      } catch (e: any) {
        setLastError(`Campaign request failed: ${e?.message ?? e}`);
        return null;
      } finally {
        setIsRunning(false);
      }
    },
    [speed, refreshState],
  );

  const reset = useCallback(
    async (limit?: number) => {
      try {
        await api.reset(limit);
        setEvents([]);
        setLastRound(null);
        setManualCeiling(limit ?? null);
        await refreshState();
      } catch (e: any) {
        setLastError(`Reset failed: ${e?.message ?? e}`);
      }
    },
    [refreshState],
  );

  const setLimit = useCallback(async (limit: number) => {
    try {
      const next = await api.setLimit(limit);
      setState(next);
      setManualCeiling(limit);
      setLastError(null);
    } catch (e: any) {
      setLastError(`Could not apply the limit: ${e?.message ?? e}`);
    }
  }, []);

  const clearEvents = useCallback(() => setEvents([]), []);
  const loadReplay = useCallback((evts: ArenaEvent[]) => setEvents(evts), []);

  const value: ArenaContextValue = {
    connected,
    state,
    events,
    latest,
    activeEdge,
    ...derived,
    isRunning: isRunning || Boolean(state?.is_running),
    lastRound,
    speed,
    setSpeed,
    lastError,
    refreshState,
    runRound,
    runBackendCampaign,
    reset,
    setLimit,
    clearEvents,
    loadReplay,
  };

  return <ArenaContext.Provider value={value}>{children}</ArenaContext.Provider>;
}

export function useArena(): ArenaContextValue {
  const ctx = useContext(ArenaContext);
  if (!ctx) throw new Error('useArena must be used inside <ArenaProvider>');
  return ctx;
}

export { API_BASE };
