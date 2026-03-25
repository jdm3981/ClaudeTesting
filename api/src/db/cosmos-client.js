const https            = require('https');
const { CosmosClient } = require('@azure/cosmos');

const connectionString = process.env.COSMOS_CONNECTION_STRING;
if (!connectionString) {
  throw new Error('COSMOS_CONNECTION_STRING environment variable is not set');
}

const DATABASE_ID = 'meal-planner';

// Parse connection string into endpoint + key so we can pass extra client options.
function _parse(cs) {
  const endpoint = cs.match(/AccountEndpoint=([^;]+)/)?.[1];
  const key      = cs.match(/AccountKey=([^;]+)/)?.[1];
  if (!endpoint || !key) throw new Error('Invalid COSMOS_CONNECTION_STRING');
  return { endpoint, key };
}

const { endpoint, key } = _parse(connectionString);

// The local Cosmos emulator uses a self-signed certificate.
// Only disable TLS verification when targeting localhost.
const isLocal = connectionString.includes('localhost');
const agent   = isLocal ? new https.Agent({ rejectUnauthorized: false }) : undefined;

// Singleton — initialised once at module load, never per-request.
const client = new CosmosClient({ endpoint, key, agent });
const database = client.database(DATABASE_ID);

/**
 * Returns a reference to the named Cosmos container.
 * The container must already exist (created by infra or emulator setup).
 * @param {string} containerId
 * @returns {import('@azure/cosmos').Container}
 */
function getContainer(containerId) {
  return database.container(containerId);
}

module.exports = { client, database, getContainer };
