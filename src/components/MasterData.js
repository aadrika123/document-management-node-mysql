require('dotenv').config();
const frontendUrl = "http://127.0.0.1:5173"; // Localhost

// const baseAPIUrl = "http://203.129.217.246:888";
// const baseAPIUrl = "http://192.168.0.122:8001"; // Local DMS
// const baseAPIUrl = "http://192.168.0.92:888"; // Live DMS
// const baseAPIUrl = "http://172.18.1.50:888"; // Local Public IP DMS ok
// const baseAPIUrl = "http://47.247.63.105:888"; //Live Public IP DMS ok

// const baseAPIUrl = "https://jharkhandegovernance.com/dms"; //https Live Url IP DMS ok
const baseAPIUrl = process.env.BASEURL; //https Live Url IP DMS ok
// const baseAPIUrl = "https://aadrikainfomedia.com/dms";    //https Staging Url IP DMS ok
// const baseAPIUrl = "https://egov.rsccl.in/dms";    //https Staging Url IP DMS ok

// const baseAPIUrl = "http://192.168.0.137:888"; // Local DMS


exports.MasterData = {
  baseAPIUrl: baseAPIUrl,
  frontendUrl: frontendUrl,
  serverPort: 888
};
