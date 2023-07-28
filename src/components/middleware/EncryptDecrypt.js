const CryptoJS = require('crypto-js'); // Import CryptoJS library for AES encryption


//For Encryption Payload
exports.encryptData = async (data, secretKey) => {
  const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(data), secretKey).toString();
  return encryptedData;
};


// For Decryption Payload
exports.decryptData = async (encryptedData, secretKey) => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
  const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  return decryptedData;
};