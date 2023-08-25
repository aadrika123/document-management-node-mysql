const express = require("express");

const fs = require('fs');
const path = require('path');

const { createNewFolder, viewFoldersController } = require("../controllers/controllerFolder");
const router = express.Router();


router.route('/create').post(createNewFolder);
router.route('/view-all').post(viewFoldersController);


// Serve static files from the specified directory
const dmsFolderPath = 'C:/dms';

function calculateDirectorySize(directoryPath) {
    let totalSize = 0;

    const files = fs.readdirSync(directoryPath);

    files.forEach(file => {
        const filePath = path.join(directoryPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            totalSize += calculateDirectorySize(filePath);
        } else {
            totalSize += stats.size;
        }
    });

    return totalSize;
}

function bytesToGB(bytes) {
    const gbSize = bytes / (1024 * 1024 * 1024);
    return gbSize.toFixed(2); // Keep two decimal places
}
function bytesToMB(bytes) {
    const gbSize = bytes / (1024 * 1024);
    return gbSize.toFixed(2); // Keep two decimal places
}

router.get('/all', (req, res) => {
    // const dmsFolderPath = path.join(__dirname, '/dms');
    // const dmsFolderPath = express.static('C:/dms');

    fs.readdir(dmsFolderPath, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Error reading folder contents.', err });
        }

        const foldersData = [];

        files.forEach(file => {
            const folderPath = path.join(dmsFolderPath, file);
            const folderStats = fs.statSync(folderPath);

            if (folderStats.isDirectory()) {
                const folderSizeInBytes = calculateDirectorySize(folderPath);
                const folderSizeInMB = bytesToMB(folderSizeInBytes);
                foldersData.push({
                    name: file,
                    createdDate: folderStats.ctime,
                    size: folderSizeInMB + ' MB'
                });
            }
        });

        res.json({ status: true, message: "List of physical folder", folderLocation: dmsFolderPath, data: foldersData });
    });
});





module.exports = router;