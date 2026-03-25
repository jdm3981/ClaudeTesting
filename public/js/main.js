/**
 * Planner page entry point.
 * Wires the header controls and initialises the grid.
 */

import { buildPlanner } from './planner.js';
import { getWeekLabel, nextWeek, prevWeek } from './state.js';
import { recipes as recipesApi } from './api.js';

// ── Week label ─────────────────────────────────────────────────────────────

function updateWeekLabel() {
  document.getElementById('week-label').textContent = getWeekLabel();
}

// ── Week navigation ────────────────────────────────────────────────────────

function refreshPlanner() {
  updateWeekLabel();
  recipesApi.list({ limit: 50 })
    .then(recipeList => buildPlanner(recipeList))
    .catch(() => buildPlanner([]));
}

document.getElementById('btn-prev-week').addEventListener('click', () => {
  prevWeek();
  refreshPlanner();
});

document.getElementById('btn-next-week').addEventListener('click', () => {
  nextWeek();
  refreshPlanner();
});

// ── Search modal (Phase 1 placeholder) ────────────────────────────────────

const searchModal = document.getElementById('searchModal');

document.getElementById('btn-search').addEventListener('click', () => {
  searchModal.classList.add('show');
});
document.getElementById('modal-close-btn').addEventListener('click', () => {
  searchModal.classList.remove('show');
});
searchModal.addEventListener('click', e => {
  if (e.target === searchModal) searchModal.classList.remove('show');
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') searchModal.classList.remove('show');
});

// ── Highlight active nav link ──────────────────────────────────────────────

document.querySelector(`.nav-link[href="${location.pathname}"]`)
  ?.classList.add('active');

// ── Init ───────────────────────────────────────────────────────────────────

updateWeekLabel();

// Load recipes from API; fall back to empty grid if API is unavailable.
recipesApi.list({ limit: 50 })
  .then(recipeList => buildPlanner(recipeList))
  .catch(() => buildPlanner([]));
