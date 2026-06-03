export const API = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
const TOKEN_KEY = "bw_token";

export function getToken()        { return localStorage.getItem(TOKEN_KEY); }
export function saveToken(token)  { localStorage.setItem(TOKEN_KEY, token); }
export function clearToken()      { localStorage.removeItem(TOKEN_KEY); }
export function hasToken()        { return !!getToken(); }

function authHeaders() {
  const t = getToken();
  return t ? { Authorization: "Bearer " + t } : {};
}

export async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...(opts.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function getStatsOverview()       { return apiFetch("/stats/overview"); }
export async function getRecentActivity(limit = 8) { return apiFetch(`/progress/recent?limit=${limit}`); }

export async function postProgress(payload) {
  if (!hasToken()) return null;
  try { return await apiFetch("/progress", { method: "POST", body: JSON.stringify(payload) }); }
  catch (e) { console.warn("progress save failed:", e.message); return null; }
}

export async function submitAssessment(type, score, totalQuestions) {
  if (!hasToken()) return null;
  try { return await apiFetch("/assessment", { method: "POST", body: JSON.stringify({ type, score, totalQuestions }) }); }
  catch (e) { console.warn("assessment save failed:", e.message); return null; }
}

export async function getAssessmentResults() {
  if (!hasToken()) return null;
  try { return await apiFetch("/assessment/me"); }
  catch (e) { return null; }
}
