const getConnection = require('../database.js');

const executeQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    getConnection()
      .then((connection) => {
        connection.query(query, params, (error, rows) => {
          connection.release(); // Release the connection back to the pool
          if (error) {
            reject(error);
          } else {
            resolve(rows);
          }
        });
      })
      .catch((error) => {
        reject(error);
      });
  });
};

module.exports = executeQuery;
