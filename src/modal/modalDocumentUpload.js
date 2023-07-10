const pool = require('../database')
const executeQuery = require("../components/executeQuery");
const url = process.env.BASEURL;

/**
 * Retrieves the folder name where files will be uploaded based on the provided header token.
 * @param {string} headerToken - Token from the request header.
 * @returns {string|null} - The folder name if found, otherwise null.
 */

exports.getUploadFolderNameModal = async (headerToken) => {
    const client = await pool.connect();
    //Get Folder Name where files will be uploaded.
    const result = await client.query(`SELECT folder_name FROM tokens AS t
	JOIN modules AS m ON m.id = t.module_id
	JOIN folders AS f ON f.module_id = m.id
	WHERE t.token= $1`, [headerToken]);
    client.release();
    console.log("rows[0]", result.rows[0], headerToken)
    return result.rows[0]?.folder_name ? result.rows[0]?.folder_name : null;
}


/**
 * Uploads a document to the database.
 * @param {Object} fileDetails - File details including originalname, encoding, mimetype, destination, filename, path, size, ipAddress, tags, computedDigest, and token.
 * @returns {Object} - The status and message of the upload process.
 * @throws {Error} - If there is an error during document upload.
 */
exports.documentUploadModal = async (fileDetails) => { //myDoc/upload
    // const ipAddress = req.connection.remoteAddress

    console.log("fileDetails", fileDetails)
    return

    try {
        const result = await executeQuery(`SELECT f.module_id, f.id AS folder_id FROM tokens AS t
        JOIN modules AS m ON m.id = t.module_id
        JOIN folders AS f ON f.module_id = m.id
        WHERE t.status = 1 AND t.token = $1`, [fileDetails.token]);
        // return console.log("result",result.rows[0].module_id)
        const moduleId = result?.rows[0]?.module_id;
        const folderId = result?.rows[0]?.folder_id;


        /// Look into moduleId, folder_id *********


        if (moduleId && folderId) {
            const client = await pool.connect();
            const query = 'INSERT INTO documents (original_file_name, encoding, type, destination, file_name, path, size, ip_address, tags, digest, module_id, folder_id) VALUES ($1, $2, $3,$4,$5,$6,$7, $8, $9, $10, $11, $12) RETURNING *';
            const values = [fileDetails.originalname, fileDetails.encoding, fileDetails.mimetype, fileDetails.destination, fileDetails.filename, fileDetails.path, fileDetails.size, fileDetails.ipAddress, fileDetails.tags, fileDetails.computedDigest, moduleId, folderId];
            const result = await client.query(query, values);
            client.release();
            if (result.rows[0]) return { status: true, message: "Document Upload Success." }
        } else {
            client.release()
            return { status: false, message: "Token Not Found or Expired" }
        }
    } catch (error) {
        console.error('Error creating user', error);
        throw new Error('Internal Server Error ModalDocument', error);
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