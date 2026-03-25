/**
 * Aggregate ingredients from multiple recipes into a deduped shopping list.
 *
 * Groups by (name.toLowerCase(), normalisedUnit) and sums quantities.
 * Handles common unit aliases so "g" and "grams" don't create separate rows.
 */

// Maps variant spellings → canonical unit
const UNIT_ALIASES = {
  gram:        'g',
  grams:       'g',
  kilogram:    'kg',
  kilograms:   'kg',
  milliliter:  'ml',
  millilitre:  'ml',
  milliliters: 'ml',
  millilitres: 'ml',
  liter:       'l',
  litre:       'l',
  liters:      'l',
  litres:      'l',
  teaspoon:    'tsp',
  teaspoons:   'tsp',
  tablespoon:  'tbsp',
  tablespoons: 'tbsp',
  ounce:       'oz',
  ounces:      'oz',
  pound:       'lb',
  pounds:      'lb',
  pieces:      'piece',
  pcs:         'piece',
  slices:      'slice',
};

function normaliseUnit(unit) {
  if (!unit) return '';
  const lower = unit.toLowerCase().trim();
  return UNIT_ALIASES[lower] ?? lower;
}

/**
 * @param {Array<object>} recipes  Full recipe objects with .ingredients arrays.
 * @returns {Array<{name:string, quantity:number, unit:string}>}  Sorted A-Z by name.
 */
function aggregate(recipes) {
  /** @type {Map<string, {name:string, quantity:number, unit:string}>} */
  const totals = new Map();

  for (const recipe of recipes) {
    for (const ing of (recipe.ingredients ?? [])) {
      if (!ing.name?.trim()) continue;

      const name = ing.name.trim().toLowerCase();
      const unit = normaliseUnit(ing.unit);
      const key  = `${name}||${unit}`;

      if (totals.has(key)) {
        totals.get(key).quantity += ing.quantity ?? 0;
      } else {
        totals.set(key, {
          name:     ing.name.trim(),   // preserve original casing of first occurrence
          quantity: ing.quantity ?? 0,
          unit,
        });
      }
    }
  }

  return [...totals.values()].sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = { aggregate };
