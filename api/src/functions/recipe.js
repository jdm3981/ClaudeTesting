const { app } = require('@azure/functions');
const { getRecipe, updateRecipe, deleteRecipe } = require('../db/recipes-repo');
const { validateRecipe } = require('../lib/validate');

// GET /api/recipes/{id}
// PUT /api/recipes/{id}
// DELETE /api/recipes/{id}
app.http('recipe', {
  methods: ['GET', 'PUT', 'DELETE'],
  authLevel: 'anonymous',
  route: 'recipes/{id}',
  handler: async (request, context) => {
    const { id } = request.params;

    if (request.method === 'GET') {
      return handleGet(id);
    }
    if (request.method === 'PUT') {
      return handleUpdate(id, request);
    }
    return handleDelete(id);
  },
});

async function handleGet(id) {
  const recipe = await getRecipe(id);
  if (!recipe) return json(404, { error: 'Recipe not found' });
  return json(200, recipe);
}

async function handleUpdate(id, request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const { valid, errors } = validateRecipe(body);
  if (!valid) return json(400, { error: 'Validation failed', details: errors });

  const recipe = await updateRecipe(id, body);
  if (!recipe) return json(404, { error: 'Recipe not found' });
  return json(200, recipe);
}

async function handleDelete(id) {
  const deleted = await deleteRecipe(id);
  if (!deleted) return json(404, { error: 'Recipe not found' });
  return { status: 204 };
}

function json(status, data) {
  return {
    status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}
