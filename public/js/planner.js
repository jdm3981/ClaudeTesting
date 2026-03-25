/**
 * Planner grid builder and drag-and-drop logic.
 *
 * Phase 2: buildPlanner() accepts an optional recipeList from the API.
 * Phase 3: promptAdd() replaced by openSearchModal().
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
 * @param {Array<{id:string, name:string, emoji:string, tags:string[]}>} [recipeList]
 *   Flat list of recipes from the API. When provided, the first 7 are used as
 *   placeholder cards per meal type so the grid is never empty. When absent
 *   (API unavailable) the grid renders empty cells.
 */
export function buildPlanner(recipeList = []) {
  const planner = document.getElementById('planner');
  planner.innerHTML = '';

  const days = getDays();

  // Row 0: corner cell + day headers
  planner.appendChild(el('div', { class: 'corner' }));
  days.forEach(d => {
    const hdr = el('div', { class: 'day-header' + (d.isToday ? ' today' : '') });
    hdr.innerHTML =
      `<span class="day-name">${escHtml(d.name)}</span>` +
      `<span class="day-date">${escHtml(d.date)}</span>`;
    planner.appendChild(hdr);
  });

  // Split recipe list into two halves: first half → lunch, second → dinner
  // (Phase 4 will replace this with actual saved plan data)
  const lunchRecipes  = recipeList.slice(0, 7);
  const dinnerRecipes = recipeList.slice(7, 14);

  // Rows 1–2: Lunch, Dinner
  ['lunch', 'dinner'].forEach(type => {
    const pool = type === 'lunch' ? lunchRecipes : dinnerRecipes;
    planner.appendChild(
      el('div', { class: `row-label ${type}`, text: type === 'lunch' ? 'Lunch' : 'Dinner' })
    );
    days.forEach((_d, i) => {
      const cell = makeCell(type, i);
      const recipe = pool[i];
      if (recipe) {
        appendCard(cell, {
          name:  recipe.name,
          emoji: recipe.emoji || '🍽',
          tag:   recipe.tags?.[0] ?? '',
        });
      }
      planner.appendChild(cell);
    });
  });
}

// ── Cell ───────────────────────────────────────────────────────────────────

function makeCell(type, dayIdx) {
  const cell = el('div', { class: `meal-cell ${type}-cell` });
  cell.dataset.type = type;
  cell.dataset.day  = dayIdx;

  const addBtn = el('button', { class: 'add-meal-btn', text: '+ Add meal' });
  addBtn.addEventListener('click', () => promptAdd(cell));
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
    if (draggedCard) cell.insertBefore(draggedCard, cell.querySelector('.add-meal-btn'));
  });

  return cell;
}

// ── Card ───────────────────────────────────────────────────────────────────

/**
 * Create a draggable recipe card element.
 * @param {{ name: string, emoji: string, tag: string }} meal
 * @returns {HTMLElement}
 */
export function makeCard(meal) {
  const card = el('div', { class: 'recipe-card' });
  card.draggable = true;
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
 */
export function appendCard(cell, meal) {
  cell.insertBefore(makeCard(meal), cell.querySelector('.add-meal-btn'));
}

// ── Add meal (Phase 1 prompt — replaced by search modal in Phase 3) ────────

function promptAdd(cell) {
  const name = prompt('Meal name:');
  if (!name?.trim()) return;
  const emojis = ['🍽','🥘','🍜','🥗','🍱','🥙','🧆','🥚','🍣','🥩','🍞','🫕'];
  const emoji  = emojis[Math.floor(Math.random() * emojis.length)];
  appendCard(cell, { name: name.trim(), emoji, tag: 'Custom' });
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
  if (cell) cell.insertBefore(touchCard, cell.querySelector('.add-meal-btn'));

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
