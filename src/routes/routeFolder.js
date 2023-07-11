const express = require("express");
const { createNewFolder, viewFoldersController } = require("../controllers/controllerFolder");
const router = express.Router();


router.route('/create').post(createNewFolder);
router.route('/view-all').post(viewFoldersController);





module.exports = router;