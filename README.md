# Meal Planner

A family meal planning web app with a recipe database, weekly planner, and shopping list generation. Hosted on Azure using free/low-cost resources.

## Current Status

| Phase | Description | Status |
|---|---|---|
| 1 | Scaffolding + local dev setup | ✅ Complete |
| 2 | Recipe CRUD API + Cosmos DB | ✅ Complete |
| 3 | Search modal + tag filtering | ⬜ Not started |
| 4 | Weekly plan persistence | ⬜ Not started |
| 5 | Shopping list generation + export | ⬜ Not started |
| 6 | Azure deployment + IaC | ⬜ Not started |

---

## What's Been Built

### Phase 1 — Scaffolding
The original single-file `meal-planner.html` prototype has been restructured into a full-stack modular app:

- **`public/`** — Static frontend served by Azure Static Web Apps
  - `index.html` — Weekly planner page with dynamic week navigation (prev/next week), nav links to future pages
  - `css/app.css` — Full design system (extracted from prototype + extended with nav, shopping list, recipe library styles)
  - `js/utils.js` — Shared helpers: `el()`, `escHtml()`, `getMondayOf()`, `toISODate()`, `debounce()`
  - `js/state.js` — Week state, `getDays()`, `getWeekLabel()`, `prevWeek()`/`nextWeek()`, sample data placeholder
  - `js/api.js` — Fetch wrappers for all future API endpoints (recipes, plans, shopping list, health)
  - `js/planner.js` — Grid builder + full mouse and touch drag-and-drop logic
  - `js/main.js` — Planner page entry point

- **`api/`** — Azure Functions v4 (Node.js)
  - `src/functions/health.js` — `GET /api/health` → `{ status: "ok", timestamp }`
  - `src/index.js` — Central function registration (add requires here for new functions)
  - `package.json` — Dependencies: `@azure/cosmos`, `@azure/functions`

- **`staticwebapp.config.json`** — SWA routing config (`/api/*` → Functions, Node 20 runtime)
- **`.gitignore`** — Excludes `node_modules/`, `local.settings.json`, `.env`

### The Prototype (preserved)
`meal-planner.html` remains in the repo root as the original reference. It is no longer the active app.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Vanilla JS ES modules, no build step |
| Backend | Azure Functions v4 (Node.js 20) |
| Database | Azure Cosmos DB (NoSQL, free tier) |
| Hosting | Azure Static Web Apps (free tier) |
| IaC | Bicep |

**Estimated monthly cost: ~$0.02** (Cosmos DB free tier + Key Vault operations)

---

## Project Structure

```
meal-planner/
├── public/                        ← Static frontend
│   ├── index.html                 ← Planner page (active)
│   ├── recipes.html               ← Recipe library (Phase 3)
│   ├── shopping.html              ← Shopping list (Phase 5)
│   ├── css/app.css
│   └── js/
│       ├── main.js
│       ├── api.js
│       ├── state.js
│       ├── planner.js
│       ├── search-modal.js        ← Phase 3
│       ├── shopping.js            ← Phase 5
│       └── utils.js
│
├── api/                           ← Azure Functions
│   ├── package.json
│   ├── host.json
│   ├── local.settings.json        ← Gitignored (secrets)
│   └── src/
│       ├── index.js               ← Register functions here
│       ├── functions/
│       │   ├── health.js          ✅ Done
│       │   ├── recipes.js         ✅ Done
│       │   ├── recipe.js          ✅ Done
│       │   ├── plan.js            ← Phase 4
│       │   └── shopping-list.js   ← Phase 5
│       ├── db/
│       │   ├── cosmos-client.js   ✅ Done
│       │   ├── recipes-repo.js    ✅ Done
│       │   └── plans-repo.js      ← Phase 4
│       └── lib/
│           ├── shopping-aggregator.js ← Phase 5
│           └── validate.js            ✅ Done
│
├── infra/                         ← Bicep IaC (Phase 6)
│   ├── main.bicep
│   ├── main.bicepparam
│   └── modules/
│       ├── static-web-app.bicep
│       ├── cosmos-db.bicep
│       └── key-vault.bicep
│
├── .github/workflows/
│   ├── deploy.yml                 ← Phase 6
│   └── lint.yml                   ← Phase 6
│
├── staticwebapp.config.json
├── meal-planner.html              ← Original prototype (reference only)
└── README.md
```

