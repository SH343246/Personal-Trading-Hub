/**
 * Central API configuration.
 *
 * In development:  set VITE_API_URL in frontend/.env  (defaults to localhost:8001)
 * In production:   set VITE_API_URL in your Vercel environment variables
 *
 * Every hook and component should import from here — never hardcode localhost.
 */

export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8001";

/** REST API root — e.g. http://localhost:8001/api */
export const API = `${API_BASE}/api`;

/** WebSocket base — ws:// or wss:// depending on env */
export const WS_BASE = API_BASE.replace(/^http/, "ws");
