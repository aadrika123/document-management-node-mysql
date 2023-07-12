const fs = require('fs');
const path = require('path');
const { viewFoldersModal, modalFolderCreate } = require('../modal/folderModal');
const { auditTrailInsert } = require('../modal/modalAuditTrail');
const { modalGetUserDetailsBySecKey } = require('../modal/modalUsers');



// Create new folder
exports.createNewFolder = async (req, res) => {
    const secKey = req.headers.secretekey
    try {

        const result = await modalGetUserDetailsBySecKey(secKey) // Get users details by secrete key
        if (!result) return res.status(500).json({ status: false, message: "Invalid Secrete Key", data: [] })
        const userId = result?.id;

        const { folderName } = req.body;
        const location = "C:\\dms\\uploads"; // Make sure to escape backslashes with an extra backslash

        // Construct the full path for the new folder
        const folderPath = path.join(location, folderName);

        // Check if the folder already exists
        if (fs.existsSync(folderPath)) {
            const resultAuditTrail = await auditTrailInsert(userId, null, `Error : Folder already Exits Folder Name : ${folderName}`); // Create Log - (userId, documentId, action)
            return res.status(409).json({ status: false, message: 'Folder already exists' });
        }

        // Create the new folder
        fs.mkdir(folderPath, async (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ status: false, message: 'Failed to create folder' });
            }
            const result = modalFolderCreate(userId, folderName) // Store folder name in database
            const resultAuditTrail = await auditTrailInsert(userId, null, `Folder created Name : ${folderName}`); // Create Log - (userId, documentId, action)

            res.status(201).json({ status: true, message: 'Folder created successfully' });
        });
    } catch (error) {
        res.status(500).json({ status: false, message: "Error while folder create", error: error.message })
    }
};


// View List of folders
exports.viewFoldersController = async (req, res) => {

    try {

        const result = await viewFoldersModal()
        if (result?.length > 0) {
            res.status(200).json({ status: true, message: "Here is list of folders", data: result })
        } else {
            res.status(200).json({ status: false, message: "No Folder Found", data: [] })
        }

    } catch (err) {
        res.status(500).json({ status: false, message: "Error In View Folders", error: err.message })
    }

}

