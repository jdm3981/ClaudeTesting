/**
 * Create a DOM element with optional class and text content.
 * @param {string} tag
 * @param {{ class?: string, text?: string }} [opts]
 * @returns {HTMLElement}
 */
export function el(tag, opts = {}) {
  const node = document.createElement(tag);
  if (opts.class) node.className = opts.class;
  if (opts.text)  node.textContent = opts.text;
  return node;
}

/**
 * Escape a string for safe insertion into HTML.
 * @param {string} str
 * @returns {string}
 */
export function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Return the Monday of the week containing the given date.
 * @param {Date} date
 * @returns {Date}
 */
export function getMondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Format a Date as an ISO date string (YYYY-MM-DD) in local time.
 * @param {Date} date
 * @returns {string}
 */
export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Debounce a function.
 * @param {Function} fn
 * @param {number} ms
 * @returns {Function}
 */
export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
