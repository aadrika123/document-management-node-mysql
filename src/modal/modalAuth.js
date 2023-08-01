/*
This code file contains functions related to user registration, login, and password change operations.
*/

const executeQuery = require("../components/executeQuery");
const bcrypt = require('bcrypt');
const { MasterData } = require("../components/MasterData");

const saltRounds = 10; // Number of salt rounds for hashing


/**
 * Register a new user.
 * @param {Object} data - User registration data including firstName, lastName, phone, email, password, and secret_key.
 * @returns {Object} - The result of the registration operation, containing status, message, and data.
 */

exports.registerUserModal = async (data) => {
  try {
    const { firstName, lastName, phone, email, password, secret_key } = data;

    // Check if email already exists
    const emailExists = await executeQuery('SELECT COUNT(*) as count FROM users WHERE email = ?', [email]);
    if (emailExists[0].count > 0) return { status: false, message: 'Email already exists', data: [] };
    //Now if all ok then run insertion query
    const query = 'INSERT INTO users (first_name,last_name, phone, email, password, secret_key, status, read_access, write_access, delete_access) VALUES (?, ?, ?, ?, ?, ?,?,?,?,?)';
    const result = await executeQuery(query, [firstName, lastName, phone, email, password, secret_key, 1, 1, 1, 1]); // Will be dynamic in future
    if (result.insertId) {
      return { status: true, message: 'Resignation Successful', data: [] };
    } else return { status: false, message: 'Failed to register', data: [] };
  } catch (error) {
    console.error('Error user registration', error);
    throw new Error('Error user registration : ' + error.message);
  }
};

/**
 * Log in a user.
 * @param {Object} data - User login data including email.
 * @returns {Object} - The user data if login is successful.
 */

exports.loginUserModal = async (data) => {
  try {
    const { email } = data;
    const query = 'SELECT * from users where email = ?';
    const result = await executeQuery(query, [email]);
    return result[0];

  } catch (error) {
    console.error('Error user login', error);
    throw new Error('Internal Server user login' + error.message);
  }
};


/**
 * Change the password of a user.
 * @param {number} userId - User ID.
 * @param {string} userEmail - User email.
 * @param {string} oldPassword - Old password.
 * @param {string} newPassword - New password.
 * @returns {Object} - The result of the password change operation, containing status, message, and data.
 */

exports.changePasswordModal = async (userId, userEmail, oldPassword, newPassword) => {

  const newHashedPassword = await bcrypt.hash(newPassword, saltRounds);

  try {
    // Fetch the current password from the database
    const query = 'SELECT password FROM users WHERE email = ? AND  id = ? AND STATUS = 1';
    const values = [userEmail, userId];
    const result1 = await executeQuery(query, values);
    const fetchedPassword = result1[0].password;

    // Compare the password
    const isMatch = await bcrypt.compare(oldPassword, fetchedPassword);

    if (isMatch) {
      // Update the password in the database
      const query = 'UPDATE users SET password = ? WHERE id = ? AND email = ?';
      const values = [newHashedPassword, userId, userEmail];
      const result = await executeQuery(query, values);
      return { status: true, message: "Password Updated Successfully", data: [] }
    } else return { status: false, message: "Password not matched", data: [] };
  } catch (error) {
    console.error('Error creating user', error);
    throw new Error('Modal Password Change Error : ' + error.message);
  }
}

/**
 * Change the permission of a user.
 * @param {number} userId - User ID.
 * @param {string} read_permission - Read Permission.
 * @param {string} write_permission - Write Permission.
 * @param {string} delete_permission - Delete Permission.
 * @returns {Object} - The result of the permission change operation, containing status, message, and data.
 */

exports.changePermissionModal = async (userId, read_permission, write_permission, delete_permission) => {

  try {
    // check if user available or not
    const query = 'SELECT id FROM users WHERE id = ? AND STATUS = 1';
    const values = [userId];
    const result1 = await executeQuery(query, values);

    if (result1.length > 0) {
      // Update the permission in the database
      const query = 'UPDATE users SET read_access = ?, write_access=?, delete_access=? WHERE id = ?';
      const values = [read_permission, write_permission, delete_permission, userId];
      const result = await executeQuery(query, values);
      if (result.changedRows > 0) {
        return { status: true, message: "Permission Updated Successfully", data: [] }
      } else return { status: false, message: "No changes happened", data: [] }
    } else return { status: false, message: "This user not found", data: [] };
  } catch (error) {
    console.error('Error creating user', error);
    throw new Error('Modal Permission Update Error : ' + error.message);
  }
}


/*
This code file contains a function related to viewing profile details of a user.
*/



exports.selfProfileDetailsModal = async (userId) => {

  try {
    // check if user available or not
    const query = 'SELECT * FROM users WHERE id = ? AND STATUS = 1';
    const values = [userId];
    const result = await executeQuery(query, values);
    console.log("result", result)
    if (result.length > 0) {
      return { status: true, message: "Here is Profile Details", data: result[0] }
    } else return { status: false, message: "No Profile Found", data: [] }
  } catch (error) {
    console.error('Error creating user', error);
    throw new Error('Modal Permission Update Error : ' + error.message);
  }
}
exports.selfProfileUpdateModal = async (userId, firstName, lastName, phone) => {

  try {
    // check if user available or not
    const query = 'SELECT * FROM users WHERE id = ? AND STATUS = 1';
    const values = [userId];
    const result = await executeQuery(query, values);
    console.log("result", result)
    if (result.length > 0) {
      const runQuery = await executeQuery('UPDATE users SET first_name = ?, last_name=?, phone =? WHERE id = ? AND status = 1', [firstName, lastName, phone, userId])
      if (runQuery?.changedRows > 0) {
        return { status: true, message: "Profile Update Successfully", data: [] }
      } else {
        return { status: false, message: "Failed to update profile", data: runQuery }
      }
    } else return { status: false, message: "No Profile Found", data: [] }
  } catch (error) {
    console.error('Error update profile', error);
    throw new Error('Profile Update Error : ' + error.message);
  }
}

exports.revokeAccessTokenModal = async (userId, key) => {

  try {
    // check if user available or not
    const query = 'SELECT * FROM users WHERE id = ? AND STATUS = 1';
    const values = [userId];
    const result = await executeQuery(query, values);
    console.log("result", result)
    if (result.length > 0) {

      const runQuery = await executeQuery('UPDATE users SET secret_key = ? WHERE id = ? AND status = 1', [key, userId])
      if (runQuery?.changedRows > 0) {
        return { status: true, message: "Key Regenerated", data: key }
      } else {
        return { status: false, message: "Failed to Key Regeneration", data: runQuery, key }
      }
    } else return { status: false, message: "No User Found", data: [] }
  } catch (error) {
    console.error('Error creating user', error);
    throw new Error('Modal Permission Update Error : ' + error.message);
  }
}

