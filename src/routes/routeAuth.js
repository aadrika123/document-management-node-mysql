const express = require("express");
const router = express.Router();

const { changePassword, loginController, registerController, changePermission, userProfileDetails } = require("../controllers/controllerAuth");
const { uploadFileUsingMulter } = require("../components/middleware/uploadMulterMiddleware");

router.route('/register').post(registerController);
router.route('/login').post(loginController);
router.route('/change-password').post(changePassword);
router.route('/change-permission').post(changePermission);
router.route('/profile').post(userProfileDetails);




module.exports = router;