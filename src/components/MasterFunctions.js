const jwt = require('jsonwebtoken');
const crypto = require('crypto');


exports.decodeJWT = async (token) => {
    try {
        const decoded = jwt.verify(token, 'mysecretkey'); // Replace 'your_secret_key' with your actual secret key
        return decoded;
    } catch (error) {
        return null; // Invalid token or token verification failed
    }
}

/**
 ##### it will return ###
 * userId: 53,
 * userName: 'dipu',
 * userEmail: 'student@gmail.com',
 * iat: 1686116878,
 * exp: 1686120478
*/


exports.decodeToken = async (data) => {  // use =>  const userDetails = await decodeToken(req?.headers)
    try {
        const token = data?.authorization?.split(' ')[1];
        if (!token) return res.status(201).json({ "status": false, message: "Please Send token", data: [] });
        const userDetails = await this.decodeJWT(token)
        if (!userDetails) return res.status(201).json({ "status": false, message: "Invalid Token", data: [] });
        return userDetails;
    } catch (error) {
        return error; // Invalid token or token verification failed
    }
}



/**
 * Generates a random token number of the specified length.
 * @param {number} length - The desired length of the token number.
 * @returns {string} The randomly generated token number. eg- 5AHJw9pr33
 * How to use => const token = generateRandomNumberWithString(10);
 */

exports.generateRandomNumberWithString = async (length) => {
    try {

        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';

        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            token += characters.charAt(randomIndex);
        }
        if (!token) return res.status(500).json({ "status": false, message: "Error Generating Secrete Key", data: [] });
        return token;
    } catch (error) {
        return res.status(500).json({ "status": false, message: "Internal Server Error", data: error.message });
    }
}

// Generate a unique document number
exports.generateDocumentNumber = (length) => {
    const randomBytes = crypto.randomBytes(length); // Generate 8 random bytes
    const documentNumber = randomBytes.toString('hex'); // Convert random bytes to a hexadecimal string
    return documentNumber;
}

