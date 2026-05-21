import { useEffect, useState } from "react";
import type { Tick } from "../types/types";

const HEARTBEAT_INTERVAL_MS = 5000;
const RECONNECT_DELAY_MS = 2000;

export function useTicker(symbol: string) {
  const [latestTick, setLatestTick] = useState<Tick | null>(null);

  // Derived-state reset: when the symbol changes, immediately null out the
  // stale tick during render — before any effects run. Without this, the old
  // symbol's last tick gets passed into useCandles for the new symbol, which
  // seeds a candle with the wrong price.
  const [prevSymbol, setPrevSymbol] = useState(symbol);
  if (prevSymbol !== symbol) {
    setPrevSymbol(symbol);
    setLatestTick(null);
  }

  useEffect(() => {
    if (!symbol) return;

    // `cancelled` is set to true in cleanup — every async callback checks this
    // before doing anything, so no stale socket from a previous symbol can
    // ever call setLatestTick after the symbol changes.
    let cancelled = false;
    let socket: WebSocket | null = null;
    let heartbeatId: ReturnType<typeof setInterval> | null = null;
    let reconnectId: ReturnType<typeof setTimeout> | null = null;

    const base = (import.meta.env?.VITE_API_URL ?? "http://localhost:8001")
      .replace(/^http/, "ws");
    const url = `${base}/ws/ticks/${symbol.toUpperCase()}`;

    function connect() {
      if (cancelled) return;

      socket = new WebSocket(url);

      socket.onopen = () => {
        // Ping every 5s to keep the connection alive
        heartbeatId = setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send("ping");
          }
        }, HEARTBEAT_INTERVAL_MS);
      };

      socket.onmessage = (event) => {
        if (cancelled) return;
        try {
          setLatestTick(JSON.parse(event.data));
        } catch (err) {
          console.error("useTicker parse error:", err);
        }
      };

      socket.onclose = () => {
        // Stop the heartbeat for this socket
        if (heartbeatId) { clearInterval(heartbeatId); heartbeatId = null; }
        // Reconnect — but only if this hook is still live (symbol hasn't changed)
        if (!cancelled) {
          reconnectId = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };

      socket.onerror = () => {
        // Let onclose handle reconnection
        socket?.close();
      };
    }

    connect();

    return () => {
      // Mark as dead FIRST — any in-flight callbacks will see this and bail
      cancelled = true;
      if (heartbeatId) clearInterval(heartbeatId);
      if (reconnectId) clearTimeout(reconnectId);
      if (socket) {
        // Null out onclose BEFORE closing so the close event doesn't
        // trigger a reconnect to the old symbol
        socket.onclose = null;
        socket.close();
      }
    };
  }, [symbol]);

  return latestTick;
}
