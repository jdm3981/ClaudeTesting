/**
 * Planner page entry point.
 * Wires the header controls and initialises the grid.
 */

import { buildPlanner, appendCard } from './planner.js';
import { getWeekLabel, nextWeek, prevWeek } from './state.js';
import { recipes as recipesApi } from './api.js';
import { openSearchModal } from './search-modal.js';

// ── Week label ─────────────────────────────────────────────────────────────

function updateWeekLabel() {
  document.getElementById('week-label').textContent = getWeekLabel();
}

// ── Week navigation ────────────────────────────────────────────────────────

function onAddMeal(cell) {
  openSearchModal(cell, recipe => {
    appendCard(cell, {
      name:  recipe.name,
      emoji: recipe.emoji || '🍽',
      tag:   recipe.tags?.[0] ?? '',
    });
  });
}

function refreshPlanner() {
  updateWeekLabel();
  recipesApi.list({ limit: 50 })
    .then(recipeList => buildPlanner(recipeList, onAddMeal))
    .catch(() => buildPlanner([], onAddMeal));
}

document.getElementById('btn-prev-week').addEventListener('click', () => {
  prevWeek();
  refreshPlanner();
});

document.getElementById('btn-next-week').addEventListener('click', () => {
  nextWeek();
  refreshPlanner();
});

// ── Search modal ────────────────────────────────────────────────────────────
// Opened from the header "Search Recipes" button (no target cell — browse mode).
// Also opened from "+ Add meal" buttons via onAddMeal() above.

document.getElementById('btn-search').addEventListener('click', () => {
  // No specific cell — open in browse-only mode (onSelect is a no-op).
  openSearchModal(null, () => {});
});

// ── Highlight active nav link ──────────────────────────────────────────────

document.querySelector(`.nav-link[href="${location.pathname}"]`)
  ?.classList.add('active');

// ── Init ───────────────────────────────────────────────────────────────────

updateWeekLabel();

// Load recipes from API; fall back to empty grid if API is unavailable.
recipesApi.list({ limit: 50 })
  .then(recipeList => buildPlanner(recipeList, onAddMeal))
  .catch(() => buildPlanner([], onAddMeal));
