const express = require("express");
const { createNewFolder } = require("../controllers/controllerFolder");
const { controllerViewAllUsers, userProfileDetails } = require("../controllers/controllerUserManagement.js");
const router = express.Router();


router.route('/create').post(createNewFolder);
router.route('/view-all').post(controllerViewAllUsers);
router.route('/user-profile').post(userProfileDetails);





module.exports = router;