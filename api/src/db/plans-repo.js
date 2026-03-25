const { getContainer } = require('./cosmos-client');

const CONTAINER = 'plans';

/**
 * Get the weekly plan for a given week start.
 * @param {string} weekStart  YYYY-MM-DD (Monday)
 * @returns {Promise<object|null>}
 */
async function getPlan(weekStart) {
  const container = getContainer(CONTAINER);
  try {
    const { resource } = await container.item(weekStart, weekStart).read();
    return resource ?? null;
  } catch (err) {
    if (err.code === 404) return null;
    throw err;
  }
}

/**
 * Upsert the full weekly plan.
 * @param {string} weekStart  YYYY-MM-DD
 * @param {{ days: Array<{date:string, lunch:string[], dinner:string[]}> }} data
 * @returns {Promise<object>}
 */
async function upsertPlan(weekStart, data) {
  const container = getContainer(CONTAINER);
  const item = {
    ...data,
    id:        weekStart,
    type:      'plan',
    weekStart,
    updatedAt: new Date().toISOString(),
  };
  const { resource } = await container.items.upsert(item);
  return resource;
}

/**
 * Delete the weekly plan.
 * @param {string} weekStart  YYYY-MM-DD
 * @returns {Promise<boolean>}
 */
async function deletePlan(weekStart) {
  const container = getContainer(CONTAINER);
  try {
    await container.item(weekStart, weekStart).delete();
    return true;
  } catch (err) {
    if (err.code === 404) return false;
    throw err;
  }
}

module.exports = { getPlan, upsertPlan, deletePlan };
