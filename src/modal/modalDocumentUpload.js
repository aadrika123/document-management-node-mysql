const pool = require('../database')
const executeQuery = require("../components/executeQuery");
const url = process.env.BASEURL;

/**
 * Retrieves the folder complete path where files will be uploaded based on the provided header token.
 * @param {string} folderPathId - Token from the request header.
 * @returns {string|null} - The folder path if found, otherwise null.
 */

exports.getUploadFolderPathIdModal = async (folderPathId) => {
    //Get complete folder path where file is going to  upload
    const result = await executeQuery(`SELECT * FROM folder_paths WHERE id = ?`, [folderPathId]);
    return result[0]?.folder_path ? result[0]?.folder_path : null;
}


exports.documentUploadModal = async (fileDetails) => {

    console.log("fileDetails", fileDetails)

    try {
        // This will get folder name and user id by User Access Token
        const getFolderId = await executeQuery(`SELECT f.* FROM users AS u
        JOIN folders AS f ON f.user_id = u.id
        WHERE u.secret_key =?`, [fileDetails.token]);

        const userId = getFolderId[0]?.user_id;
        const folderId = getFolderId[0]?.id;

        if (folderId) {
            const query = 'INSERT INTO documents (original_file_name, file_name, size, path_id, hash, author, parent_folder_id) VALUES (?,?,?,?,?,?,?)';
            const values = [fileDetails?.originalname, fileDetails?.filename, fileDetails?.size, 1, fileDetails?.computedDigest, userId, folderId];
            const result = await executeQuery(query, values);
            const documentId = result?.insertId;
            if (documentId) { // It will give id document where is uploaded
                const updateMetaData = await executeQuery('insert into meta_data (document_id, attribute, attribute_value) VALUES (?,?,?)', [documentId, 'abc', 'zyx'])
                console.log("updateMetaData", updateMetaData)
            }

            if (result?.affectedRows) return { status: true, message: "Document Upload Success." }
        } else {
            return { status: false, message: "Folder Not Found!" }
        }
    } catch (error) {
        console.error('Error Document upload', error);
        throw new Error('Error in Document Upload : ' + error);
    }
};

/**
 * Retrieves information about a specific document based on the ID and token.
 * @param {number} id - Document ID.
 * @param {string} token - Token from the request.
 * @returns {Object|boolean} - The retrieved document information if found, otherwise false.
 * @throws {Error} - If there is an error while retrieving the document.
 */

exports.viewDocOneModal = async (id, token) => {
    try {
        const client = await pool.connect();
        const query = `SELECT d.id AS documentId, d.size, d.type, d.destination, d.file_name, d.path, d.ip_address, f.folder_token, f.folder_name, f.folder_tags, m.module_name FROM documents AS d
        JOIN folders AS f ON f.id = d.folder_id
        JOIN modules AS m ON m.id = f.module_id
        JOIN tokens AS t ON t.module_id = f.module_id
        WHERE t.status = 1 AND t.token = $1 AND d.id = $2 LIMIT 1`;
        const values = [token, id];
        const result = await client.query(query, values)
        const rows = result.rows[0]
        if (rows) {
            const fullPath = `${url}/${rows?.path}`
            const documentsWithFullPath = { ...rows, fullPath }
            return documentsWithFullPath;
        } else return false;

    } catch (error) {
        console.log("Error Fetch one doc in Modal ==>", error)
        throw new Error('Error Fetch one doc in Modal', error)
    }
}

/**
 * Retrieves information about all documents based on the provided token.
 * @param {string} token - Token from the request.
 * @returns {Array|boolean} - An array of documents with their full paths if found, otherwise false.
 * @throws {Error} - If there is an error while retrieving the documents.
 */

exports.viewAllDocumentsModal = async (token) => {
    try {
        const client = await pool.connect();
        const result = await client.query(`SELECT d.id AS documentId, d.size, d.type, d.destination, d.file_name, d.path, d.ip_address, f.folder_token, f.folder_name, f.folder_tags, m.module_name FROM documents AS d
        JOIN folders AS f ON f.id = d.folder_id
        JOIN modules AS m ON m.id = f.module_id
        JOIN tokens AS t ON t.module_id = f.module_id
        WHERE t.status = 1 AND t.token = $1`, [token]);
        client.release()
        const rows = result.rows[0]
        if (rows) {
            const rows = result.rows;
            const documentsWithFullPath = rows.map((row) => {
                const fullPath = `${url}/uploads/${row.folder_name}/${row.file_name}`; // Replace with your actual document path logic
                return { ...row, fullPath };
            });
            return documentsWithFullPath;
        } else return false;

    } catch (error) {
        console.log("Error in Modal while fetching doc list")
        throw new Error('Error doc list fetch in Modal', error)
    }
}


/**
 * Searches for documents based on the provided search keys.
 * @param {string} searchKeys - Search keys.
 * @returns {Array|boolean} - An array of documents with their full paths if found, otherwise false.
 * @throws {Error} - If there is an error while searching for documents.
 */

exports.searchByTagModal = async (searchKeys) => {

    try {
        const client = await pool.connect();
        const result = await client.query(`SELECT d.id AS documentId, d.size, d.type, d.tags AS documentTags, d.destination, d.file_name, d.path, d.ip_address, f.folder_token, f.folder_name, f.folder_tags FROM documents AS d
        JOIN folders AS f ON f.id =  d.folder_id
        WHERE d.tags LIKE $1;`, [`%${searchKeys}%`]);

        // const keysArray = searchKeys.split(',').map((key) => key.trim());
        // const placeholders = keysArray.map((_, index) => `$${index + 1}`).join(', ');

        // const query = `SELECT *
        // FROM document
        // WHERE tags LIKE ANY(ARRAY[${placeholders}]);`;
        // const result = await client.query(query, keysArray);


        client.release()
        const rows = result.rows[0]
        if (rows) {
            const rows = result.rows;
            const documentsWithFullPath = rows.map((row) => {
                const fullPath = `${url}/${row.path}`; // Replace with your actual document path logic
                return { ...row, fullPath };
            });
            return documentsWithFullPath;
        } else return false;

    } catch (error) {
        console.log("Error in Modal while fetching doc list")
        throw new Error('Error doc list fetch in Modal', error)
    }
}