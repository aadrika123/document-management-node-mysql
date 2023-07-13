const express = require("express");
const router = express.Router();

const { uploadFileUsingMulter } = require("../components/middleware/uploadMulterMiddleware");
const { documentUploadController, controllerViewAllDocuments, controllerViewByUniqueId, controllerViewByReferenceNo } = require("../controllers/controllerDocumentUpload");

router.route('/upload').post(uploadFileUsingMulter, documentUploadController);
router.route('/view-all').post(controllerViewAllDocuments);
router.route('/view-by-uid').post(controllerViewByUniqueId);
router.route('/view-by-reference').post(controllerViewByReferenceNo);

// router.route('/delete').post(changePermission);




module.exports = router;