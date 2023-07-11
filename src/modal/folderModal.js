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

exports.modalFolderCreate = (folderName) => {
    try {
        const result = executeQuery('insert into folders (folder_name) VALUES (?)', [folderName])
        console.log("result in Folder Modal", result)
        return result;
    } catch (error) {
        throw new Error("Failed Insert Folder Info in table" + error)
    }
}