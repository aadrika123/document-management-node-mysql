const crypto = require('crypto');
const fs = require('fs');
const { documentUploadModal } = require('../modal/modalDocumentUpload');



exports.documentUploadController = async (req, res) => {  // POST => /myDoc/upload
    //Validation
    // const { error, value } = fileUpload.validate(req.body, { abortEarly: false });
    // if (error) {
    //     const errorMessages = error.details.map(item => item.message);  //Collection Errors
    //     return res.status(400).json({ error: errorMessages });
    // }
    // Header Token
    if (!req.file || !req.headers['x-digest']) {
        // File or digest is missing, handle the error
        res.status(400).json({ status: false, message: 'File or digest is missing.', file: req.file, header: req.headers['x-digest'] });
        return;
    }

    const receivedDigest = req.headers['x-digest']; // Assuming the digest is sent as a request header
    const receivedFile = req.file;// File path of the uploaded file


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
        const ipAddress = req.connection.remoteAddress; // Get IP Address
        const { tags } = req.body; // Get tags form request
        const token = req.headers.token; // Get token from header only for document upload
        const { originalname, encoding, mimetype, destination, filename, path, size } = req.file; // File Details
        const fileDetails = { originalname: originalname, encoding: encoding, mimetype: mimetype, destination: destination, filename: filename, path: path, size: size, ipAddress, tags, token, computedDigest }
        try {
            const result = await documentUploadModal(fileDetails);
            if (result) {
                res.status(201).json({ status: result.status, message: result.message, data: result.date });
            }
        } catch (error) {
            console.error('Catch Error upload document', error);
            res.status(500).json({ error: 'Internal Server Error controller Document upload', msg: error.message });
        }
    }
}
