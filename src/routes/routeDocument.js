const express = require("express");
const router = express.Router();

const {
  uploadFileUsingMulter,
} = require("../components/middleware/uploadMulterMiddleware");
const {
  documentUploadController,
  controllerViewAllDocuments,
  controllerViewRemovedDocuments,
  controllerViewByUniqueId,
  controllerViewByReferenceNo,
  controllerSoftDeleteByUniqueId,
} = require("../controllers/controllerDocumentUpload");

router.route("/upload").post(uploadFileUsingMulter, documentUploadController);
router.route("/view-all?").post(controllerViewAllDocuments);
router.route("/view-by-uid").post(controllerViewByUniqueId);
router.route("/view-by-reference").post(controllerViewByReferenceNo);
router.route("/view-removed").post(controllerViewRemovedDocuments);
router.route("/soft-delete").post(controllerSoftDeleteByUniqueId);

// router.route('/delete').post(changePermission);

module.exports = router;
