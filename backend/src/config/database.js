/**
 * Database Configuration
 * PostgreSQL connection settings for k1 schema (platform database)
 */

require('dotenv').config();
const { Pool } = require('pg');

// Database configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'workflowpp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create a connection pool
const pool = new Pool(config);

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('[Database] Unexpected error on idle client', err);
  process.exit(-1);
});

// Test connection
pool.on('connect', () => {
  console.log('[Database] Connected to PostgreSQL database');
});

/**
 * Execute a query
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('[Database] Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('[Database] Query error:', error.message);
    throw error;
  }
}

/**
 * Get a client from the pool (for transactions)
 */
async function getClient() {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);

  // Set a timeout to prevent hanging transactions
  const timeout = setTimeout(() => {
    console.error('[Database] Client checkout timeout');
  }, 5000);

  client.query = (...args) => {
    clearTimeout(timeout);
    return query(...args);
  };

  client.release = () => {
    clearTimeout(timeout);
    client.query = query;
    client.release = release;
    return release();
  };

  return client;
}

/**
 * Execute a transaction
 */
async function transaction(callback) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close the pool (for graceful shutdown)
 */
async function close() {
  await pool.end();
  console.log('[Database] Connection pool closed');
}

module.exports = {
  query,
  getClient,
  transaction,
  close,
  pool
};
