/**
 * Search modal for adding recipes to planner cells.
 *
 * Usage:
 *   openSearchModal(cell, onSelect)
 *   - cell     : the .meal-cell element the user clicked "+ Add meal" on
 *   - onSelect : callback(recipe) called when the user picks a result
 */

import { escHtml, debounce } from './utils.js';
import { recipes as recipesApi } from './api.js';

// ── DOM refs (resolved once on first open) ──────────────────────────────────

let _overlay, _input, _tagFilters, _results;

function _initRefs() {
  if (_overlay) return;
  _overlay    = document.getElementById('searchModal');
  _input      = document.getElementById('search-input');
  _tagFilters = document.getElementById('tag-filters');
  _results    = document.getElementById('search-results');
}

// ── State ───────────────────────────────────────────────────────────────────

let _onSelect   = null;
let _allRecipes = [];  // cached full list for client-side tag filter
let _activeTag  = null;

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Open the modal targeting a specific planner cell.
 * @param {HTMLElement} cell
 * @param {function(recipe): void} onSelect
 */
export function openSearchModal(cell, onSelect) {
  _initRefs();
  _onSelect  = onSelect;
  _activeTag = null;

  _input.value = '';
  _tagFilters.innerHTML = '';
  _results.innerHTML = '<div class="search-empty">Loading…</div>';

  _overlay.classList.add('show');
  _input.focus();

  // Load full recipe list once; filter client-side for speed.
  recipesApi.list({ limit: 100 })
    .then(list => {
      _allRecipes = list;
      _buildTagChips(list);
      _renderResults(list);
    })
    .catch(() => {
      _results.innerHTML = '<div class="search-empty">Could not load recipes.</div>';
    });
}

// ── Close ───────────────────────────────────────────────────────────────────

function _close() {
  _overlay.classList.remove('show');
  _onSelect  = null;
  _allRecipes = [];
  _activeTag  = null;
}

// ── Tag chips ───────────────────────────────────────────────────────────────

function _buildTagChips(recipes) {
  const tagSet = new Set();
  recipes.forEach(r => (r.tags || []).forEach(t => tagSet.add(t)));
  const tags = [...tagSet].sort();

  _tagFilters.innerHTML = '';

  if (!tags.length) return;

  const allBtn = _makeTagBtn('All', null);
  allBtn.classList.add('active');
  _tagFilters.appendChild(allBtn);

  tags.forEach(tag => _tagFilters.appendChild(_makeTagBtn(tag, tag)));
}

function _makeTagBtn(label, tag) {
  const btn = document.createElement('button');
  btn.className = 'tag-filter-btn';
  btn.textContent = label;
  btn.addEventListener('click', () => {
    _activeTag = tag;
    _tagFilters.querySelectorAll('.tag-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _applyFilter();
  });
  return btn;
}

// ── Search / filter ─────────────────────────────────────────────────────────

function _applyFilter() {
  const q = _input.value.trim().toLowerCase();
  let list = _allRecipes;

  if (_activeTag) {
    list = list.filter(r => (r.tags || []).includes(_activeTag));
  }
  if (q) {
    list = list.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.description || '').toLowerCase().includes(q) ||
      (r.ingredients || []).some(i => i.name.toLowerCase().includes(q))
    );
  }

  _renderResults(list);
}

const _debouncedFilter = debounce(_applyFilter, 250);

// ── Render results ───────────────────────────────────────────────────────────

function _renderResults(list) {
  if (!list.length) {
    _results.innerHTML = '<div class="search-empty">No recipes found.</div>';
    return;
  }

  _results.innerHTML = '';
  list.forEach(recipe => {
    const card = document.createElement('button');
    card.className = 'search-result-card';

    const tags = (recipe.tags || []).slice(0, 3).map(t => escHtml(t)).join(' · ');
    const meta = [
      recipe.servings  ? `${recipe.servings} servings` : '',
      recipe.prepTime  ? `${recipe.prepTime + (recipe.cookTime || 0)} min` : '',
      tags,
    ].filter(Boolean).join('  ·  ');

    card.innerHTML =
      `<span class="search-result-emoji">${recipe.emoji || '🍽'}</span>` +
      `<span class="search-result-body">` +
        `<span class="search-result-name">${escHtml(recipe.name)}</span>` +
        (meta ? `<span class="search-result-meta">${meta}</span>` : '') +
      `</span>` +
      `<span class="search-result-add">+ Add</span>`;

    card.addEventListener('click', () => {
      if (_onSelect) _onSelect(recipe);
      _close();
    });

    _results.appendChild(card);
  });
}

// ── Event wiring (runs once at module load) ──────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  _initRefs();

  document.getElementById('modal-close-btn').addEventListener('click', _close);

  _overlay.addEventListener('click', e => {
    if (e.target === _overlay) _close();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && _overlay.classList.contains('show')) _close();
  });

  _input.addEventListener('input', _debouncedFilter);
});
