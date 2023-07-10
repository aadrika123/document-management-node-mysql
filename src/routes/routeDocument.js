const express = require("express");
const router = express.Router();

const { uploadFileUsingMulter } = require("../components/middleware/uploadMulterMiddleware");
const { documentUploadController } = require("../controllers/controllerDocumentUpload");

router.route('/upload').post(uploadFileUsingMulter, documentUploadController);


// router.route('/view-all').post(loginController);
// router.route('/view-by-id').post(changePassword);
// router.route('/delete').post(changePermission);




module.exports = router;