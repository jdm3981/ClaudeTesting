/**
 * Planner grid builder and drag-and-drop logic.
 *
 * Phase 4: buildPlanner() takes a plan object + recipe map.
 *          Cards carry dataset.recipeId for DOM serialisation.
 *          Dispatches "plan-changed" on document after any mutation.
 */

import { el, escHtml } from './utils.js';
import { getDays } from './state.js';

// ── Drag state (module-scoped) ─────────────────────────────────────────────

let draggedCard = null;
let touchCard   = null;
let touchGhost  = null;
let touchOffX   = 0;
let touchOffY   = 0;

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Build (or rebuild) the planner grid inside #planner.
 * Clears existing content first, so safe to call on week navigation.
 *
 * @param {object|null} plan
 *   Plan object from the API ({ weekStart, days: [{date, lunch:[id], dinner:[id]}] }),
 *   or null for an empty week.
 * @param {Map<string,object>} recipeMap
 *   Map of recipe id → recipe object for looking up display data.
 * @param {function(HTMLElement): void} [onAddMeal]
 *   Called with the cell element when the user clicks "+ Add meal".
 */
export function buildPlanner(plan, recipeMap, onAddMeal = () => {}) {
  const planner = document.getElementById('planner');
  planner.innerHTML = '';

  const days = getDays();

  // Index plan days by date for fast lookup
  const daysByDate = new Map((plan?.days ?? []).map(d => [d.date, d]));

  // Row 0: corner cell + day headers
  planner.appendChild(el('div', { class: 'corner' }));
  days.forEach(d => {
    const hdr = el('div', { class: 'day-header' + (d.isToday ? ' today' : '') });
    hdr.innerHTML =
      `<span class="day-name">${escHtml(d.name)}</span>` +
      `<span class="day-date">${escHtml(d.date)}</span>`;
    planner.appendChild(hdr);
  });

  // Rows 1–2: Lunch, Dinner
  ['lunch', 'dinner'].forEach(type => {
    planner.appendChild(
      el('div', { class: `row-label ${type}`, text: type === 'lunch' ? 'Lunch' : 'Dinner' })
    );
    days.forEach(d => {
      const cell  = makeCell(type, days.indexOf(d), onAddMeal);
      const saved = daysByDate.get(d.fullDate);
      const ids   = saved?.[type] ?? [];
      ids.forEach(id => {
        const recipe = recipeMap.get(id);
        if (recipe) appendCard(cell, { name: recipe.name, emoji: recipe.emoji || '🍽', tag: recipe.tags?.[0] ?? '' }, id);
      });
      planner.appendChild(cell);
    });
  });
}

// ── Cell ───────────────────────────────────────────────────────────────────

function makeCell(type, dayIdx, onAddMeal) {
  const cell = el('div', { class: `meal-cell ${type}-cell` });
  cell.dataset.type = type;
  cell.dataset.day  = dayIdx;

  const addBtn = el('button', { class: 'add-meal-btn', text: '+ Add meal' });
  addBtn.addEventListener('click', () => onAddMeal(cell));
  cell.appendChild(addBtn);

  // Mouse DnD — drop target
  cell.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    cell.classList.add('drag-over');
  });
  cell.addEventListener('dragleave', e => {
    if (!cell.contains(e.relatedTarget)) cell.classList.remove('drag-over');
  });
  cell.addEventListener('drop', e => {
    e.preventDefault();
    cell.classList.remove('drag-over');
    if (draggedCard) {
      cell.insertBefore(draggedCard, cell.querySelector('.add-meal-btn'));
      _planChanged();
    }
  });

  return cell;
}

// ── Card ───────────────────────────────────────────────────────────────────

function _planChanged() {
  document.dispatchEvent(new CustomEvent('plan-changed'));
}

/**
 * Create a draggable recipe card element.
 * @param {{ name: string, emoji: string, tag: string }} meal
 * @param {string|null} [recipeId]  Stored on dataset.recipeId for plan serialisation.
 * @returns {HTMLElement}
 */
export function makeCard(meal, recipeId = null) {
  const card = el('div', { class: 'recipe-card' });
  card.draggable = true;
  if (recipeId) card.dataset.recipeId = recipeId;
  card.innerHTML =
    `<span class="card-emoji">${meal.emoji}</span>` +
    `<div class="card-body">` +
      `<div class="card-name">${escHtml(meal.name)}</div>` +
      `<div class="card-tag">${escHtml(meal.tag)}</div>` +
    `</div>` +
    `<button class="card-remove" title="Remove">&#10005;</button>`;

  card.querySelector('.card-remove').addEventListener('click', e => {
    e.stopPropagation();
    card.remove();
    _planChanged();
  });

  // Mouse DnD
  card.addEventListener('dragstart', e => {
    draggedCard = card;
    e.dataTransfer.effectAllowed = 'move';
    requestAnimationFrame(() => card.classList.add('dragging'));
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    draggedCard = null;
    document.querySelectorAll('.drag-over').forEach(c => c.classList.remove('drag-over'));
  });

  // Touch DnD
  card.addEventListener('touchstart', onTouchStart, { passive: false });
  card.addEventListener('touchmove',  onTouchMove,  { passive: false });
  card.addEventListener('touchend',   onTouchEnd,   { passive: false });

  return card;
}

/**
 * Insert a card before the "+ Add meal" button in a cell.
 * @param {HTMLElement} cell
 * @param {{ name: string, emoji: string, tag: string }} meal
 * @param {string|null} [recipeId]
 */
export function appendCard(cell, meal, recipeId = null) {
  cell.insertBefore(makeCard(meal, recipeId), cell.querySelector('.add-meal-btn'));
}

// ── Touch drag handlers ────────────────────────────────────────────────────

function onTouchStart(e) {
  const card  = e.currentTarget;
  const touch = e.touches[0];
  const rect  = card.getBoundingClientRect();

  touchCard = card;
  touchOffX = touch.clientX - rect.left;
  touchOffY = touch.clientY - rect.top;

  touchGhost = card.cloneNode(true);
  touchGhost.className = 'recipe-card drag-ghost';
  touchGhost.style.width = rect.width + 'px';
  positionGhost(touch);
  document.body.appendChild(touchGhost);

  card.classList.add('dragging');
  e.preventDefault();
}

function onTouchMove(e) {
  if (!touchGhost) return;
  const touch = e.touches[0];
  positionGhost(touch);
  highlightTarget(touch);
  e.preventDefault();
}

function onTouchEnd(e) {
  if (!touchGhost || !touchCard) return;
  const touch = e.changedTouches[0];

  touchGhost.style.display = 'none';
  const target = document.elementFromPoint(touch.clientX, touch.clientY);
  touchGhost.remove();
  touchGhost = null;

  touchCard.classList.remove('dragging');
  document.querySelectorAll('.drag-over').forEach(c => c.classList.remove('drag-over'));

  const cell = target?.closest('.meal-cell');
  if (cell) {
    cell.insertBefore(touchCard, cell.querySelector('.add-meal-btn'));
    _planChanged();
  }

  touchCard = null;
  e.preventDefault();
}

function positionGhost(touch) {
  touchGhost.style.left = (touch.clientX - touchOffX) + 'px';
  touchGhost.style.top  = (touch.clientY - touchOffY) + 'px';
}

function highlightTarget(touch) {
  touchGhost.style.display = 'none';
  const target = document.elementFromPoint(touch.clientX, touch.clientY);
  touchGhost.style.display = '';
  document.querySelectorAll('.meal-cell').forEach(c => c.classList.remove('drag-over'));
  target?.closest('.meal-cell')?.classList.add('drag-over');
}
