const executeQuery = require("../components/executeQuery")


// Insert Activity log in audit_trail table
exports.auditTrailInsert = async (userId, documentId, action) => {
    try {
        const currentTimeStamp = new Date().toISOString().slice(0, 19).replace('T', ' '); // Format current time as YYYY-MM-DD HH:MM:SS
        const result = await executeQuery('insert into audit_trails (user_id, document_id, action, created_at) VALUES (?,?,?,?)', [userId, documentId, action, currentTimeStamp])
        return result;
    } catch (error) {
        throw new Error("Failed Insert data in audit trial" + error)
    }
}