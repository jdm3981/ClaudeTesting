const { randomUUID } = require('crypto');
const { getContainer } = require('./cosmos-client');

const CONTAINER = 'recipes';

/**
 * List/search recipes.
 * @param {{ q?: string, tags?: string, ingredient?: string, limit?: number, offset?: number }} params
 */
async function listRecipes({ q, tags, ingredient, limit = 50, offset = 0 } = {}) {
  const container = getContainer(CONTAINER);

  const conditions = ['r.type = "recipe"'];
  const parameters = [];

  if (q) {
    conditions.push('CONTAINS(LOWER(r.name), @q)');
    parameters.push({ name: '@q', value: q.toLowerCase() });
  }

  if (tags) {
    // tags is a comma-separated string; match any
    const tagList = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    tagList.forEach((tag, i) => {
      const param = `@tag${i}`;
      conditions.push(`ARRAY_CONTAINS(r.tags, ${param})`);
      parameters.push({ name: param, value: tag });
    });
  }

  if (ingredient) {
    conditions.push('EXISTS(SELECT VALUE ing FROM ing IN r.ingredients WHERE CONTAINS(LOWER(ing.name), @ingredient))');
    parameters.push({ name: '@ingredient', value: ingredient.toLowerCase() });
  }

  const where = conditions.join(' AND ');
  const query = {
    query: `SELECT * FROM recipes r WHERE ${where} OFFSET @offset LIMIT @limit`,
    parameters: [
      ...parameters,
      { name: '@offset', value: Number(offset) },
      { name: '@limit',  value: Number(limit)  },
    ],
  };

  const { resources } = await container.items.query(query).fetchAll();
  return resources;
}

/**
 * Get a single recipe by id.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function getRecipe(id) {
  const container = getContainer(CONTAINER);
  try {
    const { resource } = await container.item(id, 'recipe').read();
    return resource ?? null;
  } catch (err) {
    if (err.code === 404) return null;
    throw err;
  }
}

/**
 * Create a new recipe.
 * @param {object} data  Validated recipe fields (no id/timestamps)
 * @returns {Promise<object>}
 */
async function createRecipe(data) {
  const container = getContainer(CONTAINER);
  const now = new Date().toISOString();
  const item = {
    ...data,
    id: randomUUID(),
    type: 'recipe',
    tags: data.tags ?? [],
    ingredients: data.ingredients ?? [],
    createdAt: now,
    updatedAt: now,
  };
  const { resource } = await container.items.create(item);
  return resource;
}

/**
 * Update an existing recipe.
 * @param {string} id
 * @param {object} data  Validated recipe fields
 * @returns {Promise<object|null>}
 */
async function updateRecipe(id, data) {
  const container = getContainer(CONTAINER);

  // Read existing to confirm it exists
  const existing = await getRecipe(id);
  if (!existing) return null;

  const updated = {
    ...existing,
    ...data,
    id,
    type: 'recipe',
    updatedAt: new Date().toISOString(),
  };
  const { resource } = await container.items.upsert(updated);
  return resource;
}

/**
 * Delete a recipe by id.
 * @param {string} id
 * @returns {Promise<boolean>}  true if deleted, false if not found
 */
async function deleteRecipe(id) {
  const container = getContainer(CONTAINER);
  try {
    await container.item(id, 'recipe').delete();
    return true;
  } catch (err) {
    if (err.code === 404) return false;
    throw err;
  }
}

module.exports = { listRecipes, getRecipe, createRecipe, updateRecipe, deleteRecipe };
