const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db');

const toSafeUserRow = (user) => ({
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    persona: user.persona || user.role,
    status: user.status || 'Active',
    phoneNumber: user.phoneNumber,
    createdAt: user.createdAt,
    profile: user.profile || {
        profilePicture: '',
        address: '',
        preferredArea: '',
        nid: '',
        bio: ''
    }
});

const getAllUsersForAdmin = async (req, res) => {
    try {
        const db = getDB();
        const { role, status, persona, search } = req.query;
        const filter = {};

        if (role) filter.role = String(role).trim().toLowerCase();
        if (status) filter.status = String(status).trim();
        if (persona) filter.persona = String(persona).trim().toLowerCase();

        if (search) {
            const value = String(search).trim();
            filter.$or = [
                { fullName: { $regex: value, $options: 'i' } },
                { email: { $regex: value, $options: 'i' } },
                { phoneNumber: { $regex: value, $options: 'i' } }
            ];
        }

        const users = await db
            .collection('users')
            .find(filter)
            .sort({ createdAt: -1 })
            .toArray();

        res.json({
            total: users.length,
            users: users.map(toSafeUserRow)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateUserStatusByAdmin = async (req, res) => {
    try {
        const db = getDB();
        const { id } = req.params;
        const { status } = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid user id' });
        }

        const normalizedStatus = String(status || '').trim();
        const allowed = ['Active', 'Pending', 'Blocked', 'Suspended'];
        if (!allowed.includes(normalizedStatus)) {
            return res.status(400).json({ message: `Invalid status. Allowed: ${allowed.join(', ')}` });
        }

        const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
        if (!user) return res.status(404).json({ message: 'User not found' });

        await db.collection('users').updateOne(
            { _id: user._id },
            {
                $set: {
                    status: normalizedStatus,
                    updatedAt: new Date()
                }
            }
        );

        const updated = await db.collection('users').findOne({ _id: user._id });
        res.json({ message: 'User status updated', user: toSafeUserRow(updated) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAdminOverview = async (_req, res) => {
    try {
        const db = getDB();

        const [
            totalUsers,
            totalOwners,
            pendingOwners,
            blockedUsers,
            totalAreas,
            totalBuildings,
            totalFlats,
            totalBookings
        ] = await Promise.all([
            db.collection('users').countDocuments({ role: 'user' }),
            db.collection('users').countDocuments({ role: 'owner' }),
            db.collection('users').countDocuments({ role: 'owner', status: 'Pending' }),
            db.collection('users').countDocuments({ status: { $in: ['Blocked', 'Suspended'] } }),
            db.collection('areas').countDocuments().catch(() => 0),
            db.collection('buildings').countDocuments().catch(() => 0),
            db.collection('flats').countDocuments().catch(() => 0),
            db.collection('bookings').countDocuments().catch(() => 0)
        ]);

        const roleBreakdown = await db.collection('users').aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } },
            { $project: { _id: 0, role: '$_id', count: 1 } }
        ]).toArray();

        const personaBreakdown = await db.collection('users').aggregate([
            { $group: { _id: '$persona', count: { $sum: 1 } } },
            { $project: { _id: 0, persona: '$_id', count: 1 } }
        ]).toArray();

        res.json({
            totals: {
                totalUsers,
                totalOwners,
                pendingOwners,
                blockedUsers,
                totalAreas,
                totalBuildings,
                totalFlats,
                totalBookings
            },
            roleBreakdown,
            personaBreakdown
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAllUsersForAdmin,
    updateUserStatusByAdmin,
    getAdminOverview
};
