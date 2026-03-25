const { CosmosClient } = require('@azure/cosmos');

const connectionString = process.env.COSMOS_CONNECTION_STRING;
if (!connectionString) {
  throw new Error('COSMOS_CONNECTION_STRING environment variable is not set');
}

const DATABASE_ID = 'meal-planner';

// Singleton — initialised once at module load, never per-request.
const client = new CosmosClient(connectionString);
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
