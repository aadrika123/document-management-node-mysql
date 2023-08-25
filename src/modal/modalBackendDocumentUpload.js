const pool = require('../database')
const executeQuery = require("../components/executeQuery");
const { modalMetaDataInsert } = require('./modalMetaDate');
const { auditTrailInsert } = require('./modalAuditTrail');
const res = require('express/lib/response');
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

// This is modal For document upload
exports.documentUploadModal = async (fileDetails) => {

    try {
        // Begin the transaction
        await executeQuery('START TRANSACTION');

        // This will get folder name and user id by User Access Token
        const getFolderId = await executeQuery(`SELECT f.* FROM users AS u
        JOIN folders AS f ON f.user_id = u.id
        WHERE u.secret_key =?`, [fileDetails.token]);

        const userId = getFolderId[0]?.user_id; // Get User Id
        const folderId = getFolderId[0]?.id; // Get folder id

        // check the version of a document if the version is available i will increase by one else it will assign version to 1
        const getDocDetails = await executeQuery(`SELECT doc.version, doc.unique_id FROM documents AS doc
        JOIN (SELECT unique_id FROM documents 
            WHERE reference_no = ?
        ) AS uid ON uid.unique_id = doc.unique_id
        ORDER BY id desc
        LIMIT 1`, [fileDetails.referenceNo])
        const version = getDocDetails[0]?.version + 1 || 1;
        const uniqueId = getDocDetails[0]?.unique_id || fileDetails?.uniqueNo; // If Updating the existing document then unique id should be same for multiple other wise new unique no.
        if (folderId) {
            const query = 'INSERT INTO documents (original_file_name, user_id, unique_id, file_name, size, path_id, reference_no, version, hash, author, parent_folder_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)';
            const values = [fileDetails?.originalname, userId, uniqueId, fileDetails?.filename, fileDetails?.size, 1, fileDetails.refNo, version, fileDetails?.computedDigest, userId, folderId];
            const result = await executeQuery(query, values);
            const documentId = result?.insertId;
            if (documentId) { // It will give id document where is uploaded
                const updateMetaData = await modalMetaDataInsert(documentId, fileDetails); // Insert Meta Data in Database (documentId, fileDetails)
            }
            const resultAuditTrail = await auditTrailInsert(userId, documentId, `Document Uploaded : ${fileDetails?.filename}`); // Create Log - (userId, documentId, action)
            if (result?.affectedRows) return { status: true, message: "Document Upload Success.", data: { "ReferenceNo": fileDetails.refNo, "uniqueId": uniqueId } }
        } else {
            return { status: false, message: "Folder Not Found against this token!" }
        }
        // Commit the transaction if everything is successful
        await executeQuery('COMMIT');
    } catch (error) {
        await executeQuery('ROLLBACK');
        console.error('Error Document upload', error);
        throw new Error('Error in Document Upload : ' + error);
    }
};


exports.modalViewBackendDocumentsByUniqueId = async (uniqueId, token) => {
    try {
        const result = await executeQuery(`SELECT 
        doc.original_file_name, 
        doc.unique_id, 
        doc.hash, 
        doc.file_name, 
        doc.size, 
        doc.file_type, 
        doc.reference_no, 
        doc.created_date, 
        doc.last_modified, 
        CONCAT(u.first_name, ' ' ,u.last_name) AS author  
        FROM documents AS doc
	JOIN users AS u
	ON u.id = doc.user_id where unique_id=? AND u.secret_key=?`, [uniqueId, token])
        return result;
    } catch (error) {
        throw new Error('Error : ' + error)
    }
}

// This modal for view document by Reference No
exports.modalViewBackendDocumentsByReference = async (referenceNo, token) => {
    try {
        const result = await executeQuery(`SELECT 
        md.id,
        md.document_id,
        GROUP_CONCAT(DISTINCT md.attribute ORDER BY md.attribute ASC) AS attributes,
        GROUP_CONCAT(DISTINCT md.attribute_value ORDER BY md.attribute ASC) AS attribute_values,
        doc.original_file_name,
        doc.unique_id,
        doc.hash,
        doc.file_name,
        doc.size AS doc_size,
        doc.file_type,
        doc.reference_no,
        doc.created_date,
        doc.last_modified,
        CONCAT(u.first_name, ' ', u.last_name) AS author  
    FROM documents AS doc
    JOIN meta_data AS md ON md.document_id = doc.id
    JOIN users AS u ON u.id = doc.user_id 
    WHERE doc.reference_no = ? AND u.secret_key = ?
    GROUP BY md.id, doc.id`, [referenceNo, token])
        // const result = await executeQuery(`SELECT md.*, doc.original_file_name, doc.unique_id, doc.hash, doc.file_name, doc.size, doc.file_type, doc.reference_no, doc.created_date, doc.last_modified, CONCAT(u.first_name, ' ' ,u.last_name) AS author  FROM documents AS doc
        // JOIN meta_data AS md ON md.document_id = doc.id
        // JOIN users AS u ON u.id = doc.user_id 
        // where doc.reference_no=?`, [referenceNo])
        return result;
    } catch (error) {
        throw new Error('Error : ' + error)
    }
}