export const API = "http://localhost:4000/api";

const TOKEN_KEY = "aol_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function hasToken() {
  return !!getToken();
}

function authHeaders() {
  const t = getToken();
  return t ? { Authorization: "Bearer " + t } : {};
}

export async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function getQuestions(gameId, type) {
  const rows = await apiFetch(`/questions/${encodeURIComponent(gameId)}/${encodeURIComponent(type)}`);
  return rows.map((r) => r.payload);
}

export async function getStatsOverview() {
  return apiFetch("/stats/overview");
}

export async function getGames() {
  return apiFetch("/games");
}

export async function getRecentActivity(limit = 8) {
  return apiFetch(`/progress/recent?limit=${encodeURIComponent(limit)}`);
}

export async function postProgress(payload) {
  if (!hasToken()) return null;
  try {
    return await apiFetch("/progress", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.warn("progress save failed:", e.message);
    return null;
  }
}
