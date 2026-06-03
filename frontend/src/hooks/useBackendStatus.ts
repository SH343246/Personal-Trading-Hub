/**
 * useBackendStatus
 * ----------------
 * Pings /health every 20 seconds.
 * Returns "online" | "offline" | "checking".
 *
 * "checking"  — first request hasn't resolved yet
 * "online"    — last ping succeeded
 * "offline"   — last ping failed (network error or non-2xx)
 */

import { useState, useEffect } from "react";

const HEALTH_URL   = "http://localhost:8001/health";
const POLL_MS      = 20_000;
const TIMEOUT_MS   = 4_000;

export type BackendStatus = "checking" | "online" | "offline";

export function useBackendStatus(): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>("checking");

  useEffect(() => {
    let cancelled = false;

    async function ping() {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        const res = await fetch(HEALTH_URL, { signal: controller.signal });
        clearTimeout(timer);
        if (!cancelled) setStatus(res.ok ? "online" : "offline");
      } catch {
        if (!cancelled) setStatus("offline");
      }
    }

    ping();
    const id = setInterval(ping, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return status;
}
