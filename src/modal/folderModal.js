const executeQuery = require("../components/executeQuery")


exports.viewFoldersModal = () => {
    try {

        const result = executeQuery('select * from folders');
        console.log("Result", result)
        return result;

    } catch (error) {
        throw new Error(error)
    }
}

exports.modalFolderCreate = (userId, folderName) => {
    try {
        const result = executeQuery('insert into folders (user_id, folder_name) VALUES (?,?)', [userId, folderName])
        console.log("result in Folder Modal", result)
        return result;
    } catch (error) {
        throw new Error("Failed Insert Folder Info in table" + error)
    }
}