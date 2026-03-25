/**
 * Planner page entry point.
 * Wires the header controls, plan loading/saving, and grid initialisation.
 */

import { buildPlanner, appendCard } from './planner.js';
import { getWeekLabel, getWeekStartISO, nextWeek, prevWeek, readPlanFromDOM } from './state.js';
import { recipes as recipesApi, plans as plansApi } from './api.js';
import { openSearchModal } from './search-modal.js';

// ── Week label ─────────────────────────────────────────────────────────────

function updateWeekLabel() {
  document.getElementById('week-label').textContent = getWeekLabel();
}

// ── Add meal callback ──────────────────────────────────────────────────────

function onAddMeal(cell) {
  openSearchModal(cell, recipe => {
    appendCard(cell, {
      name:  recipe.name,
      emoji: recipe.emoji || '🍽',
      tag:   recipe.tags?.[0] ?? '',
    }, recipe.id);
    _scheduleSave();
  });
}

// ── Plan save (debounced 2s) ───────────────────────────────────────────────

let _saveTimer = null;

function _scheduleSave() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(_doSave, 2000);
}

async function _doSave() {
  _saveTimer = null;
  const weekStart = getWeekStartISO();
  const planData  = readPlanFromDOM(weekStart);
  try {
    await plansApi.upsert(weekStart, planData);
  } catch (err) {
    console.error('Plan save failed:', err);
  }
}

/** Save immediately, cancelling any pending debounce. */
async function _saveNow() {
  clearTimeout(_saveTimer);
  await _doSave();
}

// Listen for plan mutations from planner.js (drops, removes)
document.addEventListener('plan-changed', _scheduleSave);

// ── Plan + recipe loader ───────────────────────────────────────────────────

async function initPlanner() {
  updateWeekLabel();
  const weekStart = getWeekStartISO();

  try {
    const [plan, recipeList] = await Promise.all([
      plansApi.get(weekStart),
      recipesApi.list({ limit: 200 }),
    ]);
    const recipeMap = new Map(recipeList.map(r => [r.id, r]));
    buildPlanner(plan, recipeMap, onAddMeal);
  } catch {
    buildPlanner(null, new Map(), onAddMeal);
  }
}

// ── Week navigation ────────────────────────────────────────────────────────

document.getElementById('btn-prev-week').addEventListener('click', async () => {
  await _saveNow();
  prevWeek();
  await initPlanner();
});

document.getElementById('btn-next-week').addEventListener('click', async () => {
  await _saveNow();
  nextWeek();
  await initPlanner();
});

// ── Search / recipe library button ────────────────────────────────────────
// Takes the user to the recipe library rather than opening an add-to-cell modal
// with no target (which would make the "+ Add" button appear broken).

document.getElementById('btn-search').addEventListener('click', () => {
  location.href = '/recipes.html';
});

// ── Highlight active nav link ──────────────────────────────────────────────

document.querySelector(`.nav-link[href="${location.pathname}"]`)
  ?.classList.add('active');

// ── Init ───────────────────────────────────────────────────────────────────

initPlanner();
