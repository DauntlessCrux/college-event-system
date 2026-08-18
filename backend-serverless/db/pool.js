const { Pool } = require('pg');
require('dotenv').config();

// Use Supabase's Supavisor pooler connection string (port 6543, "transaction
// mode") here, not the direct port-5432 URL. In transaction mode a backend
// Postgres connection is held only for the lifetime of one BEGIN...COMMIT
// block, then returned to the pool - exactly matching how every
// multi-statement transaction in services/seat.service.js is scoped, and
// exactly why it's the recommended mode for serverless functions that would
// otherwise open a fresh direct connection per invocation and exhaust
// Postgres's connection limit.
//
// This module creates the pool once at module scope, so a warm Vercel
// function instance reuses it across invocations instead of reconnecting
// every time.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
  max: Number(process.env.PG_POOL_MAX) || 5,
  idleTimeoutMillis: 10_000,
});

module.exports = pool;
