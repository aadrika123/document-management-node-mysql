const pool = require("../database");
const executeQuery = require("../components/executeQuery");
const { modalMetaDataInsert } = require("./modalMetaDate");
const { auditTrailInsert } = require("./modalAuditTrail");
const res = require("express/lib/response");
const url = process.env.BASEURL;

// NOTE: To enable soft-delete add the `isRemoved` column to your `documents` table:
// ALTER TABLE documents ADD COLUMN isRemoved TINYINT(1) NOT NULL DEFAULT 0;
// Optionally, ensure timestamps have defaults:
// ALTER TABLE documents MODIFY created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
// ALTER TABLE documents MODIFY last_modified DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

/**
 * Retrieves the folder complete path where files will be uploaded based on the provided header token.
 * @param {string} folderPathId - Token from the request header.
 * @returns {string|null} - The folder path if found, otherwise null.
 */

exports.getUploadFolderPathIdModal = async (folderPathId) => {
  //Get complete folder path where file is going to  upload
  const result = await executeQuery(`SELECT * FROM folder_paths WHERE id = ?`, [
    folderPathId,
  ]);
  return result[0]?.folder_path ? result[0]?.folder_path : null;
};

// This is modal For document upload
exports.documentUploadModal = async (fileDetails) => {
  try {
    // Begin the transaction
    await executeQuery("START TRANSACTION");

    // This will get folder name and user id by User Access Token
    const getFolderId = await executeQuery(
      `SELECT f.* FROM users AS u
        JOIN folders AS f ON f.user_id = u.id
        WHERE u.secret_key =?`,
      [fileDetails.token]
    );

    const userId = getFolderId[0]?.user_id; // Get User Id
    const folderId = getFolderId[0]?.id; // Get folder id

    // check the version of a document if the version is available i will increase by one else it will assign version to 1
    const getDocDetails = await executeQuery(
      `SELECT doc.version, doc.unique_id FROM documents AS doc
        JOIN (SELECT unique_id FROM documents 
            WHERE reference_no = ?
        ) AS uid ON uid.unique_id = doc.unique_id
        ORDER BY id desc
        LIMIT 1`,
      [fileDetails.referenceNo]
    );
    const version = getDocDetails[0]?.version + 1 || 1;
    const uniqueId = getDocDetails[0]?.unique_id || fileDetails?.uniqueNo; // If Updating the existing document then unique id should be same for multiple other wise new unique no.
    if (folderId) {
      // Ensure timestamps and soft-delete flag are set on insert
      const query =
        "INSERT INTO documents (original_file_name, user_id, unique_id, file_name, size, path_id, reference_no, version, hash, author, parent_folder_id, isRemoved, created_date, last_modified) VALUES (?,?,?,?,?,?,?,?,?,?,?, 0, NOW(), NOW())";
      const values = [
        fileDetails?.originalname,
        userId,
        uniqueId,
        fileDetails?.filename,
        fileDetails?.size,
        1,
        fileDetails.refNo,
        version,
        fileDetails?.computedDigest,
        userId,
        folderId,
      ];
      const result = await executeQuery(query, values);
      const documentId = result?.insertId;
      console.log("documentUploadModal: insertedId=", documentId);
      if (documentId) {
        // It will give id document where is uploaded
        const updateMetaData = await modalMetaDataInsert(
          documentId,
          fileDetails
        ); // Insert Meta Data in Database (documentId, fileDetails)
      }
      const resultAuditTrail = await auditTrailInsert(
        userId,
        documentId,
        `Document Uploaded : ${fileDetails?.filename}`
      ); // Create Log - (userId, documentId, action)
      if (result?.affectedRows)
        return {
          status: true,
          message: "Document Upload Success.",
          data: { ReferenceNo: fileDetails.refNo, uniqueId: uniqueId },
        };
    } else {
      return { status: false, message: "Folder Not Found against this token!" };
    }
    // Commit the transaction if everything is successful
    await executeQuery("COMMIT");
  } catch (error) {
    await executeQuery("ROLLBACK");
    console.error("Error Document upload", error);
    throw new Error("Error in Document Upload : " + error);
  }
};

