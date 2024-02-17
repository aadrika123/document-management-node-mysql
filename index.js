const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
let cors = require("cors");
const path = require('path'); // View Document
require('dotenv').config();
const handleDatabaseError = require('./src/components/middleware/handleDbError');
const authorize = require('./src/components/middleware/authMiddleware');
const { MasterData } = require('./src/components/MasterData');


const baseurl = MasterData?.baseAPIUrl;
const port = MasterData?.serverPort;

app.use(express.json()) // for parsing application/json

// Your secret key for signing the JSON Web Token


//this is temporarty need to remove later
const shareFolderPath = path.join(__dirname, './WebhookJson');
app.use('/share', express.static(shareFolderPath));

app.use(cors());

app.get('/', (req, res, next) => {
    console.log("API Call Started")
    next();
});
app.get('/', (req, res, next) => {
    res.send("DMS Backend Server is running...");
    next();
});
// Middleware to log endpoint hits
app.use((req, res, next) => {
    console.log(`Endpoint hit: ${req.method} ${req.url}`);
    next();
});
app.get('/', (req, res) => {
    console.log("API Call Ended")
});

//Check Database Connection
app.use(handleDatabaseError);

//in this the '/uploads' is route to access the file and 'uploads' is the folder where we have stored the documents.
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/uploads', express.static('/var/Documents-Uploads'));



const authRoutes = require('./src/routes/routeAuth')
const manageUsers = require('./src/routes/routeUserManagement')
const documentRoute = require('./src/routes/routeDocument')
const documentBackendRoute = require('./src/routes/routeBackendDocument')
const folderRoutes = require('./src/routes/routeFolder')


app.use('/auth', authRoutes)
app.use('/users', manageUsers)
app.use('/document', documentRoute)
app.use('/backend/document', documentBackendRoute) // This is for backend access only
app.use('/folder', folderRoutes)
// app.use('/student', authorize(["Student"]), studentRoutes)
// app.use('/pay', authorize(["Student","Admin"]), paymentRoutes)



app.listen(port, () => {
    console.log(`App is listing on :${baseurl}/`)
});

module.exports = app;
