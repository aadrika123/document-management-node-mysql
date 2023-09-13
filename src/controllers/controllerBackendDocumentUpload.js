const crypto = require('crypto');
const fs = require('fs');
const Joi = require('joi');
const { MasterData } = require('../components/MasterData');
const { generateDocumentNumber, decodeJWT } = require('../components/MasterFunctions');
const { documentUploadModal, modalViewBackendDocumentsByUniqueId, modalViewBackendDocumentsByReference } = require('../modal/modalBackendDocumentUpload');

// This is function which take data and add full path of document
const addFullImagePathInData = async (data) => {
    const fullPath = data?.map((row) => {
        const fullPath = `${MasterData?.baseAPIUrl}/uploads/${row.file_name}`; // Replace with your actual document path logic
        return { ...row, fullPath };
    });
    return fullPath;
}

// Document Upload
exports.documentBackendUploadController = async (req, res) => {

    // Validation Unique ID Start
    // const validateUploadDoc = Joi.object({
    //     tags: Joi.string().required(),
    //     referenceNo: Joi.string().required(),
    // }).unknown();
    // const { error, value } = validateUploadDoc.validate(req.body, { abortEarly: false });
    // if (error) {
    //     const errorMessages = error.details.map(item => item.message);  //Collection Errors
    //     return res.status(400).json({ error: errorMessages });
    // }
    // Validation Unique ID End

    const token = req.headers.token; // Get token from header only for document upload

    const { tags, referenceNo } = req.body; // Get tag and Reference form request

    if (!token) {
        return res.status(400).json({ status: false, message: 'Token is require.' });
    }

    if (!req.file || !req.headers['x-digest']) {
        // File or digest is missing, handle the error
        res.status(400).json({ status: false, message: 'File or digest is missing.', file: req.file, header: req.headers['x-digest'] });
        return;
    }


    const receivedDigest = req.headers['x-digest']; // Assuming the digest is sent as a request header
    const receivedFile = req.file;// File path of the uploaded file
    const ipAddress = req.connection.remoteAddress; // Get IP Address
    const { originalname, encoding, mimetype, destination, filename, path, size } = receivedFile; // File Details

    const filePath = receivedFile.path;

    console.log("receivedFile", receivedFile)

    // Read the file using fs.readFile
    fs.readFile(filePath, (err, data) => {
        if (err) {
            // Handle error
            return res.status(500).json({ status: false, message: 'Error reading file.' });
        }
        const computedDigest = crypto.createHash('SHA256').update(data).digest('hex');
        // const computedDigest = crypto.createHash('SHA256').update('123').digest('hex');

        if (receivedDigest === computedDigest) {
            handleAfterDocDigestVerify(computedDigest)
        } else {
            res.status(400).json({ status: false, message: 'Invalid file digest...' });
        }
    });

    const handleAfterDocDigestVerify = async (computedDigest) => {

        const generateRefNo = "REF" + Date.now(); // Generate Reference Number
        const uniqueNo = await generateDocumentNumber(8) //Generate Unique No of 8 character for every Document

        const fileDetails = { refNo: generateRefNo, originalname: originalname, encoding: encoding, mimetype: mimetype, destination: destination, filename: filename, path: path, size: size, ipAddress, tags, token, computedDigest, referenceNo, uniqueNo }

        //Generate Reference Number everting when document is going to upload.
        try {
            const result = await documentUploadModal(fileDetails); // Upload Document Modal
            if (result) {
                res.status(201).json({ status: result.status, message: result.message, data: result.data });
            }
        } catch (error) {
            console.error('Catch Error upload document', error);
            res.status(500).json({ error: 'Internal Server Error controller Document upload', msg: error.message });
        }
    }
}


// View Documents by unique id
exports.controllerBackendViewByUniqueId = async (req, res) => {
    try {

        // Validation Unique ID Start
        const validateUniqueId = Joi.object({
            uniqueId: Joi.string().required(),
        }).unknown();
        const { error, value } = validateUniqueId.validate(req.body, { abortEarly: false });
        if (error) {
            const errorMessages = error.details.map(item => item.message);  //Collection Errors
            return res.status(400).json({ error: errorMessages });
        }
        // Validation Unique ID End

        const token = req.headers.token; // Get token from header only for backend access

        if (!token) {
            return res.status(400).json({ status: false, message: 'Header token is require.' });
        }
        const { uniqueId } = req.body;

        const result = await modalViewBackendDocumentsByUniqueId(uniqueId, token) // called modal
        if (result?.length > 0) {
            const data = await addFullImagePathInData(result); // This function Add a key for full image path
            res.status(200).json({ status: true, message: "List of Documents View By Unique Id", data: data })
        } else {
            res.status(200).json({ status: false, message: "No Documents found", data: result })
        }
    } catch (error) {
        res.status(500).json({ status: false, message: "Error while fetching by uid document", error: error.message })
    }
}


// View document by referenced No
exports.controllerBackendViewByReferenceNo = async (req, res) => {
    try {

        // Validation Start
        const validateRefNo = Joi.object({
            referenceNo: Joi.string().required(),
        }).unknown();
        const { error, value } = validateRefNo.validate(req.body, { abortEarly: false });
        if (error) {
            const errorMessages = error.details.map(item => item.message);  //Collection Errors
            return res.status(400).json({ error: errorMessages });
        }
        // Validation End

        const token = req.headers.token; // Get token from header only for backend access

        if (!token) {
            return res.status(400).json({ status: false, message: 'Header token is require.' });
        }
        const { referenceNo } = req.body;
        const result = await modalViewBackendDocumentsByReference(referenceNo, token);

        if (result?.length > 0) {
            const item = result[0]; // Since you're fetching a single document
            const attributes = item.attributes.split(',');
            const attributeValues = item.attribute_values.split(',');

            const attributeData = {};
            attributes.forEach((attribute, index) => {
                attributeData[attribute] = attributeValues[index];
            });

            const documentData = {
                id: item.id,
                document_id: item.document_id,
                originalname: item.original_file_name,
                original_file_name: item.original_file_name,
                encoding: item.encoding,
                mimetype: item.mimetype,
                size: item.doc_size, // Using doc_size from your query result
                unique_id: item.unique_id,
                hash: item.hash,
                file_name: item.file_name,
                file_type: item.file_type,
                reference_no: item.reference_no,
                created_date: item.created_date,
                last_modified: item.last_modified,
                author: item.author,
                fullPath: `${MasterData?.baseAPIUrl}/uploads/${item.file_name}`,
                ...attributeData
            };

            res.status(200).json({ status: true, message: "Document View By Reference No", data: documentData });
        } else {
            res.status(200).json({ status: false, message: "No Documents found against this reference No", data: referenceNo });
        }
    } catch (error) {
        res.status(500).json({ status: false, message: "Error while getting data by reference no", error: error.message });
    }
}



