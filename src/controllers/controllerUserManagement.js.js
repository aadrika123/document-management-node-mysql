const fs = require('fs');
const Joi = require('joi');
const path = require('path');
const { decodeJWT } = require('../components/MasterFunctions');
const { viewFoldersModal, modalFolderCreate } = require('../modal/folderModal');
const { auditTrailInsert } = require('../modal/modalAuditTrail');
const { modalViewAllUsers, viewProfileDetailsModal, modalCreateUser } = require('../modal/modalUserManagement');
const { modalGetUserDetailsBySecKey } = require('../modal/modalUsers');


// This is Change Permission validation scheme
const viewUserProfileSchema = Joi.object({
    userId: Joi.number().required()
}).unknown();


// Create new folder
exports.createNewFolder = async (req, res) => {
    const secKey = req.headers.secretekey
    try {

        const result = await modalGetUserDetailsBySecKey(secKey) // Get users details by secrete key
        if (!result) return res.status(500).json({ status: false, message: "Invalid Secrete Key", data: [] })
        const userId = result?.id;

        const { folderName } = req.body;
        const location = "C:\\dms\\uploads"; // Make sure to escape backslashes with an extra backslash

        // Construct the full path for the new folder
        const folderPath = path.join(location, folderName);

        // Check if the folder already exists
        if (fs.existsSync(folderPath)) {
            const resultAuditTrail = await auditTrailInsert(userId, null, `Error : Folder already Exits Folder Name : ${folderName}`); // Create Log - (userId, documentId, action)
            return res.status(409).json({ status: false, message: 'Folder already exists' });
        }

        // Create the new folder
        fs.mkdir(folderPath, async (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ status: false, message: 'Failed to create folder' });
            }
            const result = modalFolderCreate(userId, folderName) // Store folder name in database
            const resultAuditTrail = await auditTrailInsert(userId, null, `Folder created Name : ${folderName}`); // Create Log - (userId, documentId, action)

            res.status(201).json({ status: true, message: 'Folder created successfully' });
        });
    } catch (error) {
        res.status(500).json({ status: false, message: "Error while folder create", error: error.message })
    }
};


// View List of Users
exports.controllerViewAllUsers = async (req, res) => {

    try {
        // Check Token
        const token = req?.headers?.authorization?.split(' ')[1];
        if (!token) return res.status(400).json({ "status": false, message: "Please Send token", data: [] });
        const userDetails = await decodeJWT(token)
        console.log("userDetails", userDetails)
        if (!userDetails) return res.status(401).json({ "status": false, message: "Invalid Token", data: [] });
        if (userDetails.type != 9) return res.status(201).json({ "status": false, message: "You are not authorize to access this", data: [] });


        const result = await modalViewAllUsers()
        if (result?.length > 0) {

            const updatedUsers = result?.map((item) => {

                switch (item.role_id) {
                    case 1:
                        item.role = "User"
                        break;
                    case 9:
                        item.role = "Admin"
                        break;
                    default:
                        break;
                }
                return item
            })
            res.status(200).json({ status: true, message: "List of users", data: updatedUsers })
        } else {
            res.status(200).json({ status: false, message: "No user Found", data: [] })
        }
    } catch (err) {
        res.status(500).json({ status: false, message: "Error while fetching users", error: err.message })
    }

}

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

exports.controllerCreateUser = async (req, res) => {
    try {
        const { name, email, password, phone, role_id, read_access, write_access, delete_access } = req.body;
        //Validation Code

        const createUserSchema = Joi.object({
            name: Joi.string().required(),
            email: Joi.string().required(),
            password: Joi.string().required(),
            phone: Joi.number().required(),
            role_id: Joi.string().required(),
            read_access: Joi.string().required(),
            write_access: Joi.string().required(),
            delete_access: Joi.string().required(),
        }).unknown();

        const { error, value } = createUserSchema.validate(req.body, { abortEarly: false });
        if (error) {
            const errorMessages = error.details.map(item => item.message);  //Collection Errors
            return res.status(400).json({ error: errorMessages });
        }

        // Check Token
        const token = req?.headers?.authorization?.split(' ')[1];
        if (!token) return res.status(201).json({ "status": false, message: "Please Send token", data: [] });
        const userDetails = await decodeJWT(token)
        if (!userDetails) return res.status(201).json({ "status": false, message: "Invalid Token", data: [] });

        const result = await modalCreateUser(name, email, password, phone, role_id, read_access, write_access, delete_access)
        res.status(201).json({ "status": result?.status, "message": result?.message, "data": result?.data });
    } catch (error) {
        res.status(500).json({ error: 'Error in Profile Details ', msg: error.message });
    }
}

