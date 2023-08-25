const multer = require('multer');
const { getUploadFolderPathIdModal } = require('../../modal/modalDocumentUpload');

const uploadedFiles = {};

exports.uploadFileUsingMulter = async (req, res, next) => {
    const folderPathId = req.headers.folderpathid;
    if (!folderPathId) return res.status(422).json({ status: false, message: 'Folder Path ID Require.', data: [] });

    //Get Folder name form db by token from header
    const folderPath = await getUploadFolderPathIdModal(folderPathId);
    
    if(!folderPath) return res.status(500).json({status:false, message:"Invalid Folder Id : " + folderPathId, data:[]})

    console.log("folderName", folderPath)
    // return

    const upload = multer({
        storage: multer.diskStorage({
            destination: function (req, file, cb) {

                cb(null, folderPath); // Destination folder / File uploaded folder
            },
            filename: function (req, file, cb) {
                const originalExtension = file.originalname.split('.').pop();
                const newFileName = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.' + originalExtension;
                uploadedFiles[file.originalname] = newFileName;
                cb(null, newFileName);
            },
        }),
    }).single('file');

    upload(req, res, function (err) {
        if (err) {
            // Handle the file upload error
            console.error(err);
            return res.status(500).json({ message: 'File upload failed.' });
        }
        next();
    });
};







// const uploadedFiles = {};

// exports.uploadFileUsingMulter = multer({
//     storage: multer.diskStorage({
//         destination: function (req, file, cb) {
//             // return console.log("here", file)
//             // cb(null, 'uploads'); // Destination folder / File uploaded folder
//             cb(null, 'C:/dms/uploads');
//         },
//         filename: function (req, file, cb) {

//             // Generate a new file name
//             const originalExtension = file.originalname.split('.').pop();
//             const newFileName = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.' + originalExtension;
//             uploadedFiles[file.originalname] = newFileName;
//             cb(null, newFileName);
//             // cb(null, file.originalname);
//         },
//     }),
// }).single('file');