---

## Data Models

### Recipe
```json
{
  "id": "uuid-v4",
  "type": "recipe",
  "name": "Butter Chicken",
  "description": "...",
  "emoji": "🍛",
  "tags": ["indian", "gluten-free"],
  "servings": 4,
  "prepTime": 20,
  "cookTime": 35,
  "ingredients": [
    { "name": "chicken breast", "quantity": 500, "unit": "g" }
  ],
  "createdAt": "2026-03-24T00:00:00Z",
  "updatedAt": "2026-03-24T00:00:00Z"
}
```
Cosmos container: `recipes`, partition key: `/type`

### WeeklyPlan
```json
{
  "id": "2026-03-23",
  "type": "plan",
  "weekStart": "2026-03-23",
  "days": [
    { "date": "2026-03-23", "lunch": ["recipe-id-1"], "dinner": ["recipe-id-2"] }
  ],
  "updatedAt": "2026-03-24T12:00:00Z"
}
```
Cosmos container: `plans`, partition key: `/weekStart`. `id` = `weekStart` (ISO Monday date). Each meal slot holds an array of recipe IDs to support multiple dishes per slot.

### ShoppingList (derived, never stored)
```json
{
  "weekStart": "2026-03-23",
  "items": [
    { "name": "chicken breast", "quantity": 1000, "unit": "g", "checked": false }
  ]
}
```
Computed on request by resolving recipe IDs and aggregating ingredients. `checked` state is client-only in `localStorage`.

---

## API Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Health check ✅ |
| GET | `/api/recipes?q=&tags=&ingredient=&limit=&offset=` | Search + list |
| GET | `/api/recipes/{id}` | Single recipe |
| POST | `/api/recipes` | Create recipe |
| PUT | `/api/recipes/{id}` | Update recipe |
| DELETE | `/api/recipes/{id}` | Delete recipe |
| GET | `/api/plans/{weekStart}` | Load plan (404 if none) |
| PUT | `/api/plans/{weekStart}` | Upsert full week |
| DELETE | `/api/plans/{weekStart}` | Clear week |
| GET | `/api/plans/{weekStart}/shopping-list` | Generate shopping list |

---

## Local Development

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| nvm-windows | latest | `winget install CoreyButler.NVMforWindows` |
| Node.js | 20 LTS | `nvm install 20 && nvm use 20` |
| Azure Functions Core Tools | v4 | `npm install -g azure-functions-core-tools@4 --unsafe-perm true` |
| Azure Static Web Apps CLI | latest | `npm install -g @azure/static-web-apps-cli` |
| Docker Desktop | latest | docker.com (needed for Phase 2 Cosmos emulator) |
| Azure CLI | latest | `winget install Microsoft.AzureCLI` (needed for Phase 6) |

> **Node.js version:** Azure Functions Core Tools v4 requires Node.js 18 or 20. v24+ is not supported.

### Running locally

1. Install API dependencies (first time only):
   ```
   cd api && npm install
   ```

2. Start the local dev server from the repo root:
   ```
   swa start public --api-location api
   ```
   This serves the frontend and proxies `/api/*` to the Functions runtime on a single port (4280), mirroring the production SWA routing. No CORS config needed.

3. Open `http://localhost:4280`

4. Verify the API:
   ```
   curl http://localhost:4280/api/health
   ```

### Local settings

