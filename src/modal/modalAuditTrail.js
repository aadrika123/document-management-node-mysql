const executeQuery = require("../components/executeQuery")



exports.auditTrailInsert = (folderName) => {
    try {
        const result = executeQuery('insert into folders (folder_name) VALUES (?)', [folderName])
        console.log("result in Folder Modal", result)
        return result;
    } catch (error) {
        throw new Error("Failed Insert Folder Info in table" + error)
    }
}