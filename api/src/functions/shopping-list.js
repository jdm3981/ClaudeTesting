const { app } = require('@azure/functions');
const { getPlan }   = require('../db/plans-repo');
const { getRecipe } = require('../db/recipes-repo');
const { aggregate } = require('../lib/shopping-aggregator');

// GET /api/plans/{weekStart}/shopping-list
app.http('shoppingList', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'plans/{weekStart}/shopping-list',
  handler: async (request) => {
    const { weekStart } = request.params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return json(400, { error: 'weekStart must be YYYY-MM-DD' });
    }

    const plan = await getPlan(weekStart);
    if (!plan) {
      return json(404, { error: 'No plan found for this week' });
    }

    // Collect unique recipe IDs across all days and meal types
    const idSet = new Set();
    for (const day of (plan.days ?? [])) {
      (day.lunch  ?? []).forEach(id => idSet.add(id));
      (day.dinner ?? []).forEach(id => idSet.add(id));
    }

    // Fetch all recipes in parallel, skip any that no longer exist
    const recipes = (
      await Promise.all([...idSet].map(id => getRecipe(id)))
    ).filter(Boolean);

    const items = aggregate(recipes);

    return json(200, { weekStart, items });
  },
});

function json(status, data) {
  return {
    status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}