`api/local.settings.json` is gitignored. For Phase 1 it only needs the default values (already created). For Phase 2+, add your Cosmos emulator connection string:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOS_CONNECTION_STRING": "AccountEndpoint=https://localhost:8081/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMcZcLU/e4=;"
  }
}
```

---

## Remaining Phases

### Phase 2 — Recipe CRUD API + Database
- Start Cosmos emulator: `docker pull mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator`
- Implement `api/src/db/cosmos-client.js` (singleton `CosmosClient` — initialise once at module load, not per request)
- Implement `recipes-repo.js` with `listRecipes()`, `getRecipe()`, `createRecipe()`, `updateRecipe()`, `deleteRecipe()`
- Implement `api/src/functions/recipes.js` (GET list + POST) and `recipe.js` (GET/PUT/DELETE by id)
- Implement `api/src/lib/validate.js` for recipe schema validation
- Seed database with sample recipes via `cd api && npm run seed`
- Wire `public/js/api.js` + `state.js` to load recipes from API instead of the `SAMPLE` constant
- **Done when:** grid renders from API data, CRUD works via curl

### Phase 3 — Search + Tags
- Add search params to `recipes-repo.js`: Cosmos SQL using `CONTAINS(LOWER(r.name))`, `ARRAY_CONTAINS(r.tags)`, `EXISTS(ingredients WHERE CONTAINS(name))`
- Build `public/js/search-modal.js`: text input, tag chip filters, debounced results, click-to-add-to-cell
- Replace `promptAdd()` in `planner.js` with `openSearchModal(cell)` — modal tracks `pendingCell`, on result click calls `state.addMealToCell()`
- Build `public/recipes.html` + recipe library with add/edit form
- **Done when:** type in search modal, see results, click to add to planner cell

### Phase 4 — Weekly Plan Persistence
- Implement `plans-repo.js` and `plan.js` function (GET/PUT/DELETE)
- Update `state.js`: `loadPlan(weekStart)`, `savePlan()` (debounced 2s), week navigation calls reload
- Wire all DnD drops and card mutations to call `state.savePlan()`
- Add week nav to `state.js` so `prevWeek()`/`nextWeek()` trigger plan reload + grid rebuild
- **Done when:** add a meal, refresh, it's still there; navigate weeks correctly

### Phase 5 — Shopping List
- Implement `api/src/lib/shopping-aggregator.js`: group by `(name.toLowerCase(), unit)`, sum quantities, normalise unit aliases (g/grams, tbsp/tablespoon)
- Implement `api/src/functions/shopping-list.js`: resolve recipe IDs via `Promise.all`, aggregate, return
- Build `public/shopping.html` + `public/js/shopping.js`: checkbox list (check state in `localStorage`), "Export JSON" Blob download, "Clear checked" button
- **Done when:** plan a week, generate list, summed quantities correct, JSON export works

### Phase 6 — Azure Deployment + IaC
- Write Bicep modules: `cosmos-db.bicep` (accepts `useFreeTier: bool`), `key-vault.bicep`, `static-web-app.bicep`
- Run `az deployment group create` to provision resources
- Add SWA deployment token to GitHub Actions secrets
- Customise the auto-generated deploy workflow: `app_location: "public"`, `api_location: "api"`, `output_location: ""`; add post-deploy health check
- Seed production Cosmos with recipes
- **Done when:** app live at `https://<name>.azurestaticapps.net`, all features working

---

## Azure Resources (Phase 6)

| Resource | Tier | Cost |
|---|---|---|
| Static Web Apps | Free | $0/mo |
| Cosmos DB | Free (1000 RU/s, 25GB) | $0/mo |
| Key Vault | Standard | ~$0.01/mo |
| Storage Account | Standard LRS | ~$0.01/mo |
| **Total** | | **~$0.02/mo** |

> If the subscription already has a free Cosmos account, use Cosmos DB Serverless (~$0.25/million RU — still effectively $0 at family-app scale). Set `useFreeTier: false` in `main.bicepparam`.

---

## Key Design Decisions

- **No build step** — ES modules loaded natively by the browser. Adding a bundler is a future option if needed.
- **Multi-page app** — Three HTML pages (`index`, `recipes`, `shopping`) linked by plain `<a href>`. No client-side router.
- **Full-week upsert** — Plan saves are a single PUT of the entire week, debounced 2s. No per-cell API calls.
- **`weekStart` convention** — Always the Monday of the week as `YYYY-MM-DD`. `state.js` normalises `new Date()` to Monday before any API call.
- **Shopping list not stored** — Always derived at request time. `checked` state lives in `localStorage` only.
- **Cosmos singleton** — `cosmos-client.js` initialises `CosmosClient` once at module load. Never initialise per-request — causes cold-start latency and wasted RUs.
- **SWA CLI for local dev** — Runs on port 4280 and proxies `/api/*` to Functions, mirroring production exactly. No CORS config anywhere.
