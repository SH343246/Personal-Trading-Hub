const baseURL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "http://localhost:8000/api" : "/api");



export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    if (!url.startsWith("http")) url = baseURL + url;
  let accessToken = localStorage.getItem("access_token");
  const refreshToken = localStorage.getItem("refresh_token");

  const res1 = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: accessToken ? `Bearer ${accessToken}` : "" },
  });
  if (res1.status !== 401 || !refreshToken) return res1;

  const refreshRes = await fetch(`${baseURL}/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!refreshRes.ok) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/login";
    return res1;
  }

  const data = await refreshRes.json();
  accessToken = data.access_token;
  localStorage.setItem("access_token", accessToken as string);

  return fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${accessToken}` },
  });
}
