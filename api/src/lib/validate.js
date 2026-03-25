/**
 * Recipe schema validation.
 * Returns { valid: true } or { valid: false, errors: string[] }.
 */

const VALID_UNITS = ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'oz', 'lb', 'piece', 'slice', 'pinch', ''];

/**
 * @param {unknown} body
 * @returns {{ valid: boolean, errors?: string[] }}
 */
function validateRecipe(body) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be a JSON object'] };
  }

  // Required string fields
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    errors.push('name is required and must be a non-empty string');
  }

  // Optional but typed fields
  if (body.emoji !== undefined && typeof body.emoji !== 'string') {
    errors.push('emoji must be a string');
  }
  if (body.description !== undefined && typeof body.description !== 'string') {
    errors.push('description must be a string');
  }

  // tags: array of strings
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) {
      errors.push('tags must be an array of strings');
    } else if (body.tags.some(t => typeof t !== 'string')) {
      errors.push('each tag must be a string');
    }
  }

  // Numeric fields
  if (body.servings !== undefined && (typeof body.servings !== 'number' || body.servings < 1)) {
    errors.push('servings must be a positive number');
  }
  if (body.prepTime !== undefined && (typeof body.prepTime !== 'number' || body.prepTime < 0)) {
    errors.push('prepTime must be a non-negative number (minutes)');
  }
  if (body.cookTime !== undefined && (typeof body.cookTime !== 'number' || body.cookTime < 0)) {
    errors.push('cookTime must be a non-negative number (minutes)');
  }

  // ingredients: array of { name, quantity, unit }
  if (body.ingredients !== undefined) {
    if (!Array.isArray(body.ingredients)) {
      errors.push('ingredients must be an array');
    } else {
      body.ingredients.forEach((ing, i) => {
        if (!ing || typeof ing !== 'object') {
          errors.push(`ingredients[${i}] must be an object`);
          return;
        }
        if (!ing.name || typeof ing.name !== 'string') {
          errors.push(`ingredients[${i}].name is required and must be a string`);
        }
        if (typeof ing.quantity !== 'number' || ing.quantity <= 0) {
          errors.push(`ingredients[${i}].quantity must be a positive number`);
        }
        if (ing.unit !== undefined && !VALID_UNITS.includes(ing.unit)) {
          errors.push(`ingredients[${i}].unit "${ing.unit}" is not a recognised unit`);
        }
      });
    }
  }

  return errors.length ? { valid: false, errors } : { valid: true };
}

module.exports = { validateRecipe };
