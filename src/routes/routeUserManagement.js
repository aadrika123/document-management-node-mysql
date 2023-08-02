const express = require("express");
const { controllerViewAllUsers, controllerCreateUser, userProfileDetails } = require("../controllers/controllerUserManagement.js");
const router = express.Router();


router.route('/create').post(controllerCreateUser);
router.route('/view-all').post(controllerViewAllUsers);
router.route('/user-profile').post(userProfileDetails);





module.exports = router;