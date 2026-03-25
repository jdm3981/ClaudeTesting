/**
 * Shopping list page (shopping.html).
 *
 * Loads the generated shopping list for the current week from the API.
 * Checkbox state is persisted in localStorage.
 * Supports Export JSON and Clear checked.
 */

import { getMondayOf, toISODate } from './utils.js';
import { plans as plansApi } from './api.js';

// ── Week state ────────────────────────────────────────────────────────────

let _weekStart = getMondayOf(new Date());

function _weekStartISO() { return toISODate(_weekStart); }

function _weekLabel() {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(_weekStart);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const fmtY = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return `Week of ${fmt(days[0])} \u2013 ${fmtY(days[6])}`;
}

// Restore last-viewed week from localStorage
(function _restore() {
  const saved = localStorage.getItem('currentWeekStart');
  if (saved) {
    const d = new Date(saved + 'T00:00:00');
    if (!isNaN(d)) _weekStart = getMondayOf(d);
  }
})();

// ── DOM refs ──────────────────────────────────────────────────────────────

const container  = document.getElementById('shopping-list-container');
const weekLabel  = document.getElementById('week-label');
const btnExport  = document.getElementById('btn-export');
const btnClear   = document.getElementById('btn-clear-checked');

// ── Checked state (localStorage) ─────────────────────────────────────────

function _storageKey() { return `shopping-checked-${_weekStartISO()}`; }

function _loadChecked() {
  try { return new Set(JSON.parse(localStorage.getItem(_storageKey())) ?? []); }
  catch { return new Set(); }
}

function _saveChecked(checkedSet) {
  localStorage.setItem(_storageKey(), JSON.stringify([...checkedSet]));
}

// ── Current list data (for export) ───────────────────────────────────────

let _currentItems = [];

// ── Load & render ─────────────────────────────────────────────────────────

async function loadList() {
  weekLabel.textContent = _weekLabel();
  container.innerHTML = '<div class="empty-state"><div style="font-size:2rem">⏳</div><p>Generating list…</p></div>';

  try {
    const data = await plansApi.shoppingList(_weekStartISO());
    _currentItems = data.items ?? [];
    renderList(_currentItems);
  } catch (err) {
    if (err.message.includes('404')) {
      container.innerHTML =
        '<div class="empty-state"><div style="font-size:2rem">📋</div>' +
        '<p>No meals planned for this week.<br>Add meals in the <a href="/index.html">Planner</a> first.</p></div>';
    } else {
      container.innerHTML =
        '<div class="empty-state"><div style="font-size:2rem">⚠️</div>' +
        `<p>Could not load shopping list.</p></div>`;
    }
    _currentItems = [];
  }
}

function renderList(items) {
  if (!items.length) {
    container.innerHTML =
      '<div class="empty-state"><div style="font-size:2rem">✅</div>' +
      '<p>No ingredients found for this week\'s plan.</p></div>';
    return;
  }

  const checked = _loadChecked();

  const list = document.createElement('div');
  list.className = 'shopping-list';

  items.forEach(item => {
    const key = _itemKey(item);
    const isChecked = checked.has(key);

    const row = document.createElement('div');
    row.className = 'shopping-item' + (isChecked ? ' checked' : '');

    const qty = _formatQty(item.quantity, item.unit);

    row.innerHTML =
      `<input type="checkbox" ${isChecked ? 'checked' : ''}>` +
      `<span class="item-name">${_escHtml(item.name)}</span>` +
      `<span class="item-qty">${_escHtml(qty)}</span>`;

    row.querySelector('input').addEventListener('change', e => {
      const ch = _loadChecked();
      if (e.target.checked) { ch.add(key); row.classList.add('checked'); }
      else                  { ch.delete(key); row.classList.remove('checked'); }
      _saveChecked(ch);
    });

    list.appendChild(row);
  });

  container.innerHTML = '';
  container.appendChild(list);
}

function _itemKey(item) { return `${item.name.toLowerCase()}||${item.unit}`; }

function _formatQty(quantity, unit) {
  if (!quantity && !unit) return '';
  const q = Number.isInteger(quantity) ? quantity : +quantity.toFixed(2);
  return unit ? `${q} ${unit}` : String(q);
}

function _escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Export JSON ───────────────────────────────────────────────────────────

btnExport.addEventListener('click', () => {
  if (!_currentItems.length) return;

  const checked = _loadChecked();
  const payload = {
    weekStart: _weekStartISO(),
    items: _currentItems.map(item => ({
      ...item,
      checked: checked.has(_itemKey(item)),
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `shopping-list-${_weekStartISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// ── Clear checked ─────────────────────────────────────────────────────────

btnClear.addEventListener('click', () => {
  _saveChecked(new Set());
  // Re-render without rebuilding from API
  container.querySelectorAll('.shopping-item').forEach(row => {
    row.classList.remove('checked');
    row.querySelector('input').checked = false;
  });
});

// ── Week navigation ───────────────────────────────────────────────────────

document.getElementById('btn-prev-week').addEventListener('click', () => {
  _weekStart.setDate(_weekStart.getDate() - 7);
  loadList();
});

document.getElementById('btn-next-week').addEventListener('click', () => {
  _weekStart.setDate(_weekStart.getDate() + 7);
  loadList();
});

// ── Active nav ────────────────────────────────────────────────────────────

document.querySelector(`.nav-link[href="${location.pathname}"]`)
  ?.classList.add('active');

// ── Init ──────────────────────────────────────────────────────────────────

loadList();
