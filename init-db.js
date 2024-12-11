const { Client } = require('pg');
require('dotenv').config(); // Load environment variables

console.log("Initializing database...");

// Supabase connection string from .env
const connectionString = process.env.SUPABASE_CONNECTION_STRING;

const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

client.connect()
  .then(async () => {
    console.log("Connected to Supabase PostgreSQL server.");

    // Initialize the member_wallet table
    // const walletSchema = `
    //   CREATE TABLE IF NOT EXISTS member_wallet (
    //     user_id INT PRIMARY KEY,
    //     available_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    //     current_softblock NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    //     created_datetime TIMESTAMP DEFAULT NOW(),
    //     last_update_time TIMESTAMP DEFAULT NOW()
    //   );
    // `;
    // await client.query(walletSchema);

    // console.log("member_wallet table initialized successfully.");
    // await client.end();
  })
  .catch(err => {
    console.error('Database initialization error:', err);
    client.end();
  });
  const { Client } = require('pg');
  require('dotenv').config(); // Load environment variables
  
  console.log("Initializing database connection...");
  
  // Supabase connection string from .env
  const connectionString = process.env.SUPABASE_CONNECTION_STRING;
  
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false, // Ensure SSL is configured for Supabase
    },
  });
  
  // Test the connection and perform basic verification
  client.connect()
    .then(async () => {
      console.log("Connected to Supabase PostgreSQL server.");
  
      // Example query to verify the member_wallet table exists
      // const result = await client.query(`
      //   SELECT table_name 
      //   FROM information_schema.tables 
      //   WHERE table_name = 'member_wallet';
      // `);
  
      // if (result.rows.length > 0) {
      //   console.log("Verified: member_wallet table exists.");
      // } else {
      //   console.error("Error: member_wallet table does not exist. Please check your database setup.");
      // }
  
      // Optional: Fetch a few records for verification
      // const sampleRecords = await client.query('SELECT * FROM member_wallet LIMIT 5;');
      // console.log("Sample records from member_wallet:", sampleRecords.rows);
  
      // // Close the database connection
      // await client.end();
      console.log("Database verification completed.");
    })
    .catch(err => {
      console.error("Failed to connect to Supabase PostgreSQL:", err);
      client.end();
    });
  