const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate incoming requests via JSON Web Tokens (JWT)
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // Extract token format expecting: 'Bearer <token>'
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: "Access Denied: Missing Authorization Bearer Token Token." 
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decodedStaff) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                message: "Session Invalidated: Token has expired or is corrupt." 
            });
        }
        // Bind the decrypted token payload onto the request object
        req.user = decodedStaff;
        next();
    });
};

/**
 * Factory middleware to enforce strict Role-Based Access Control (RBAC) filtering parameters
 * @param {Array<String>} allowedRoles - Collection of privileges authorized to interact with the route
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.roles) {
            return res.status(403).json({ 
                success: false, 
                message: "Unauthorized: Access privilege tracking context missing." 
            });
        }

        // Intersect user roles array against route parameters privileges
        const hasAccess = req.user.roles.some(role => allowedRoles.includes(role));

        if (!hasAccess) {
            return res.status(403).json({ 
                success: false, 
                message: "Forbidden Access Notice: Your account privileges cannot enter this module view." 
            });
        }

        next();
    };
};

module.exports = {
    authenticateToken,
    requireRole
};