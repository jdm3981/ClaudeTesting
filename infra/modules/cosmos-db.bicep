@description('Azure region for the Cosmos DB account.')
param location string

@description('Globally unique name for the Cosmos DB account.')
param accountName string

@description('Use the Cosmos DB free tier (one per subscription). Set false to use Serverless instead.')
param useFreeTier bool = true

// ── Account ──────────────────────────────────────────────────────────────────

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: accountName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    enableFreeTier: useFreeTier
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    // Serverless capability — only applied when not using free tier
    capabilities: useFreeTier ? [] : [{ name: 'EnableServerless' }]
    // Disable public network access is intentionally left open for simplicity;
    // add a private endpoint or IP filter if the app ever leaves free tier.
  }
}

// ── Database ─────────────────────────────────────────────────────────────────

resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmosAccount
  name: 'meal-planner'
  properties: {
    resource: { id: 'meal-planner' }
    // Shared throughput (400 RU/s) only applies to free-tier; serverless ignores this.
    options: useFreeTier ? { throughput: 400 } : {}
  }
}

// ── Containers ───────────────────────────────────────────────────────────────

resource recipesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'recipes'
  properties: {
    resource: {
      id: 'recipes'
      partitionKey: {
        paths: ['/type']
        kind: 'Hash'
        version: 2
      }
    }
  }
}

resource plansContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'plans'
  properties: {
    resource: {
      id: 'plans'
      partitionKey: {
        paths: ['/weekStart']
        kind: 'Hash'
        version: 2
      }
    }
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────────

output accountName string = cosmosAccount.name
@description('Primary connection string — stored in Key Vault by main.bicep.')
output connectionString string = cosmosAccount.listConnectionStrings().connectionStrings[0].connectionString
