import { getMondayOf, toISODate } from './utils.js';

// ── Week navigation ────────────────────────────────────────────────────────

let _weekStart = getMondayOf(new Date());

/** Return the current week-start date (Monday). */
export function getWeekStart() {
  return new Date(_weekStart);
}

/** Return the current week-start as ISO string (YYYY-MM-DD). */
export function getWeekStartISO() {
  return toISODate(_weekStart);
}

/** Advance to the next week. */
export function nextWeek() {
  _weekStart.setDate(_weekStart.getDate() + 7);
  _persistWeek();
}

/** Go back to the previous week. */
export function prevWeek() {
  _weekStart.setDate(_weekStart.getDate() - 7);
  _persistWeek();
}

function _persistWeek() {
  localStorage.setItem('currentWeekStart', toISODate(_weekStart));
}

// Restore last-viewed week from localStorage on load
(function _restoreWeek() {
  const saved = localStorage.getItem('currentWeekStart');
  if (saved) {
    const d = new Date(saved + 'T00:00:00');
    if (!isNaN(d)) _weekStart = getMondayOf(d);
  }
})();

// ── Day descriptors ────────────────────────────────────────────────────────

/**
 * Return an array of 7 day descriptor objects for the current week.
 * @returns {{ name: string, date: string, fullDate: string, isToday: boolean }[]}
 */
export function getDays() {
  const todayISO = toISODate(new Date());
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(_weekStart);
    d.setDate(d.getDate() + i);
    const fullDate = toISODate(d);
    days.push({
      name:     d.toLocaleDateString('en-GB', { weekday: 'short' }),
      date:     String(d.getDate()),
      fullDate,
      isToday:  fullDate === todayISO,
    });
  }
  return days;
}

/**
 * Return a human-readable week label, e.g. "Week of 23 Mar – 29 Mar 2026".
 * @returns {string}
 */
export function getWeekLabel() {
  const days = getDays();
  const start = new Date(days[0].fullDate + 'T00:00:00');
  const end   = new Date(days[6].fullDate + 'T00:00:00');
  const startStr = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const endStr   = end.toLocaleDateString('en-GB',   { day: 'numeric', month: 'short', year: 'numeric' });
  return `Week of ${startStr} \u2013 ${endStr}`;
}

// ── Sample data (Phase 1 placeholder — replaced in Phase 2 by API) ─────────

export const SAMPLE = {
  lunch: [
    [{ name: 'Caesar Salad',    emoji: '🥗', tag: 'Salad'    }],
    [{ name: 'Club Sandwich',   emoji: '🥪', tag: 'Sandwich' }],
    [{ name: 'Tomato Soup',     emoji: '🍲', tag: 'Soup'     }],
    [],
    [{ name: 'BLT Wrap',        emoji: '🌯', tag: 'Wrap'     }],
    [{ name: 'Avocado Toast',   emoji: '🥑', tag: 'Light'    },
     { name: 'Fruit Salad',     emoji: '🍓', tag: 'Side'     }],
    [{ name: 'Eggs Benedict',   emoji: '🍳', tag: 'Brunch'   }],
  ],
  dinner: [
    [{ name: 'Pasta Carbonara', emoji: '🍝', tag: 'Italian'  }],
    [{ name: 'Grilled Salmon',  emoji: '🐟', tag: 'Seafood'  }],
    [{ name: 'Beef Stir Fry',   emoji: '🥩', tag: 'Asian'    }],
    [{ name: 'Butter Chicken',  emoji: '🍛', tag: 'Indian'   }],
    [{ name: 'Margherita Pizza',emoji: '🍕', tag: 'Italian'  }],
    [{ name: 'BBQ Ribs',        emoji: '🍖', tag: 'BBQ'      }],
    [{ name: 'Roast Chicken',   emoji: '🍗', tag: 'Classic'  }],
  ],
};
