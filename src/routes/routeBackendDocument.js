const express = require("express");
const router = express.Router();

const { uploadFileUsingMulter } = require("../components/middleware/uploadMulterMiddleware");
const { controllerBackendViewByReferenceNo, controllerBackendViewByUniqueId, documentBackendUploadController } = require("../controllers/controllerBackendDocumentUpload");

router.route('/upload').post(uploadFileUsingMulter, documentBackendUploadController);
router.route('/view-by-uid').post(controllerBackendViewByUniqueId);
router.route('/view-by-reference').post(controllerBackendViewByReferenceNo);

module.exports = router;