using './main.bicep'

param appName = 'mealplanner'

// location defaults to the resource group's location — override here if needed.
// param location = 'eastus'

// SWA must be in an SWA-supported region.
param swaLocation = 'eastus2'

// Set to false if your subscription already has a Cosmos DB free-tier account.
// Serverless billing (~$0.25/million RU) is still effectively $0 at family-app scale.
param useFreeTier = true
