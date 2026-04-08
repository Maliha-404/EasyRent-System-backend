const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

        if (!token) {
            return res.status(401).json({ message: 'Authorization token is required' });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ message: 'JWT_SECRET is not configured' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

const authorizeRoles = (...allowedRoles) => (req, res, next) => {
    const currentRole = req.user?.role;
    if (!currentRole || !allowedRoles.includes(currentRole)) {
        return res.status(403).json({ message: 'You are not authorized to access this resource' });
    }
    next();
};

module.exports = { authenticate, authorizeRoles };
