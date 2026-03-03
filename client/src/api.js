// All communication with the server lives here.
// Base URL is empty string in production (same origin),
// and proxied via Vite in local dev.

const BASE = '';

function getToken() {
  return localStorage.getItem('vld_token');
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  };
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function login(username, password) {
  const res = await fetch(`${BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  localStorage.setItem('vld_token', data.token);
  localStorage.setItem('vld_user', JSON.stringify({ username: data.username, is_admin: data.is_admin }));
  return data;
}

export function logout() {
  localStorage.removeItem('vld_token');
  localStorage.removeItem('vld_user');
}

export function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('vld_user')); }
  catch { return null; }
}

// ─── Save ────────────────────────────────────────────────────────────────────

export async function loadSave() {
  const res = await fetch(`${BASE}/api/save`, { headers: authHeaders() });
  if (res.status === 401) { logout(); throw new Error('Session expired'); }
  return res.json(); // null if no save
}

export async function writeSave(payload) {
  await fetch(`${BASE}/api/save`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function deleteSave() {
  await fetch(`${BASE}/api/save`, { method: 'DELETE', headers: authHeaders() });
}

// ─── NPC States ──────────────────────────────────────────────────────────────

// Load all NPC states for the current player
export async function loadNpcStates() {
  const res = await fetch(`${BASE}/api/npc-states`, { headers: authHeaders() });
  if (res.status === 401) { logout(); throw new Error('Session expired'); }
  if (!res.ok) return {};
  return res.json(); // { npcId: { relationship, interactionCount, memory, teachingProgress, flags } }
}

// Persist NPC state changes after a GM response
// changes: [{ npcId, relationshipDelta, memorySummary, teachingProgress, flags, day }]
export async function updateNpcStates(changes, day = 1) {
  if (!changes || changes.length === 0) return;
  const enriched = changes.map(c => ({ ...c, day }));
  await fetch(`${BASE}/api/npc-states`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ changes: enriched }),
  });
}

// ─── GM ──────────────────────────────────────────────────────────────────────

// Build a reduced NPC context to send with GM calls
// Sends top 15 most relevant NPC states (most interactions + current location)
function buildNpcContext(npcStates, currentLocation) {
  if (!npcStates || Object.keys(npcStates).length === 0) return {};

  const sorted = Object.entries(npcStates)
    .sort(([, a], [, b]) => (b.interactionCount || 0) - (a.interactionCount || 0))
    .slice(0, 15);

  const result = {};
  for (const [id, state] of sorted) {
    result[id] = state;
  }
  return result;
}

export async function sendToGM(character, messages, npcStates = {}) {
  const npcContext = buildNpcContext(npcStates, character.location);
  const res = await fetch(`${BASE}/api/gm`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ character, messages, npcContext }),
  });
  if (res.status === 401) { logout(); throw new Error('Session expired'); }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'GM error');
  return data.parsed;
}

// ─── Fast Travel ─────────────────────────────────────────────────────────────

// Attempt fast travel. Returns { encounter, parsed? } or { encounter: false, stateChanges, travelDescription }
export async function fastTravel(fromLocation, toLocation, character, messages) {
  const res = await fetch(`${BASE}/api/fast-travel`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ fromLocation, toLocation, character, messages }),
  });
  if (res.status === 401) { logout(); throw new Error('Session expired'); }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Fast travel error');
  return data;
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export async function adminListUsers() {
  const res = await fetch(`${BASE}/api/admin/users`, { headers: authHeaders() });
  return res.json();
}

export async function adminCreateUser(username, password) {
  const res = await fetch(`${BASE}/api/admin/users`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function adminDeleteUser(id) {
  const res = await fetch(`${BASE}/api/admin/users/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function adminResetPassword(id, password) {
  const res = await fetch(`${BASE}/api/admin/users/${id}/password`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function adminResetSave(id) {
  const res = await fetch(`${BASE}/api/admin/users/${id}/save`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return res.json();
}
