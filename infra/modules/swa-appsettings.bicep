@description('Name of the existing Static Web App to configure.')
param swaName string

@description('Versioned Key Vault secret URI for the Cosmos DB connection string.')
param cosmosSecretUri string

resource swaExisting 'Microsoft.Web/staticSites@2023-01-01' existing = {
  name: swaName
}

resource swaAppSettings 'Microsoft.Web/staticSites/config@2023-01-01' = {
  parent: swaExisting
  name: 'appsettings'
  properties: {
    COSMOS_CONNECTION_STRING: '@Microsoft.KeyVault(SecretUri=${cosmosSecretUri})'
  }
}
