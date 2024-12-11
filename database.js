const dotenv = require('dotenv');
const { Pool } = require('pg');

// Load .env variables
dotenv.config();

const pool = new Pool({
    connectionString: process.env.SUPABASE_CONNECTION_STRING,
    ssl: {
        rejectUnauthorized: false,
    },
});

module.exports = pool;
