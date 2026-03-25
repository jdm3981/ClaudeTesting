/**
 * Recipe library page (recipes.html) — list, add, edit, delete.
 */

import { escHtml, debounce } from './utils.js';
import { recipes as recipesApi } from './api.js';

// ── State ───────────────────────────────────────────────────────────────────

let _allRecipes = [];
let _editingId  = null;   // null = creating new
let _activeTag  = null;

// ── DOM refs ─────────────────────────────────────────────────────────────────

const grid       = document.getElementById('recipes-grid');
const tagFilters = document.getElementById('tag-filters');
const libSearch  = document.getElementById('library-search');
const formModal  = document.getElementById('formModal');
const formTitle  = document.getElementById('form-title');
const ingBody    = document.getElementById('ingredients-body');

// ── Load & render ─────────────────────────────────────────────────────────────

async function loadRecipes() {
  grid.innerHTML = '<div class="search-empty">Loading recipes…</div>';
  try {
    _allRecipes = await recipesApi.list({ limit: 200 });
    _buildTagChips();
    _renderGrid();
  } catch {
    grid.innerHTML = '<div class="search-empty">Could not load recipes.</div>';
  }
}

function _renderGrid() {
  const q    = libSearch.value.trim().toLowerCase();
  let   list = _allRecipes;

  if (_activeTag) {
    list = list.filter(r => (r.tags || []).includes(_activeTag));
  }
  if (q) {
    list = list.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.description || '').toLowerCase().includes(q)
    );
  }

  if (!list.length) {
    grid.innerHTML = '<div class="search-empty">No recipes found.</div>';
    return;
  }

  grid.innerHTML = '';
  list.forEach(r => grid.appendChild(_makeCard(r)));
}

function _makeCard(r) {
  const card = document.createElement('div');
  card.className = 'recipe-library-card';

  const tags = (r.tags || []).map(t =>
    `<span class="tag-chip">${escHtml(t)}</span>`
  ).join('');

  const time = (r.prepTime || 0) + (r.cookTime || 0);
  const meta = [
    r.servings ? `${r.servings} servings` : '',
    time       ? `${time} min`            : '',
  ].filter(Boolean).join(' · ');

  card.innerHTML =
    `<div class="recipe-emoji">${r.emoji || '🍽'}</div>` +
    `<div class="recipe-name">${escHtml(r.name)}</div>` +
    (r.description ? `<div class="recipe-meta" style="margin-top:4px;font-size:0.8rem;color:#718096">${escHtml(r.description)}</div>` : '') +
    (meta          ? `<div class="recipe-meta">${escHtml(meta)}</div>` : '') +
    (tags          ? `<div style="margin-top:6px">${tags}</div>` : '') +
    `<div class="recipe-card-actions">` +
      `<button class="btn-icon btn-edit" data-id="${escHtml(r.id)}">Edit</button>` +
      `<button class="btn-icon danger btn-delete" data-id="${escHtml(r.id)}">Delete</button>` +
    `</div>`;

  card.querySelector('.btn-edit').addEventListener('click', () => _openEdit(r));
  card.querySelector('.btn-delete').addEventListener('click', () => _deleteRecipe(r));

  return card;
}

// ── Tag chips ─────────────────────────────────────────────────────────────────

function _buildTagChips() {
  const tagSet = new Set();
  _allRecipes.forEach(r => (r.tags || []).forEach(t => tagSet.add(t)));
  const tags = [...tagSet].sort();

  tagFilters.innerHTML = '';
  if (!tags.length) return;

  const allBtn = _makeTagBtn('All', null);
  allBtn.classList.add('active');
  tagFilters.appendChild(allBtn);
  tags.forEach(t => tagFilters.appendChild(_makeTagBtn(t, t)));
}

