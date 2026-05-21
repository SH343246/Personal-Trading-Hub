import { useEffect, useRef, useState } from "react";
import type { Tick } from "../types/types";
const HEARTBEAT_INTERVAL_MS = 5000;

export function useTicker(symbol: string) {
  const [latestTick, setLatestTick] = useState<Tick | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    if (!symbol) return;

    const url = `ws://localhost:8000/ws/ticks/${symbol.toUpperCase()}`;
    let socket: WebSocket | null = new WebSocket(url);
    socketRef.current = socket;
    socket.onmessage = (event) => { // Get messages
      try {
        const parsed = JSON.parse(event.data); 
        setLatestTick(parsed);
      } catch (err) {
        console.error("error:", err);
      }
    };

    const heartbeatId = setInterval(() => {
      if (!socket) return;

      if (socket?.readyState === WebSocket.OPEN) { // 1, open
        socket.send("ping");
      }
    socket.onclose = () => {
    try { socket = new WebSocket(url) } catch {console.error("WebSocket reconnect failed");
    }
    socketRef.current = socket
    socket!.onmessage = (event) => {
  try { setLatestTick(JSON.parse(event.data)) } catch (err) { console.error(err) }
}

    }

    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      clearInterval(heartbeatId);// stop timer
     const s = socketRef.current
    if (s && s.readyState === WebSocket.OPEN) {
      s.close()
}

      socketRef.current = null;
    };
  }, [symbol]);

  return latestTick;
}
