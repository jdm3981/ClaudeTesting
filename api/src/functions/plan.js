const { app } = require('@azure/functions');
const { getPlan, upsertPlan, deletePlan } = require('../db/plans-repo');

// GET    /api/plans/{weekStart}
// PUT    /api/plans/{weekStart}
// DELETE /api/plans/{weekStart}
app.http('plan', {
  methods: ['GET', 'PUT', 'DELETE'],
  authLevel: 'anonymous',
  route: 'plans/{weekStart}',
  handler: async (request) => {
    const { weekStart } = request.params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return json(400, { error: 'weekStart must be YYYY-MM-DD' });
    }

    if (request.method === 'GET')    return handleGet(weekStart);
    if (request.method === 'PUT')    return handleUpsert(weekStart, request);
    return handleDelete(weekStart);
  },
});

async function handleGet(weekStart) {
  const plan = await getPlan(weekStart);
  if (!plan) return json(404, { error: 'No plan found for this week' });
  return json(200, plan);
}

async function handleUpsert(weekStart, request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  if (!Array.isArray(body.days)) {
    return json(400, { error: 'body.days must be an array' });
  }

  const plan = await upsertPlan(weekStart, { days: body.days });
  return json(200, plan);
}

async function handleDelete(weekStart) {
  const deleted = await deletePlan(weekStart);
  if (!deleted) return json(404, { error: 'No plan found for this week' });
  return { status: 204 };
}

function json(status, data) {
  return {
    status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}
