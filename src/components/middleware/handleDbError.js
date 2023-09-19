const getConnection = require("../../database");

const test = {
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASS,
  database: process.env.DB,
  port: process.env.DBPORT
}

const handleDatabaseError = (req, res, next) => {
  getConnection()
    .then((connection) => {
      connection.release(); // Release the connection back to the pool
      next();
    })
    .catch((error) => {
      console.error('Database connection error:', error);
      res.status(500).json({ status: false, message: 'Database Connection Failed', data: error, test: test });
    });
};

module.exports = handleDatabaseError;