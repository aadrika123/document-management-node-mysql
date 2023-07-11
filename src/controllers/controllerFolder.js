const fs = require('fs');
const path = require('path');
const { viewFoldersModal, modalFolderCreate } = require('../modal/folderModal');



// Create new folder
exports.createNewFolder = async (req, res) => {
    const { folderName } = req.body;
    const location = "C:\\dms\\uploads"; // Make sure to escape backslashes with an extra backslash

    // Construct the full path for the new folder
    const folderPath = path.join(location, folderName);

    // Check if the folder already exists
    if (fs.existsSync(folderPath)) {
        return res.status(409).json({ status: false, message: 'Folder already exists' });
    }

    // Create the new folder
    fs.mkdir(folderPath, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ status: false, message: 'Failed to create folder' });
        }

        // Store folder name in database
        const result = modalFolderCreate(folderName)
        console.log("result in controller", result)

        res.status(201).json({ status: true, message: 'Folder created successfully' });
    });
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

