"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface SSEEvent<T = Record<string, unknown>> {
  id: string;
  type: string;
  data: T;
  timestamp: string;
}

interface UseSSEReturn<T> {
  events: SSEEvent<T>[];
  isConnected: boolean;
  error: Error | null;
  clearEvents: () => void;
}

export function useSSE<T = Record<string, unknown>>(
  url: string,
  eventTypes?: string[]
): UseSSEReturn<T> {
  const [events, setEvents] = useState<SSEEvent<T>[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  useEffect(() => {
    function connect() {
      try {
        const es = new EventSource(url);
        eventSourceRef.current = es;

        es.onopen = () => {
          setIsConnected(true);
          setError(null);
          retryCountRef.current = 0;
        };

        es.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data) as SSEEvent<T>;
            if (!eventTypes || eventTypes.includes(parsed.type)) {
              setEvents((prev) => [parsed, ...prev].slice(0, 100));
            }
          } catch {
            // Ignore non-JSON messages (heartbeats)
          }
        };

        // Listen for specific event types
        if (eventTypes) {
          for (const type of eventTypes) {
            es.addEventListener(type, (event) => {
              try {
                const data = JSON.parse((event as MessageEvent).data);
                const sseEvent: SSEEvent<T> = {
                  id: (event as MessageEvent).lastEventId || crypto.randomUUID(),
                  type,
                  data,
                  timestamp: new Date().toISOString(),
                };
                setEvents((prev) => [sseEvent, ...prev].slice(0, 100));
              } catch {
                // Ignore parse errors
              }
            });
          }
        }

        es.onerror = () => {
          setIsConnected(false);
          es.close();

          // Exponential backoff reconnection
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
          retryCountRef.current++;

          retryTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        };
      } catch (err) {
        setError(err instanceof Error ? err : new Error("SSE connection failed"));
        setIsConnected(false);
      }
    }

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [url, JSON.stringify(eventTypes)]);

  return { events, isConnected, error, clearEvents };
}
