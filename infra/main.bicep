// ── Parameters ────────────────────────────────────────────────────────────────

@description('Base name used to derive all resource names (e.g. "mealplanner").')
param appName string

@description('Azure region for Cosmos DB, Key Vault, and resource group. Defaults to the RG location.')
param location string = resourceGroup().location

@description('Azure region for the Static Web App. Must be an SWA-supported region.')
param swaLocation string = 'eastus2'

@description('Use Cosmos DB free tier. Set false if the subscription already has a free-tier account.')
param useFreeTier bool = true

// ── Derived resource names ────────────────────────────────────────────────────

var cosmosAccountName = '${appName}-cosmos'
var keyVaultName      = '${appName}-kv'
var swaName           = '${appName}-swa'

// ── Modules ───────────────────────────────────────────────────────────────────

module cosmos 'modules/cosmos-db.bicep' = {
  name: 'cosmos'
  params: {
    location: location
    accountName: cosmosAccountName
    useFreeTier: useFreeTier
  }
}

module swa 'modules/static-web-app.bicep' = {
  name: 'swa'
  params: {
    location: swaLocation
    appName: swaName
  }
}

// Key Vault depends on both Cosmos (for the connection string)
// and the SWA (for the managed identity object ID).
module kv 'modules/key-vault.bicep' = {
  name: 'kv'
  params: {
    location: location
    keyVaultName: keyVaultName
    cosmosConnectionString: cosmos.outputs.connectionString
    swaIdentityObjectId: swa.outputs.identityObjectId
  }
}

// ── SWA app settings (Key Vault reference) ────────────────────────────────────
// Separated into its own module so the existing SWA resource can be resolved
// correctly after both the SWA and Key Vault modules have completed.

module swaAppSettings 'modules/swa-appsettings.bicep' = {
  name: 'swaAppSettings'
  params: {
    swaName: swa.outputs.swaName
    cosmosSecretUri: kv.outputs.cosmosSecretUri
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────────

@description('Live URL of the deployed app.')
output appUrl string = 'https://${swa.outputs.defaultHostname}'

@description('Add this token to GitHub Actions secrets as AZURE_STATIC_WEB_APPS_API_TOKEN.')
output deploymentToken string = swa.outputs.deploymentToken

@description('Add this hostname to GitHub Actions secrets as SWA_HOSTNAME.')
output swaHostname string = swa.outputs.defaultHostname
