/**
 * API client module.
 * Detects whether running locally (via SWA CLI on port 4280) or in production
 * and routes all fetch calls accordingly — no CORS config needed.
 */

const BASE = location.hostname === 'localhost' ? 'http://localhost:4280' : '';

/**
 * Core fetch wrapper — throws on non-ok responses.
 * @param {string} path  - Path starting with /api/
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${options.method || 'GET'} ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Recipes ────────────────────────────────────────────────────────────────

export const recipes = {
  /**
   * List / search recipes.
   * @param {{ q?: string, tags?: string, ingredient?: string, limit?: number, offset?: number }} [params]
   */
  list(params = {}) {
    const url = new URL(`${BASE}/api/recipes`);
    Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
    return apiFetch(url.pathname + url.search);
  },

  /** @param {string} id */
  get(id) {
    return apiFetch(`/api/recipes/${encodeURIComponent(id)}`);
  },

  /** @param {object} data */
  create(data) {
    return apiFetch('/api/recipes', { method: 'POST', body: JSON.stringify(data) });
  },

  /**
   * @param {string} id
   * @param {object} data
   */
  update(id, data) {
    return apiFetch(`/api/recipes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /** @param {string} id */
  delete(id) {
    return apiFetch(`/api/recipes/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};

// ── Plans ──────────────────────────────────────────────────────────────────

export const plans = {
  /**
   * Load the weekly plan for a given week-start (ISO date string).
   * Returns null on 404 (no plan saved yet for that week).
   * @param {string} weekStart  YYYY-MM-DD
   */
  async get(weekStart) {
    try {
      return await apiFetch(`/api/plans/${encodeURIComponent(weekStart)}`);
    } catch (err) {
      if (err.message.includes('404')) return null;
      throw err;
    }
  },

  /**
   * Upsert the full weekly plan.
   * @param {string} weekStart  YYYY-MM-DD
   * @param {object} data
   */
  upsert(weekStart, data) {
    return apiFetch(`/api/plans/${encodeURIComponent(weekStart)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /** @param {string} weekStart  YYYY-MM-DD */
  delete(weekStart) {
    return apiFetch(`/api/plans/${encodeURIComponent(weekStart)}`, { method: 'DELETE' });
  },

  /**
   * Fetch the generated shopping list for a week.
   * @param {string} weekStart  YYYY-MM-DD
   */
  shoppingList(weekStart) {
    return apiFetch(`/api/plans/${encodeURIComponent(weekStart)}/shopping-list`);
  },
};

// ── Health ─────────────────────────────────────────────────────────────────

export function health() {
  return apiFetch('/api/health');
}