/**
 * Retrieves information about all documents based on the provided token.
 * @param {string} token - Token from the request.
 * @returns {Array|boolean} - An array of documents with their full paths if found, otherwise false.
 * @throws {Error} - If there is an error while retrieving the documents.
 */

exports.modalViewAllDocuments = async (role, userId, limit, offset) => {
  try {
    // Validate and normalize pagination inputs
    const DEFAULT_LIMIT = 20;
    const limitInt =
      Number.isFinite(Number(limit)) && Number(limit) > 0
        ? parseInt(limit)
        : DEFAULT_LIMIT;
    const offsetInt =
      Number.isFinite(Number(offset)) && Number(offset) >= 0
        ? parseInt(offset)
        : 0;

    let result, total;
    // Accept role as number or string (e.g., '9')
    const isAdmin = role === 9 || role === "9";

    if (isAdmin) {
      // Only count documents that are not soft-deleted
      total = await executeQuery(
        `SELECT COUNT(*) as count FROM documents WHERE isRemoved = 0`
      );
      // Interpolate sanitized integers for LIMIT/OFFSET to ensure DB applies pagination
      result = await executeQuery(`SELECT 
            doc.original_file_name, 
            doc.unique_id, 
            doc.hash, 
            doc.file_name, 
            doc.size, 
            doc.file_type, 
            doc.reference_no, 
            doc.created_date, 
            doc.last_modified, CONCAT(u.first_name, ' ' ,u.last_name) AS author  
            FROM documents AS doc
            JOIN users AS u
            ON u.id = doc.user_id
            WHERE doc.isRemoved = 0
            ORDER BY doc.created_date DESC
            LIMIT ${limitInt} OFFSET ${offsetInt}`);
    } else {
      // Only count user's documents that are not soft-deleted
      total = await executeQuery(
        `SELECT COUNT(*) as count FROM documents WHERE user_id=? AND isRemoved = 0`,
        [userId]
      );
      result = await executeQuery(
        `SELECT 
            doc.original_file_name, 
            doc.unique_id, 
            doc.hash, 
            doc.file_name, 
            doc.size, 
            doc.file_type, 
            doc.reference_no, 
            doc.created_date, 
            doc.last_modified, CONCAT(u.first_name, ' ' ,u.last_name) AS author  
            FROM documents AS doc
            JOIN users AS u
            ON u.id = doc.user_id 
            WHERE user_id=? AND doc.isRemoved = 0
            ORDER BY doc.created_date DESC
            LIMIT ${limitInt} OFFSET ${offsetInt}`,
        [userId]
      );
    }

    return { documents: result, total: total[0].count };
  } catch (error) {
    console.error("Error in Modal while fetching doc list", error);
    throw new Error("Error doc list fetch in Modal : " + error);
  }
};

