import { mockSignals } from "@/mock/data";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  let closed = false;
  let interval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      // Safe send helper with guard
      const sendEvent = (data: Record<string, unknown>) => {
        if (closed) return;
        try {
          const payload = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Controller closed or invalid state — stop streaming
          cleanup();
        }
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        try {
          controller.close();
        } catch {
          // Already closed, ignore
        }
      };

      // Listen for client disconnect
      request.signal.addEventListener("abort", cleanup);

      // Send initial connection event
      sendEvent({
        type: "connected",
        timestamp: new Date().toISOString(),
      });

      let heartbeatCount = 0;
      let signalIndex = 0;
      const maxIterations = 100; // prevent infinite loop

      interval = setInterval(() => {
        if (closed) return;

        heartbeatCount++;
        if (heartbeatCount >= maxIterations) {
          cleanup();
          return;
        }

        // Send heartbeat every tick
        sendEvent({
          type: "heartbeat",
          timestamp: new Date().toISOString(),
        });

        // Every 2nd tick (~30s), send a mock signal event
        if (heartbeatCount % 2 === 0) {
          const signal = mockSignals[signalIndex % mockSignals.length];
          signalIndex++;
          sendEvent({
            type: "signal.created",
            data: {
              id: signal.id,
              source: signal.source,
              sourceTitle: signal.sourceTitle,
              contentType: signal.contentType,
              relevanceScore: signal.relevanceScore,
              peptidesMentioned: signal.peptidesMentioned,
              detectedAt: new Date().toISOString(),
            },
            timestamp: new Date().toISOString(),
          });
        }
      }, 15000);
    },

    cancel() {
      // Called when stream is cancelled by consumer
      closed = true;
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}