const getConnection = require("../../database");

const handleDatabaseError = (req, res, next) => {
    getConnection()
      .then((connection) => {
        connection.release(); // Release the connection back to the pool
        next();
      })
      .catch((error) => {
        console.error('Database connection error:', error);
        res.status(500).json({status:false, error: 'Database Connection Failed', msg:error });
      });
  };

  module.exports = handleDatabaseError;