const mysql = require('mysql2');
require('dotenv').config();

// MySQL database connection configuration
const pool = mysql.createPool({
  connectionLimit: 10, // Maximum number of connections in the pool
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASS,
  database: process.env.DB,
  port: process.env.DBPORT
});

// Get a connection from the pool
const getConnection = () => {
  return new Promise((resolve, reject) => {
    pool.getConnection((error, connection) => {
      if (error) {
        console.error('Failed to Connect Database:', error);
        reject(error);
      } else {
        console.log('Connected to Database.');
        resolve(connection);
      }
    });
  });
};

module.exports = getConnection;
