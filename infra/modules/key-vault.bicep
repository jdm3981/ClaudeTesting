@description('Azure region for the Key Vault.')
param location string

@description('Globally unique name for the Key Vault (3–24 chars, alphanumeric + hyphens).')
param keyVaultName string

@description('The Cosmos DB connection string to store as a secret.')
@secure()
param cosmosConnectionString string

@description('Object ID of the SWA managed identity that will read secrets.')
param swaIdentityObjectId string

// ── Key Vault ─────────────────────────────────────────────────────────────────

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    // RBAC-based access control (preferred over access policies).
    enableRbacAuthorization: true
    // Soft delete with a short retention window — fine for non-production secrets.
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
  }
}

// ── Secret ────────────────────────────────────────────────────────────────────

resource cosmosSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'cosmos-connection-string'
  properties: {
    value: cosmosConnectionString
  }
}

// ── Role assignment — Key Vault Secrets User ──────────────────────────────────
// Built-in role: 4633458b-17de-408a-b874-0445c86b69e6

var kvSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'

resource kvRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyVault
  // Deterministic GUID so re-deployments are idempotent.
  name: guid(keyVault.id, swaIdentityObjectId, kvSecretsUserRoleId)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsUserRoleId)
    principalId: swaIdentityObjectId
    principalType: 'ServicePrincipal'
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────────

output keyVaultName string = keyVault.name
@description('Versioned URI of the Cosmos connection string secret — used in SWA Key Vault reference.')
output cosmosSecretUri string = cosmosSecret.properties.secretUri
