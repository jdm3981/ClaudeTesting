/**
 * Seed script — populates the Cosmos DB `recipes` container with sample data.
 *
 * Usage (from api/ directory):
 *   npm run seed
 *
 * Requires COSMOS_CONNECTION_STRING in the environment (or falls back to the
 * well-known Cosmos emulator connection string).
 *
 * Safe to run multiple times: uses upsert so existing records are updated in place.
 */

'use strict';

const https            = require('https');
const { CosmosClient } = require('@azure/cosmos');
const { randomUUID }   = require('crypto');

// Resolution order:
//   1. COSMOS_CONNECTION_STRING environment variable
//   2. local.settings.json (same file the Functions runtime reads)
//   3. Well-known Windows emulator default key
function resolveConnectionString() {
  if (process.env.COSMOS_CONNECTION_STRING) return process.env.COSMOS_CONNECTION_STRING;
  try {
    const settings = JSON.parse(require('fs').readFileSync(
      require('path').join(__dirname, 'local.settings.json'), 'utf8'
    ));
    const cs = settings?.Values?.COSMOS_CONNECTION_STRING;
    if (cs) return cs;
  } catch { /* file absent or unreadable — fall through */ }
  return 'AccountEndpoint=https://localhost:8081/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMcZcLU/e4=;';
}

const CONNECTION_STRING = resolveConnectionString();

// Parse connection string into endpoint + key so we can pass extra options.
// The SDK's connectionString shorthand doesn't support the agent option.
function parseConnectionString(cs) {
  const endpoint = cs.match(/AccountEndpoint=([^;]+)/)?.[1];
  const key      = cs.match(/AccountKey=([^;]+)/)?.[1];
  if (!endpoint || !key) throw new Error('Invalid COSMOS_CONNECTION_STRING');
  return { endpoint, key };
}

// The local Cosmos emulator uses a self-signed certificate.
// Only disable TLS verification when targeting localhost.
const isLocal = CONNECTION_STRING.includes('localhost');
const agent   = isLocal ? new https.Agent({ rejectUnauthorized: false }) : undefined;

const DATABASE_ID  = 'meal-planner';
const CONTAINER_ID = 'recipes';

// ── Sample recipes ──────────────────────────────────────────────────────────

