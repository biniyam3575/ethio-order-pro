const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: "Access Denied: Missing Authorization Bearer Token." 
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decodedStaff) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                message: "Session Invalidated: Token has expired or is corrupt." 
            });
        }
        req.user = decodedStaff; // Contains staff_id, username, roles array
        next();
    });
};

const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.roles) {
            return res.status(403).json({ 
                success: false, 
                message: "Unauthorized: Access privilege context missing." 
            });
        }

        const hasAccess = req.user.roles.some(role => allowedRoles.includes(role));

        if (!hasAccess) {
            return res.status(403).json({ 
                success: false, 
                message: "Forbidden: Account privileges insufficient for this operation." 
            });
        }

        next();
    };
};

// Shorthand helpers for routes
const requireManager = requireRole(['Manager', 'Owner', 'Super Admin']);
const requireOwner = requireRole(['Owner', 'Super Admin']);

module.exports = {
    authenticateToken,
    requireRole,
    requireManager,
    requireOwner
};