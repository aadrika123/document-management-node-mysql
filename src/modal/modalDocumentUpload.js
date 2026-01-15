const pool = require("../database");
const executeQuery = require("../components/executeQuery");
const { modalMetaDataInsert } = require("./modalMetaDate");
const { auditTrailInsert } = require("./modalAuditTrail");
const res = require("express/lib/response");
const url = process.env.BASEURL;
const fs = require("fs");
const path = require("path");

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
        "INSERT INTO documents (original_file_name, user_id, unique_id, file_name, size, path_id, reference_no, version, hash, author, parent_folder_id,file_type,isRemoved,  created_date, last_modified, ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0, NOW(), NOW(),)";
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
        fileDetails?.mimetype,
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

exports.modalViewAllDocuments = async (
  role,
  userId,
  limit,
  offset,
  fileTypeFilter
) => {
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

    // Build dynamic WHERE clause and params
    const whereClauses = ["doc.isRemoved = 0"];
    const params = [];

    if (!isAdmin) {
      whereClauses.push("doc.user_id = ?");
      params.push(userId);
    }

    if (fileTypeFilter) {
      const filters = String(fileTypeFilter)
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);
      if (filters.length) {
        const filterConds = [];
        for (const f of filters) {
          filterConds.push("doc.file_name LIKE ?");
          filterConds.push("doc.original_file_name LIKE ?");
          filterConds.push("doc.file_type LIKE ?");
          params.push(`%${f}%`, `%${f}%`, `%${f}%`);
        }
        whereClauses.push("(" + filterConds.join(" OR ") + ")");
      }
    }

    const whereSQL = whereClauses.length
      ? "WHERE " + whereClauses.join(" AND ")
      : "";

    // Count with same filters
    total = await executeQuery(
      `SELECT COUNT(*) as count FROM documents AS doc ${whereSQL}`,
      params
    );

    // Calculate total size for the filtered set
    const sizeRes = await executeQuery(
      `SELECT COALESCE(SUM(doc.size), 0) AS totalSize FROM documents AS doc ${whereSQL}`,
      params
    );
    const totalSizeBytes = Number(sizeRes?.[0]?.totalSize || 0);
    const totalSizeMB = Number((totalSizeBytes / (1024 * 1024)).toFixed(2));
    const totalSizeGB = Number(
      (totalSizeBytes / (1024 * 1024 * 1024)).toFixed(3)
    );

    // Fetch rows with same filters + pagination
    const query = `SELECT 
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
            ${whereSQL}
            ORDER BY doc.created_date DESC
            LIMIT ? OFFSET ?`;

    const rowsParams = params.concat([limitInt, offsetInt]);
    result = await executeQuery(query, rowsParams);

    return {
      documents: result,
      total: total[0].count,
      totalSizeBytes,
      totalSizeMB,
      totalSizeGB,
    };
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

// Recover document by numeric id or unique_id (set isRemoved = 0)
exports.modalRecoverByIdentifier = async (identifier, userId, role) => {
  try {
    const isAdmin = role === 9 || role === "9";
    const isNumericId = String(identifier).match(/^\d+$/) !== null;

    let result;
    if (isAdmin) {
      if (isNumericId) {
        result = await executeQuery(
          `UPDATE documents SET isRemoved = 0, last_modified = NOW() WHERE id = ? AND isRemoved = 1`,
          [identifier]
        );
      } else {
        result = await executeQuery(
          `UPDATE documents SET isRemoved = 0, last_modified = NOW() WHERE unique_id = ? AND isRemoved = 1`,
          [identifier]
        );
      }
    } else {
      if (isNumericId) {
        result = await executeQuery(
          `UPDATE documents SET isRemoved = 0, last_modified = NOW() WHERE id = ? AND user_id = ? AND isRemoved = 1`,
          [identifier, userId]
        );
      } else {
        result = await executeQuery(
          `UPDATE documents SET isRemoved = 0, last_modified = NOW() WHERE unique_id = ? AND user_id = ? AND isRemoved = 1`,
          [identifier, userId]
        );
      }
    }

    return {
      affectedRows: result?.affectedRows || 0,
      success: (result?.affectedRows || 0) > 0,
    };
  } catch (error) {
    throw new Error("Error : " + error);
  }
};

// Permanently delete documents by unique id. Only deletes documents that are soft-deleted (isRemoved = 1).
// Admins can delete any; non-admins can only delete their own documents.
exports.modalPermanentDeleteByUniqueId = async (uniqueId, userId, role) => {
  try {
    const isAdmin = role === 9 || role === "9";

    // Fetch documents (all versions) matching the unique_id and soft-deleted
    let docs;
    if (isAdmin) {
      docs = await executeQuery(
        `SELECT id, file_name, path_id FROM documents WHERE unique_id = ? AND isRemoved = 1`,
        [uniqueId]
      );
    } else {
      docs = await executeQuery(
        `SELECT id, file_name, path_id FROM documents WHERE unique_id = ? AND user_id = ? AND isRemoved = 1`,
        [uniqueId, userId]
      );
    }

    if (!docs || docs.length === 0) {
      return {
        success: false,
        message: "No documents found to delete",
        affectedRows: 0,
      };
    }

    // Delete associated files and meta_data per document
    for (const doc of docs) {
      try {
        // Attempt to get folder path
        const folderRes = await executeQuery(
          `SELECT folder_path FROM folder_paths WHERE id = ?`,
          [doc.path_id]
        );
        const folderPath = folderRes?.[0]?.folder_path;
        if (folderPath && doc.file_name) {
          const filePath = path.join(folderPath, doc.file_name);
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          } catch (fsErr) {
            console.error(
              "modalPermanentDeleteByUniqueId: error deleting file",
              filePath,
              fsErr
            );
            // continue even if file delete fails
          }
        }

        // Delete metadata for this document id
        await executeQuery(`DELETE FROM meta_data WHERE document_id = ?`, [
          doc.id,
        ]);
      } catch (innerErr) {
        console.error(
          "modalPermanentDeleteByUniqueId: error processing document",
          doc,
          innerErr
        );
      }
    }

    // Delete document rows (all versions) - ensure admin/non-admin constraint
    let deleteResult;
    if (isAdmin) {
      deleteResult = await executeQuery(
        `DELETE FROM documents WHERE unique_id = ?`,
        [uniqueId]
      );
    } else {
      deleteResult = await executeQuery(
        `DELETE FROM documents WHERE unique_id = ? AND user_id = ?`,
        [uniqueId, userId]
      );
    }

    // Audit trail
    try {
      await auditTrailInsert(
        userId,
        null,
        `Permanently deleted document(s) for unique_id: ${uniqueId}`
      );
    } catch (auditErr) {
      console.error(
        "modalPermanentDeleteByUniqueId: audit insert failed",
        auditErr
      );
    }

    return {
      success: (deleteResult?.affectedRows || 0) > 0,
      affectedRows: deleteResult?.affectedRows || 0,
    };
  } catch (error) {
    throw new Error("Error : " + error);
  }
};
