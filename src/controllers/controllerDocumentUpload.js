const crypto = require('crypto');
const fs = require('fs');
const { generateDocumentNumber } = require('../components/MasterFunctions');
const { documentUploadModal, modalViewAllDocuments, modalViewDocumentsByUniqueId, modalViewDocumentsByReference } = require('../modal/modalDocumentUpload');

// This is function which take data and add full path of document
const addFullImagePathInData = async (data) => {
    const fullPath = data?.map((row) => {
        const fullPath = `http://localhost:8001/uploads/${row.file_name}`; // Replace with your actual document path logic
        return { ...row, fullPath };
    });
    return fullPath;
}

// Document Upload
exports.documentUploadController = async (req, res) => {

    const { tags, referenceNo } = req.body; // Get tag and Reference form request

    if (!req.file || !req.headers['x-digest']) {
        // File or digest is missing, handle the error
        res.status(400).json({ status: false, message: 'File or digest is missing.', file: req.file, header: req.headers['x-digest'] });
        return;
    }

    const receivedDigest = req.headers['x-digest']; // Assuming the digest is sent as a request header
    const receivedFile = req.file;// File path of the uploaded file
    const ipAddress = req.connection.remoteAddress; // Get IP Address
    const token = req.headers.token; // Get token from header only for document upload
    const { originalname, encoding, mimetype, destination, filename, path, size } = req.file; // File Details

    const filePath = receivedFile.path;

    // Read the file using fs.readFile
    fs.readFile(filePath, (err, data) => {
        if (err) {
            // Handle error
            return res.status(500).json({ status: false, message: 'Error reading file.' });
        }
        // const computedDigest = crypto.createHash('SHA256').update(data).digest('hex');
        const computedDigest = crypto.createHash('SHA256').update('123').digest('hex');

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
            const result = await documentUploadModal(fileDetails);
            if (result) {
                res.status(201).json({ status: result.status, message: result.message, data: result.data });
            }
        } catch (error) {
            console.error('Catch Error upload document', error);
            res.status(500).json({ error: 'Internal Server Error controller Document upload', msg: error.message });
        }
    }
}


// View All the documents
exports.controllerViewAllDocuments = async (req, res) => {
    try {
        const result = await modalViewAllDocuments(); // called modal for view all documents
        if (result?.length > 0) {
            const data = await addFullImagePathInData(result); // This function Add a key for full image path
            res.status(200).json({ status: true, message: "List of Documents", data: data })
        } else {
            res.status(200).json({ status: false, message: "No Documents found", data: [] })
        }
    } catch (error) {
        res.status(500).json({ status: false, message: "Error while fetching all document", error: error.message })
    }
}

// View Documents by unique id
exports.controllerViewByUniqueId = async (req, res) => {
    try {
        const { uniqueId } = req.body;
        const result = await modalViewDocumentsByUniqueId(uniqueId) // called modal
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
exports.controllerViewByReferenceNo = async (req, res) => {
    try {
        const { referenceNo } = req.body;
        const result = await modalViewDocumentsByReference(referenceNo) // called modal 
        if (result?.length > 0) {
            const data = await addFullImagePathInData(result); // This function Add a key for full image path
            res.status(200).json({ status: true, message: "Document View By Reference No", data: data[0] })
        } else {
            res.status(200).json({ status: false, message: "No Documents found against this reference No", data: referenceNo })
        }
    } catch (error) {
        res.status(500).json({ status: false, message: "Error while getting data by reference no", error: error.message })
    }
}