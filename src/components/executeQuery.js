const getConnection = require('../database.js');

const executeQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    getConnection()
      .then((connection) => {
        connection.beginTransaction((err) => {
          if (err) {
            connection.release();
            reject(err);
          } else {
            connection.query(query, params, (error, rows) => {
              if (error) {
                connection.rollback(() => {
                  connection.release();
                  reject(error);
                });
              } else {
                connection.commit((err) => {
                  if (err) {
                    connection.rollback(() => {
                      connection.release();
                      reject(err);
                    });
                  } else {
                    connection.release();
                    resolve(rows);
                  }
                });
              }
            });
          }
        });
      })
      .catch((error) => {
        reject(error);
      });
  });
};

module.exports = executeQuery;










// This is working code but commit and rollback is not working with this

// const executeQuery = (query, params = []) => {
//   return new Promise((resolve, reject) => {
//     getConnection()
//       .then((connection) => {
//         connection.query(query, params, (error, rows) => {
//           connection.release(); // Release the connection back to the pool
//           if (error) {
//             reject(error);
//           } else {
//             resolve(rows);
//           }
//         });
//       })
//       .catch((error) => {
//         reject(error);
//       });
//   });
// };

// module.exports = executeQuery;