const SAMPLES = [
  {
    name: 'Caesar Salad',
    description: 'Classic romaine salad with creamy Caesar dressing and croutons.',
    emoji: '🥗',
    tags: ['salad', 'vegetarian', 'quick'],
    servings: 2,
    prepTime: 15,
    cookTime: 0,
    ingredients: [
      { name: 'romaine lettuce', quantity: 1, unit: 'piece' },
      { name: 'Caesar dressing', quantity: 60, unit: 'ml' },
      { name: 'parmesan', quantity: 30, unit: 'g' },
      { name: 'croutons', quantity: 50, unit: 'g' },
    ],
  },
  {
    name: 'Club Sandwich',
    description: 'Triple-decker sandwich with turkey, bacon, lettuce, and tomato.',
    emoji: '🥪',
    tags: ['sandwich', 'lunch'],
    servings: 1,
    prepTime: 10,
    cookTime: 5,
    ingredients: [
      { name: 'white bread', quantity: 3, unit: 'slice' },
      { name: 'turkey breast', quantity: 80, unit: 'g' },
      { name: 'bacon', quantity: 2, unit: 'slice' },
      { name: 'lettuce', quantity: 2, unit: 'slice' },
      { name: 'tomato', quantity: 2, unit: 'slice' },
      { name: 'mayonnaise', quantity: 2, unit: 'tbsp' },
    ],
  },
  {
    name: 'Tomato Soup',
    description: 'Rich and smooth tomato soup, best served with crusty bread.',
    emoji: '🍲',
    tags: ['soup', 'vegetarian', 'comfort'],
    servings: 4,
    prepTime: 10,
    cookTime: 25,
    ingredients: [
      { name: 'canned tomatoes', quantity: 800, unit: 'g' },
      { name: 'onion', quantity: 1, unit: 'piece' },
      { name: 'garlic', quantity: 2, unit: 'piece' },
      { name: 'vegetable stock', quantity: 500, unit: 'ml' },
      { name: 'cream', quantity: 100, unit: 'ml' },
    ],
  },
  {
    name: 'BLT Wrap',
    description: 'Bacon, lettuce, and tomato in a flour tortilla with herbed mayo.',
    emoji: '🌯',
    tags: ['wrap', 'lunch', 'quick'],
    servings: 1,
    prepTime: 10,
    cookTime: 5,
    ingredients: [
      { name: 'flour tortilla', quantity: 1, unit: 'piece' },
      { name: 'bacon', quantity: 3, unit: 'slice' },
      { name: 'lettuce', quantity: 2, unit: 'slice' },
      { name: 'tomato', quantity: 1, unit: 'piece' },
      { name: 'mayonnaise', quantity: 1, unit: 'tbsp' },
    ],
  },
  {
    name: 'Avocado Toast',
    description: 'Toasted sourdough with smashed avocado, chilli flakes, and lemon.',
    emoji: '🥑',
    tags: ['light', 'vegetarian', 'quick'],
    servings: 2,
    prepTime: 5,
    cookTime: 5,
    ingredients: [
      { name: 'sourdough bread', quantity: 2, unit: 'slice' },
      { name: 'avocado', quantity: 1, unit: 'piece' },
      { name: 'lemon juice', quantity: 1, unit: 'tbsp' },
      { name: 'chilli flakes', quantity: 1, unit: 'pinch' },
    ],
  },
  {
    name: 'Fruit Salad',
    description: 'Fresh seasonal fruit with a honey-lime dressing.',
    emoji: '🍓',
    tags: ['side', 'vegetarian', 'healthy'],
    servings: 4,
    prepTime: 15,
    cookTime: 0,
    ingredients: [
      { name: 'strawberries', quantity: 150, unit: 'g' },
      { name: 'blueberries', quantity: 100, unit: 'g' },
      { name: 'melon', quantity: 200, unit: 'g' },
      { name: 'honey', quantity: 1, unit: 'tbsp' },
      { name: 'lime juice', quantity: 1, unit: 'tbsp' },
    ],
  },
  {
    name: 'Eggs Benedict',
    description: 'Poached eggs on English muffins with Canadian bacon and hollandaise.',
    emoji: '🍳',
    tags: ['brunch', 'breakfast'],
    servings: 2,
    prepTime: 10,
    cookTime: 15,
    ingredients: [
      { name: 'eggs', quantity: 4, unit: 'piece' },
      { name: 'English muffins', quantity: 2, unit: 'piece' },
      { name: 'Canadian bacon', quantity: 4, unit: 'slice' },
      { name: 'hollandaise sauce', quantity: 80, unit: 'ml' },
    ],
  },
  {
    name: 'Pasta Carbonara',
    description: 'Classic Roman pasta with eggs, pecorino, guanciale, and black pepper.',
    emoji: '🍝',
    tags: ['italian', 'pasta', 'comfort'],
    servings: 4,
    prepTime: 10,
    cookTime: 20,
    ingredients: [
      { name: 'spaghetti', quantity: 400, unit: 'g' },
      { name: 'guanciale', quantity: 150, unit: 'g' },
      { name: 'eggs', quantity: 4, unit: 'piece' },
      { name: 'pecorino romano', quantity: 80, unit: 'g' },
      { name: 'black pepper', quantity: 1, unit: 'tsp' },
    ],
  },
  {
    name: 'Grilled Salmon',
    description: 'Pan-seared salmon fillet with lemon butter and capers.',
    emoji: '🐟',
    tags: ['seafood', 'healthy', 'gluten-free'],
    servings: 2,
    prepTime: 5,
    cookTime: 12,
    ingredients: [
      { name: 'salmon fillet', quantity: 300, unit: 'g' },
      { name: 'butter', quantity: 30, unit: 'g' },
      { name: 'lemon', quantity: 1, unit: 'piece' },
      { name: 'capers', quantity: 1, unit: 'tbsp' },
    ],
  },
  {
    name: 'Beef Stir Fry',
    description: 'Tender beef strips with mixed vegetables in a savory soy-ginger sauce.',
    emoji: '🥩',
    tags: ['asian', 'quick', 'gluten-free'],
    servings: 4,
    prepTime: 15,
    cookTime: 10,
    ingredients: [
      { name: 'beef sirloin', quantity: 400, unit: 'g' },
      { name: 'broccoli', quantity: 200, unit: 'g' },
      { name: 'bell pepper', quantity: 1, unit: 'piece' },
      { name: 'soy sauce', quantity: 3, unit: 'tbsp' },
      { name: 'ginger', quantity: 1, unit: 'tsp' },
      { name: 'sesame oil', quantity: 1, unit: 'tbsp' },
    ],
  },
  {
    name: 'Butter Chicken',
    description: 'Tender chicken in a rich, creamy tomato-based curry sauce.',
    emoji: '🍛',
    tags: ['indian', 'gluten-free', 'curry'],
    servings: 4,
    prepTime: 20,
    cookTime: 35,
    ingredients: [
      { name: 'chicken breast', quantity: 500, unit: 'g' },
      { name: 'butter', quantity: 50, unit: 'g' },
      { name: 'canned tomatoes', quantity: 400, unit: 'g' },
      { name: 'cream', quantity: 150, unit: 'ml' },
      { name: 'garam masala', quantity: 2, unit: 'tsp' },
      { name: 'ginger paste', quantity: 1, unit: 'tbsp' },
      { name: 'garlic paste', quantity: 1, unit: 'tbsp' },
    ],
  },
  {
    name: 'Margherita Pizza',
    description: 'Neapolitan-style pizza with San Marzano tomatoes, fresh mozzarella, and basil.',
    emoji: '🍕',
    tags: ['italian', 'vegetarian'],
    servings: 2,
    prepTime: 60,
    cookTime: 12,
    ingredients: [
      { name: 'pizza dough', quantity: 250, unit: 'g' },
      { name: 'San Marzano tomatoes', quantity: 200, unit: 'g' },
      { name: 'fresh mozzarella', quantity: 150, unit: 'g' },
      { name: 'fresh basil', quantity: 10, unit: 'g' },
      { name: 'olive oil', quantity: 1, unit: 'tbsp' },
    ],
  },
  {
    name: 'BBQ Ribs',
    description: 'Slow-cooked pork ribs glazed with smoky barbecue sauce.',
    emoji: '🍖',
    tags: ['bbq', 'pork', 'comfort'],
    servings: 4,
    prepTime: 15,
    cookTime: 180,
    ingredients: [
      { name: 'pork ribs', quantity: 1200, unit: 'g' },
      { name: 'BBQ sauce', quantity: 200, unit: 'ml' },
      { name: 'smoked paprika', quantity: 2, unit: 'tsp' },
      { name: 'garlic powder', quantity: 1, unit: 'tsp' },
      { name: 'brown sugar', quantity: 2, unit: 'tbsp' },
    ],
  },
  {
    name: 'Roast Chicken',
    description: 'Whole roast chicken with herb butter, roasted vegetables, and pan gravy.',
    emoji: '🍗',
    tags: ['classic', 'sunday', 'gluten-free'],
    servings: 4,
    prepTime: 20,
    cookTime: 90,
    ingredients: [
      { name: 'whole chicken', quantity: 1500, unit: 'g' },
      { name: 'butter', quantity: 60, unit: 'g' },
      { name: 'garlic', quantity: 4, unit: 'piece' },
      { name: 'thyme', quantity: 5, unit: 'g' },
      { name: 'lemon', quantity: 1, unit: 'piece' },
      { name: 'carrots', quantity: 200, unit: 'g' },
      { name: 'potatoes', quantity: 400, unit: 'g' },
    ],
  },
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { endpoint, key } = parseConnectionString(CONNECTION_STRING);
  const client   = new CosmosClient({ endpoint, key, agent });
  const database = client.database(DATABASE_ID);

  // Ensure database and container exist (idempotent)
  await client.databases.createIfNotExists({
    id: DATABASE_ID,
  });
  await database.containers.createIfNotExists({
    id: CONTAINER_ID,
    partitionKey: { paths: ['/type'] },
  });

  const container = database.container(CONTAINER_ID);
  const now       = new Date().toISOString();

  console.log(`Seeding ${SAMPLES.length} recipes into ${DATABASE_ID}/${CONTAINER_ID} …`);

  for (const sample of SAMPLES) {
    const item = {
      ...sample,
      id: randomUUID(),
      type: 'recipe',
      createdAt: now,
      updatedAt: now,
    };
    await container.items.upsert(item);
    console.log(`  ✓ ${item.emoji}  ${item.name}`);
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