function _makeTagBtn(label, tag) {
  const btn = document.createElement('button');
  btn.className = 'tag-filter-btn';
  btn.textContent = label;
  btn.addEventListener('click', () => {
    _activeTag = tag;
    tagFilters.querySelectorAll('.tag-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _renderGrid();
  });
  return btn;
}

// ── Form modal ────────────────────────────────────────────────────────────────

function _openAdd() {
  _editingId = null;
  formTitle.textContent = 'Add Recipe';
  _clearForm();
  _addIngredientRow();
  formModal.classList.add('show');
}

function _openEdit(recipe) {
  _editingId = recipe.id;
  formTitle.textContent = 'Edit Recipe';
  _fillForm(recipe);
  formModal.classList.add('show');
}

function _closeForm() {
  formModal.classList.remove('show');
  _editingId = null;
}

function _clearForm() {
  ['f-name','f-emoji','f-description','f-tags','f-servings','f-prep','f-cook']
    .forEach(id => { document.getElementById(id).value = ''; });
  ingBody.innerHTML = '';
}

function _fillForm(r) {
  document.getElementById('f-name').value        = r.name        || '';
  document.getElementById('f-emoji').value       = r.emoji       || '';
  document.getElementById('f-description').value = r.description || '';
  document.getElementById('f-tags').value        = (r.tags || []).join(', ');
  document.getElementById('f-servings').value    = r.servings    ?? '';
  document.getElementById('f-prep').value        = r.prepTime    ?? '';
  document.getElementById('f-cook').value        = r.cookTime    ?? '';

  ingBody.innerHTML = '';
  (r.ingredients || []).forEach(i => _addIngredientRow(i));
  if (!r.ingredients?.length) _addIngredientRow();
}

function _addIngredientRow(ing = {}) {
  const tr = document.createElement('tr');
  tr.innerHTML =
    `<td><input class="form-control" style="width:100%" placeholder="chicken breast" value="${escHtml(ing.name || '')}"></td>` +
    `<td><input class="form-control" type="number" min="0" step="any" placeholder="500" value="${ing.quantity ?? ''}"></td>` +
    `<td><input class="form-control" placeholder="g" value="${escHtml(ing.unit || '')}"></td>` +
    `<td><button class="btn-remove-ing" title="Remove">&#10005;</button></td>`;
  tr.querySelector('.btn-remove-ing').addEventListener('click', () => tr.remove());
  ingBody.appendChild(tr);
}

function _readForm() {
  const tags = document.getElementById('f-tags').value
    .split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

  const ingredients = [...ingBody.querySelectorAll('tr')].map(tr => {
    const [nameI, qtyI, unitI] = tr.querySelectorAll('input');
    return {
      name:     nameI.value.trim(),
      quantity: parseFloat(qtyI.value) || 0,
      unit:     unitI.value.trim(),
    };
  }).filter(i => i.name);

  return {
    name:        document.getElementById('f-name').value.trim(),
    emoji:       document.getElementById('f-emoji').value.trim() || undefined,
    description: document.getElementById('f-description').value.trim() || undefined,
    tags,
    servings:    parseInt(document.getElementById('f-servings').value) || undefined,
    prepTime:    parseInt(document.getElementById('f-prep').value)     || undefined,
    cookTime:    parseInt(document.getElementById('f-cook').value)     || undefined,
    ingredients,
  };
}

async function _saveForm() {
  const data = _readForm();
  if (!data.name) {
    document.getElementById('f-name').focus();
    return;
  }

  const saveBtn = document.getElementById('form-save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    if (_editingId) {
      await recipesApi.update(_editingId, data);
    } else {
      await recipesApi.create(data);
    }
    _closeForm();
    await loadRecipes();
  } catch (err) {
    alert(`Save failed: ${err.message}`);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Recipe';
  }
}

async function _deleteRecipe(recipe) {
  if (!confirm(`Delete "${recipe.name}"?`)) return;
  try {
    await recipesApi.delete(recipe.id);
    await loadRecipes();
  } catch (err) {
    alert(`Delete failed: ${err.message}`);
  }
}

// ── Event wiring ──────────────────────────────────────────────────────────────

document.getElementById('btn-add-recipe').addEventListener('click', _openAdd);
document.getElementById('form-close-btn').addEventListener('click', _closeForm);
document.getElementById('form-cancel-btn').addEventListener('click', _closeForm);
document.getElementById('form-save-btn').addEventListener('click', _saveForm);
document.getElementById('btn-add-ing').addEventListener('click', () => _addIngredientRow());

formModal.addEventListener('click', e => { if (e.target === formModal) _closeForm(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && formModal.classList.contains('show')) _closeForm();
});

libSearch.addEventListener('input', debounce(_renderGrid, 200));

// ── Active nav link ───────────────────────────────────────────────────────────

document.querySelector(`.nav-link[href="${location.pathname}"]`)
  ?.classList.add('active');

// ── Init ──────────────────────────────────────────────────────────────────────

loadRecipes();
