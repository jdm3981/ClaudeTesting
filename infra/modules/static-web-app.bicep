@description('Azure region for the Static Web App. Must be an SWA-supported region.')
param location string

@description('Name for the Static Web App resource.')
param appName string

// ── Static Web App ────────────────────────────────────────────────────────────

resource swa 'Microsoft.Web/staticSites@2023-01-01' = {
  name: appName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  identity: {
    // System-assigned identity used for Key Vault reference access.
    type: 'SystemAssigned'
  }
  properties: {
    buildProperties: {
      appLocation: 'public'
      apiLocation: 'api'
      outputLocation: ''
    }
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────────

output swaName string = swa.name
output defaultHostname string = swa.properties.defaultHostname
@description('API key used as the GitHub Actions deployment token.')
output deploymentToken string = swa.listSecrets().properties.apiKey
@description('Object ID of the system-assigned managed identity — passed to Key Vault for role assignment.')
output identityObjectId string = swa.identity.principalId
