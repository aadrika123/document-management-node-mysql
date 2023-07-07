const jwt = require('jsonwebtoken');
const secretKey = 'mysecretkey';

function authorize(allowedRoles) {
    return function (req, res, next) {

        console.log("allowedRoles", allowedRoles)

        // Get the JSON Web Token from the request header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token == null) return res.status(401).json({ status: false, message: 'Unauthorized' }); // if there isn't any token

        // Verify the JSON Web Token
        jwt.verify(token, secretKey, (err, user) => {
            if (err) return res.status(403).json({ status: false, message: 'Unauthenticated, token expired!' });
            req.user = user;

            // Check if the user roles exist and if they have one of the allowed roles
            const allowed = allowedRoles || [];
            const userRoles = Array.isArray(user.userRole) ? user.userRole : [user.userRole]; // Convert to array if not already an array
            const isAllowed = userRoles.some((role) => allowed.includes(role));
            if (!isAllowed) {
                return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
            }
            next();
        });
    }
}

module.exports = authorize;