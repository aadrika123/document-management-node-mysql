
const multer = require('multer');


const uploadedFiles = {};

exports.uploadFileUsingMulter = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            // return console.log("here", file)
            cb(null, 'uploads'); // Destination folder / File uploaded folder
        },
        filename: function (req, file, cb) {

            // Generate a new file name
            const originalExtension = file.originalname.split('.').pop();
            const newFileName = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.' + originalExtension;
            uploadedFiles[file.originalname] = newFileName;
            cb(null, newFileName);
            // cb(null, file.originalname);
        },
    }),
}).single('file');