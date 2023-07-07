const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Joi = require('joi');

const secretKey = 'mysecretkey';
const saltRounds = 10; // Number of salt rounds for hashing

const { decodeJWT, generateRandomNumberWithString } = require("../components/MasterFunctions");
const { changePasswordModal, loginUserModal, registerUserModal, changePermissionModal, viewProfileDetailsModal } = require("../modal/modalAuth");

// This is login validation scheme
const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
}).unknown();
// This is user registration schema
const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    phone: Joi.string().required(),
}).unknown();
// This is Change password validation scheme
const changePasswordSchema = Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().required()
}).unknown();
// This is Change Permission validation scheme
const changePermissionSchema = Joi.object({
    userId: Joi.number().required(),
    read_permission: Joi.number().required(),
    write_permission: Joi.number().required(),
    delete_permission: Joi.number().required()
}).unknown();
// This is Change Permission validation scheme
const viewUserProfileSchema = Joi.object({
    userId: Joi.number().required()
}).unknown();


// This is user registration controller
exports.registerController = async (req, res) => {
    try {
        //Validation
        const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
        if (error) {
            const errorMessages = error.details.map(item => item.message);  //Collection Errors
            return res.status(400).json({ error: errorMessages });
        }
        // Hash the password
        const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

        //Generate Random Token
        const token = await generateRandomNumberWithString(20);

        let body = {
            email: req.body.email,
            password: hashedPassword,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            phone: req.body.phone,
            secret_key: token
        };

        const result = await registerUserModal(body);
        res.status(201).json({ status: result?.status, message: result?.message, data: result?.data });
    } catch (err) {
        res.status(500).send({ status: false, message: "Error while registration..", data: err.message });
    }
}

// This is user login controller
exports.loginController = async (req, res) => {
    const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
    if (error) {
        const errorMessages = error.details.map(item => item.message);  //Collection Errors
        return res.status(400).json({ error: errorMessages });
    }

    try {
        const loggedInUser = await loginUserModal(req.body);
        if (!loggedInUser) {
            return res.status(200).json({ status: false, message: 'User not found' });
        }

        // Create Object of Data
        const data = {
            userId: loggedInUser.id,
            firstName: loggedInUser.first_name,
            lastName: loggedInUser.last_name,
            userEmail: loggedInUser.email,
            permission: {
                read: loggedInUser.read_access,
                write: loggedInUser.write_access,
                delete: loggedInUser.delete_access,
            }
        }

        // Compare the password
        const isMatch = await bcrypt.compare(req.body.password, loggedInUser.password);
        if (isMatch) {
            const token = jwt.sign(data, secretKey, {
                expiresIn: '24h'
            });
            res.json({ status: true, message: 'Login Successful', token: token, data: data });
        } else {
            res.status(200).send({ status: false, message: "Incorrect email or password", data: null });
        }
    } catch (error) {
        res.status(200).send({ status: false, message: "Something went wrong", data: error.message });
    }
}

// This is controller for password change
exports.changePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    //Validation Code
    const { error, value } = changePasswordSchema.validate(req.body, { abortEarly: false });
    if (error) {
        const errorMessages = error.details.map(item => item.message);  //Collection Errors
        return res.status(400).json({ error: errorMessages });
    }

    try {
        // Check Token
        const token = req?.headers?.authorization?.split(' ')[1];
        if (!token) return res.status(201).json({ "status": false, message: "Please Send token", data: [] });
        const userDetails = await decodeJWT(token)
        if (!userDetails) return res.status(201).json({ "status": false, message: "Invalid Token", data: [] });

        const result = await changePasswordModal(userDetails?.userId, userDetails?.userEmail, oldPassword, newPassword)
        res.status(201).json({ "status": result?.status, "message": result?.message, "data": result?.data });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error Password Change ', msg: error.message });
    }
}

// This is controller for change Permission
exports.changePermission = async (req, res) => {
    const { userId, read_permission, write_permission, delete_permission } = req.body;
    //Validation Code
    const { error, value } = changePermissionSchema.validate(req.body, { abortEarly: false });
    if (error) {
        const errorMessages = error.details.map(item => item.message);  //Collection Errors
        return res.status(400).json({ error: errorMessages });
    }

    try {
        // Check Token
        const token = req?.headers?.authorization?.split(' ')[1];
        if (!token) return res.status(201).json({ "status": false, message: "Please Send token", data: [] });
        const userDetails = await decodeJWT(token)
        if (!userDetails) return res.status(201).json({ "status": false, message: "Invalid Token", data: [] });

        const result = await changePermissionModal(userId, read_permission, write_permission, delete_permission)
        res.status(201).json({ "status": result?.status, "message": result?.message, "data": result?.data });
    } catch (error) {
        res.status(500).json({ error: 'Auth Controller Error ', msg: error.message });
    }
}

// This is controller for view profile details
exports.userProfileDetails = async (req, res) => {
    const { userId } = req.body;
    //Validation Code
    const { error, value } = viewUserProfileSchema.validate(req.body, { abortEarly: false });
    if (error) {
        const errorMessages = error.details.map(item => item.message);  //Collection Errors
        return res.status(400).json({ error: errorMessages });
    }

    try {
        // Check Token
        const token = req?.headers?.authorization?.split(' ')[1];
        if (!token) return res.status(201).json({ "status": false, message: "Please Send token", data: [] });
        const userDetails = await decodeJWT(token)
        if (!userDetails) return res.status(201).json({ "status": false, message: "Invalid Token", data: [] });

        const result = await viewProfileDetailsModal(userId)
        res.status(201).json({ "status": result?.status, "message": result?.message, "data": result?.data });
    } catch (error) {
        res.status(500).json({ error: 'Error in Profile Details ', msg: error.message });
    }
}