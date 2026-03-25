const { app } = require('@azure/functions');
const { listRecipes, createRecipe } = require('../db/recipes-repo');
const { validateRecipe } = require('../lib/validate');

// GET /api/recipes?q=&tags=&ingredient=&limit=&offset=
// POST /api/recipes
app.http('recipes', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'recipes',
  handler: async (request, context) => {
    if (request.method === 'GET') {
      return handleList(request, context);
    }
    return handleCreate(request, context);
  },
});

async function handleList(request) {
  const q          = request.query.get('q')          ?? undefined;
  const tags       = request.query.get('tags')       ?? undefined;
  const ingredient = request.query.get('ingredient') ?? undefined;
  const limit      = request.query.get('limit')      ?? undefined;
  const offset     = request.query.get('offset')     ?? undefined;

  const items = await listRecipes({ q, tags, ingredient, limit, offset });
  return json(200, items);
}

async function handleCreate(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const { valid, errors } = validateRecipe(body);
  if (!valid) return json(400, { error: 'Validation failed', details: errors });

  const recipe = await createRecipe(body);
  return json(201, recipe);
}

function json(status, data) {
  return {
    status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}
