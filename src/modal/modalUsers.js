const executeQuery = require("../components/executeQuery")


//Fetch user Details by Secrete Key
exports.modalGetUserDetailsBySecKey = async (secreteKey) => {
    const result = await executeQuery('select * from users where secret_key = ?', [secreteKey])
    return result[0];
}