exports.modalViewDocumentsByUniqueId = async (uniqueId, userId) => {
  try {
    const result = await executeQuery(
      `SELECT 
        doc.original_file_name, 
        doc.unique_id, 
        doc.hash, 
        doc.file_name, 
        doc.size, 
        doc.file_type, 
        doc.reference_no, 
        doc.created_date, 
        doc.last_modified, CONCAT(u.first_name, ' ' ,u.last_name) AS author  
        FROM documents AS doc
	JOIN users AS u
	ON u.id = doc.user_id 
    WHERE unique_id=? AND doc.isRemoved = 0`,
      [uniqueId]
    );
    return result;
  } catch (error) {
    throw new Error("Error : " + error);
  }
};
// View soft-deleted (isRemoved = 1) documents with pagination
exports.modalViewRemovedDocuments = async (role, userId, limit, offset) => {
  try {
    const DEFAULT_LIMIT = 20;
    const limitInt =
      Number.isFinite(Number(limit)) && Number(limit) > 0
        ? parseInt(limit)
        : DEFAULT_LIMIT;
    const offsetInt =
      Number.isFinite(Number(offset)) && Number(offset) >= 0
        ? parseInt(offset)
        : 0;

    const isAdmin = role === 9 || role === "9";
    let result, total;

    if (isAdmin) {
      total = await executeQuery(
        `SELECT COUNT(*) as count FROM documents WHERE isRemoved = 1`
      );
      result = await executeQuery(`SELECT 
        doc.original_file_name, 
        doc.unique_id, 
        doc.hash, 
        doc.file_name, 
        doc.size, 
        doc.file_type, 
        doc.reference_no, 
        doc.created_date, 
        doc.last_modified, CONCAT(u.first_name, ' ' ,u.last_name) AS author  
        FROM documents AS doc
        JOIN users AS u ON u.id = doc.user_id
        WHERE doc.isRemoved = 1
        ORDER BY doc.last_modified DESC
        LIMIT ${limitInt} OFFSET ${offsetInt}`);
    } else {
      total = await executeQuery(
        `SELECT COUNT(*) as count FROM documents WHERE user_id=? AND isRemoved = 1`,
        [userId]
      );
      result = await executeQuery(
        `SELECT 
        doc.original_file_name, 
        doc.unique_id, 
        doc.hash, 
        doc.file_name, 
        doc.size, 
        doc.file_type, 
        doc.reference_no, 
        doc.created_date, 
        doc.last_modified, CONCAT(u.first_name, ' ' ,u.last_name) AS author  
        FROM documents AS doc
        JOIN users AS u ON u.id = doc.user_id
        WHERE user_id=? AND doc.isRemoved = 1
        ORDER BY doc.last_modified DESC
        LIMIT ${limitInt} OFFSET ${offsetInt}`,
        [userId]
      );
    }

    return { documents: result, total: total[0].count };
  } catch (error) {
    console.error("Error in Modal while fetching removed doc list", error);
    throw new Error("Error removed doc list fetch in Modal : " + error);
  }
};
// This modal for view document by Reference No
exports.modalViewDocumentsByReference = async (referenceNo) => {
  try {
    const result = await executeQuery(
      `SELECT 
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
    WHERE doc.reference_no = ? AND doc.isRemoved = 0
    GROUP BY md.id, doc.id`,
      [referenceNo]
    );
    // const result = await executeQuery(`SELECT md.*, doc.original_file_name, doc.unique_id, doc.hash, doc.file_name, doc.size, doc.file_type, doc.reference_no, doc.created_date, doc.last_modified, CONCAT(u.first_name, ' ' ,u.last_name) AS author  FROM documents AS doc
    // JOIN meta_data AS md ON md.document_id = doc.id
    // JOIN users AS u ON u.id = doc.user_id
    // where doc.reference_no=?`, [referenceNo])
    return result;
  } catch (error) {
    throw new Error("Error : " + error);
  }
};

// Soft-delete modal: mark document(s) as removed by unique id
exports.modalSoftDeleteByUniqueId = async (uniqueId, userId, role) => {
  try {
    const isAdmin = role === 9 || role === "9";
    let result;
    if (isAdmin) {
      result = await executeQuery(
        `UPDATE documents SET isRemoved = 1, last_modified = NOW() WHERE unique_id = ? AND isRemoved = 0`,
        [uniqueId]
      );
    } else {
      result = await executeQuery(
        `UPDATE documents SET isRemoved = 1, last_modified = NOW() WHERE unique_id = ? AND user_id = ? AND isRemoved = 0`,
        [uniqueId, userId]
      );
    }
    return {
      affectedRows: result?.affectedRows || 0,
      success: (result?.affectedRows || 0) > 0,
    };
  } catch (error) {
    throw new Error("Error : " + error);
  }
};
