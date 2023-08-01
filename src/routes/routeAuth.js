const express = require("express");
const router = express.Router();

const { changePassword, loginController, registerController, changePermission, userProfileDetails, selfProfileDetails, revokeAccessKey, selfProfileUpdate } = require("../controllers/controllerAuth");
const { uploadFileUsingMulter } = require("../components/middleware/uploadMulterMiddleware");

router.route('/register').post(registerController);
router.route('/change-permission').post(changePermission);

// router.route('/user-profile').post(userProfileDetails); // shift to admin



router.route('/change-password').post(changePassword);
router.route('/login').post(loginController);
router.route('/profile').post(selfProfileDetails);
router.route('/profile-update').post(selfProfileUpdate);
router.route('/revoke-access-key').post(revokeAccessKey);






module.exports = router;