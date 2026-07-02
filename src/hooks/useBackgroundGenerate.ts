"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseBackgroundGenerateOptions<T> {
  /** Pass true when the parent already has data from SSR; skips auto-start. */
  hasInitialData: boolean;
  /** When false, generation waits for an explicit startGenerate() call. Default true. */
  autoStart?: boolean;
  /** POST endpoint, e.g. "/api/generate/summary" */
  apiPath: string;
  /** Called when the API rejects a focus topic as off-document. */
  onOffTopic?: () => void;
  /** Request body — object is serialised to JSON on each call */
  body: Record<string, unknown>;
  /**
   * Queries Supabase (or any source) for the generated result.
   * Used as a fallback when the POST request fails or times out.
   * Return null/undefined/empty-array to indicate "not ready yet".
   */
  pollFn: () => Promise<T | null | undefined>;
  /** Called once when data is available */
  onResult: (data: T) => void;
}

interface UseBackgroundGenerateReturn {
  /** True while waiting for data (either direct response or fallback polling) */
  isPolling: boolean;
  /**
   * True after the request fails and fallback polling exceeds MAX_ATTEMPTS —
   * lets the component show a manual retry button.
   */
  timedOut: boolean;
  /**
   * Fire the POST and await the response directly.
   * Falls back to Supabase polling only if the request fails or returns an error.
   * Safe to call multiple times — cancels any in-flight operation first.
   */
  startGenerate: (overrideBody?: Record<string, unknown>) => void;
}

const POLL_INTERVAL_MS = 3_000;
const MAX_ATTEMPTS = 20; // 60 s fallback total

export function useBackgroundGenerate<T>({
  hasInitialData,
  autoStart = true,
  apiPath,
  body,
  pollFn,
  onResult,
  onOffTopic,
}: UseBackgroundGenerateOptions<T>): UseBackgroundGenerateReturn {
  const [isPolling, setIsPolling] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const attemptsRef = useRef(0);

  const pollFnRef = useRef(pollFn);
  const onResultRef = useRef(onResult);
  const onOffTopicRef = useRef(onOffTopic);
  const bodyRef = useRef(body);
  const apiPathRef = useRef(apiPath);

  pollFnRef.current = pollFn;
  onResultRef.current = onResult;
  onOffTopicRef.current = onOffTopic;
  bodyRef.current = body;
  apiPathRef.current = apiPath;

  const stopAll = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsPolling(false);
  }, []);

  /** Fallback: poll Supabase when the direct POST fails or times out. */
  const startFallbackPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    attemptsRef.current = 0;

    intervalRef.current = setInterval(async () => {
      attemptsRef.current += 1;

      if (attemptsRef.current > MAX_ATTEMPTS) {
        stopAll();
        setTimedOut(true);
        return;
      }

      try {
        const result = await pollFnRef.current();
        const hasResult =
          result !== null &&
          result !== undefined &&
          !(Array.isArray(result) && result.length === 0);

        if (hasResult) {
          stopAll();
          onResultRef.current(result as T);
        }
      } catch {
        // Network hiccup — keep polling silently
      }
    }, POLL_INTERVAL_MS);
  }, [stopAll]);

  const startGenerate = useCallback((overrideBody?: Record<string, unknown>) => {
    stopAll();
    setTimedOut(false);
    setIsPolling(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const requestBody = { ...bodyRef.current, ...overrideBody };

    // Await the POST response directly — the route returns the full result,
    // so we get the data as soon as generation completes without any poll delay.
    fetch(apiPathRef.current, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (res.status === 422) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          stopAll();
          if (data.error === "off_topic") {
            onOffTopicRef.current?.();
          }
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: T = await res.json();
        const hasResult =
          data !== null &&
          data !== undefined &&
          !(Array.isArray(data) && data.length === 0);
        if (!hasResult) throw new Error("Empty response");
        stopAll();
        onResultRef.current(data);
      })
      .catch((err) => {
        // If we aborted intentionally (e.g. user retried), do nothing.
        if (err instanceof Error && err.name === "AbortError") return;
        // Otherwise fall back to polling Supabase in case the POST succeeded
        // server-side but the connection dropped before the response arrived.
        startFallbackPolling();
      });
  }, [stopAll, startFallbackPolling]);

  // Auto-start on mount when there is no pre-fetched data
  useEffect(() => {
    if (autoStart && !hasInitialData) {
      startGenerate();
    }
    return () => {
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally mount-only

  return { isPolling, timedOut, startGenerate };
}
