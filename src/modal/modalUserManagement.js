const executeQuery = require("../components/executeQuery")


exports.modalViewAllUsers = () => {
  try {

    const result = executeQuery('select * from users');
    console.log("Result", result)
    return result;

  } catch (error) {
    throw new Error(error)
  }
}

exports.modalCreateNewUser = (userId, folderName) => {
  try {
    const result = executeQuery('insert into folders (user_id, folder_name) VALUES (?,?)', [userId, folderName])
    console.log("result in Folder Modal", result)
    return result;
  } catch (error) {
    throw new Error("Failed Insert Folder Info in table" + error)
  }
}

/**
 * View profile details of a user.
 * @param {number} userId - User ID.
 * @returns {Object} - The result of the profile view operation, containing status, message, and data.
 */
exports.viewProfileDetailsModal = async (userId) => {

  try {
    // check if user available or not
    const query = 'SELECT * FROM users WHERE id = ? AND STATUS = 1';
    const values = [userId];
    const result = await executeQuery(query, values);
    if (result.length > 0) {
      return { status: true, message: "Here is Profile Details", data: result[0] }
    } else return { status: false, message: "No Profile Found", data: [] }
  } catch (error) {
    console.error('Error creating user', error);
    throw new Error('Modal Permission Update Error : ' + error.message);
  }
}
exports.modalCreateUser = async (name, email, password, phone, role_id, read_access, write_access, delete_access) => {

  return { status: true, message: "Here is Profile Details", data: { name, email, password, phone, role_id, read_access, write_access, delete_access } }

  try {
    // check if user available or not
    const query = 'insert into folders (user_id, folder_name) VALUES (?,?)';
    const values = [userId];
    const result = await executeQuery(query, values);
    if (result.length > 0) {
      return { status: true, message: "Here is Profile Details", data: result[0] }
    } else return { status: false, message: "No Profile Found", data: [] }
  } catch (error) {
    console.error('Error creating user', error);
    throw new Error('Modal Permission Update Error : ' + error.message);
  }
}