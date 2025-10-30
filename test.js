// server.js
// To run: npm init -y && npm install express cors mysql2
// Then set environment variables as provided, e.g., in terminal or .env file
// Run: node server.js
// Test by visiting http://localhost:3030/test-db in browser or via curl

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();

// CORS configuration using the provided origin
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://127.0.0.1:256'
}));

// Environment variables for DB (set them before running the app)
const dbConfig = {
  host: process.env.DB_HOST || '209.74.67.55',
  user: process.env.DB_USER || 'playyyvl_nadeera',
  password: process.env.DB_PASS || 'wdc5n',
  database: process.env.MYSQL_DB || 'playyyvl_nadeera_game'  // Note: You had DB_MYSQL_DB, but assuming it's MYSQL_DB
};

const port = process.env.PORT || 3030;

// Endpoint to test DB connection
app.get('/test-db', (req, res) => {
  const connection = mysql.createConnection(dbConfig);

  connection.connect((err) => {
    if (err) {
      console.error('Connection error:', err);
      return res.status(500).json({ status: 'error', message: 'Failed to connect to the database', details: err.message });
    }
    console.log('Connected to database successfully');
    connection.end();  // Close the connection after test
    return res.status(200).json({ status: 'success', message: 'Connected to the database successfully' });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Test DB connection at http://localhost:${port}/test-db`);
});