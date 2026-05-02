const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db');

const toSafeUser = (user) => ({
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    persona: user.persona || user.role,
    status: user.status || 'Active',
    phoneNumber: user.phoneNumber,
    profile: user.profile || {
        profilePicture: '',
        address: '',
        preferredArea: '',
        nid: '',
        bio: ''
    }
});

const normalizeRole = (value = '') => {
    const role = String(value).trim().toLowerCase();
    const roleMap = {
        user: 'tenant',
        tenant: 'tenant',
        owner: 'owner',
        flat_owner: 'owner',
        flatowner: 'owner',
        land_owner: 'owner',
        landowner: 'owner',
        landlord: 'owner',
        admin: 'admin',
        central_admin: 'admin',
        centraladmin: 'admin',
        sub_admin: 'sub_admin',
        subadmin: 'sub_admin'
    };
    return roleMap[role] || null;
};

const normalizePersona = (value = '') => {
    const persona = String(value).trim().toLowerCase();
    const personaMap = {
        user: 'tenant',
        tenant: 'tenant',
        buyer: 'tenant',
        renter: 'tenant',
        owner: 'owner',
        flat_owner: 'owner',
        flatowner: 'owner',
        landlord: 'owner',
        land_owner: 'owner',
        landowner: 'owner',
        seller: 'owner',
        admin: 'central_admin',
        central_admin: 'central_admin',
        centraladmin: 'central_admin'
    };
    return personaMap[persona] || null;
};

const registerUser = async (req, res) => {
    try {
        const db = getDB();
        const {
            fullName,
            email,
            password,
            role,
            persona,
            phoneNumber,
            profilePicture,
            address,
            preferredArea,
            nid,
            bio
        } = req.body;

        if (!fullName || !email || !password || !role || !phoneNumber) {
            return res.status(400).json({
                message: 'fullName, email, password, role, and phoneNumber are required'
            });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const normalizedRole = normalizeRole(role || persona);
        const normalizedPersona = normalizePersona(persona || role);
        const roleFromPersona = persona ? normalizeRole(persona) : null;

        if (role && persona && roleFromPersona && normalizeRole(role) !== roleFromPersona) {
            return res.status(400).json({
                message: 'Role and persona mismatch. Example: tenant => tenant, landlord => land_owner, seller => flat_owner'
            });
        }

        if (!normalizedRole) {
            return res.status(400).json({
                message: 'Invalid role. Allowed values: tenant, owner'
            });
        }

        if (normalizedRole === 'admin') {
            return res.status(403).json({ message: 'Admin registration is not allowed from public endpoint' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        const phone = String(phoneNumber).trim();
        if (!/^\+?[0-9]{8,15}$/.test(phone)) {
            return res.status(400).json({ message: 'Invalid phoneNumber format' });
        }

        const existingUser = await db.collection('users').findOne({ email: normalizedEmail });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const requiresApproval = normalizedRole === 'owner';
        const newUser = {
            fullName: String(fullName).trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: normalizedRole,
            persona: normalizedPersona || normalizedRole,
            status: requiresApproval ? 'Pending' : 'Active',
            phoneNumber: phone,
            profile: {
                profilePicture: profilePicture || '',
                address: address || '',
                preferredArea: preferredArea || '',
                nid: nid || '',
                bio: bio || ''
            },
            createdAt: new Date()
        };

        const insertResult = await db.collection('users').insertOne(newUser);

        res.status(201).json({
            message: 'User registered successfully',
            user: toSafeUser({ ...newUser, _id: insertResult.insertedId })
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const loginUser = async (req, res) => {
    try {
        const db = getDB();
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'email and password are required' });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const user = await db.collection('users').findOne({ email: normalizedEmail });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const accountStatus = String(user.status || 'Active');
        if (accountStatus === 'Blocked' || accountStatus === 'Suspended') {
            return res.status(403).json({ message: `Account is ${accountStatus.toLowerCase()}. Please contact support.` });
        }

        if (user.role === 'owner' && accountStatus === 'Pending') {
            return res.status(403).json({ message: 'Your owner account is pending admin verification' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ message: 'JWT_SECRET is not configured' });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );

        res.json({
            token,
            user: toSafeUser(user)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getCurrentUser = async (req, res) => {
    try {
        const db = getDB();
        const userId = req.user?.id;

        if (!userId || !ObjectId.isValid(userId)) {
            return res.status(401).json({ message: 'Invalid token payload' });
        }

        const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user: toSafeUser(user) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { registerUser, loginUser, getCurrentUser };
