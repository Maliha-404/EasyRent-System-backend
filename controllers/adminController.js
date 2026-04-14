const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db');

const toObjectId = (id) => (ObjectId.isValid(id) ? new ObjectId(id) : null);

const parseNumber = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
};

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

const getZones = async (_req, res) => {
    try {
        const db = getDB();
        const zones = await db.collection('zones').find({}).sort({ createdAt: -1 }).toArray();
        res.json({ total: zones.length, zones });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createZone = async (req, res) => {
    try {
        const db = getDB();
        const { name, city, description } = req.body;

        if (!name || !city) {
            return res.status(400).json({ message: 'name and city are required' });
        }

        const normalizedName = String(name).trim();
        const normalizedCity = String(city).trim();
        const duplicate = await db.collection('zones').findOne({
            name: { $regex: `^${normalizedName}$`, $options: 'i' },
            city: { $regex: `^${normalizedCity}$`, $options: 'i' }
        });

        if (duplicate) {
            return res.status(400).json({ message: 'Zone already exists for this city' });
        }

        const payload = {
            name: normalizedName,
            city: normalizedCity,
            description: String(description || '').trim(),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const created = await db.collection('zones').insertOne(payload);
        res.status(201).json({ message: 'Zone created', zone: { ...payload, _id: created.insertedId } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getBlocks = async (req, res) => {
    try {
        const db = getDB();
        const filter = {};
        if (req.query.zoneId) {
            const zoneObjectId = toObjectId(String(req.query.zoneId));
            if (!zoneObjectId) return res.status(400).json({ message: 'Invalid zoneId' });
            filter.zoneId = zoneObjectId;
        }

        const blocks = await db.collection('blocks').aggregate([
            { $match: filter },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: 'zones',
                    localField: 'zoneId',
                    foreignField: '_id',
                    as: 'zone'
                }
            },
            { $unwind: { path: '$zone', preserveNullAndEmptyArrays: true } }
        ]).toArray();

        res.json({ total: blocks.length, blocks });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createBlock = async (req, res) => {
    try {
        const db = getDB();
        const { zoneId, name, type } = req.body;

        if (!zoneId || !name) {
            return res.status(400).json({ message: 'zoneId and name are required' });
        }

        const zoneObjectId = toObjectId(zoneId);
        if (!zoneObjectId) return res.status(400).json({ message: 'Invalid zoneId' });

        const zone = await db.collection('zones').findOne({ _id: zoneObjectId });
        if (!zone) return res.status(404).json({ message: 'Zone not found' });

        const payload = {
            zoneId: zoneObjectId,
            name: String(name).trim(),
            type: String(type || 'sector').trim(),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const created = await db.collection('blocks').insertOne(payload);
        res.status(201).json({ message: 'Block created', block: { ...payload, _id: created.insertedId, zone } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getPlots = async (req, res) => {
    try {
        const db = getDB();
        const filter = {};

        if (req.query.blockId) {
            const blockObjectId = toObjectId(String(req.query.blockId));
            if (!blockObjectId) return res.status(400).json({ message: 'Invalid blockId' });
            filter.blockId = blockObjectId;
        }

        const plots = await db.collection('plots').aggregate([
            { $match: filter },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: 'blocks',
                    localField: 'blockId',
                    foreignField: '_id',
                    as: 'block'
                }
            },
            { $unwind: { path: '$block', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'primaryLandOwnerId',
                    foreignField: '_id',
                    as: 'landOwner'
                }
            },
            { $unwind: { path: '$landOwner', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    plotNumber: 1,
                    address: 1,
                    size: 1,
                    status: 1,
                    createdAt: 1,
                    block: { _id: '$block._id', name: '$block.name', zoneId: '$block.zoneId' },
                    landOwner: { _id: '$landOwner._id', fullName: '$landOwner.fullName', email: '$landOwner.email' }
                }
            }
        ]).toArray();

        res.json({ total: plots.length, plots });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createPlot = async (req, res) => {
    try {
        const db = getDB();
        const { blockId, plotNumber, address, size, primaryLandOwnerId } = req.body;

        if (!blockId || !plotNumber || !primaryLandOwnerId) {
            return res.status(400).json({ message: 'blockId, plotNumber, and primaryLandOwnerId are required' });
        }

        const blockObjectId = toObjectId(blockId);
        const landOwnerObjectId = toObjectId(primaryLandOwnerId);
        if (!blockObjectId) return res.status(400).json({ message: 'Invalid blockId' });
        if (!landOwnerObjectId) return res.status(400).json({ message: 'Invalid primaryLandOwnerId' });

        const [block, landOwner] = await Promise.all([
            db.collection('blocks').findOne({ _id: blockObjectId }),
            db.collection('users').findOne({ _id: landOwnerObjectId, role: 'land_owner' })
        ]);

        if (!block) return res.status(404).json({ message: 'Block not found' });
        if (!landOwner) return res.status(404).json({ message: 'Land owner not found' });

        const payload = {
            blockId: blockObjectId,
            plotNumber: String(plotNumber).trim(),
            address: String(address || '').trim(),
            size: parseNumber(size),
            primaryLandOwnerId: landOwnerObjectId,
            status: 'Pending Approval',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const created = await db.collection('plots').insertOne(payload);
        res.status(201).json({ message: 'Plot created', plot: { ...payload, _id: created.insertedId } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getBuildings = async (req, res) => {
    try {
        const db = getDB();
        const filter = {};

        if (req.query.plotId) {
            const plotObjectId = toObjectId(String(req.query.plotId));
            if (!plotObjectId) return res.status(400).json({ message: 'Invalid plotId' });
            filter.plotId = plotObjectId;
        }

        const buildings = await db.collection('buildings').aggregate([
            { $match: filter },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: 'plots',
                    localField: 'plotId',
                    foreignField: '_id',
                    as: 'plot'
                }
            },
            { $unwind: { path: '$plot', preserveNullAndEmptyArrays: true } }
        ]).toArray();

        res.json({ total: buildings.length, buildings });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createBuilding = async (req, res) => {
    try {
        const db = getDB();
        const { plotId, name, totalFloors } = req.body;
        if (!plotId || !name) {
            return res.status(400).json({ message: 'plotId and name are required' });
        }

        const plotObjectId = toObjectId(plotId);
        if (!plotObjectId) return res.status(400).json({ message: 'Invalid plotId' });

        const plot = await db.collection('plots').findOne({ _id: plotObjectId });
        if (!plot) return res.status(404).json({ message: 'Plot not found' });

        const payload = {
            plotId: plotObjectId,
            name: String(name).trim(),
            totalFloors: parseNumber(totalFloors) || 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const created = await db.collection('buildings').insertOne(payload);
        res.status(201).json({ message: 'Building created', building: { ...payload, _id: created.insertedId } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getFloors = async (req, res) => {
    try {
        const db = getDB();
        const filter = {};

        if (req.query.buildingId) {
            const buildingObjectId = toObjectId(String(req.query.buildingId));
            if (!buildingObjectId) return res.status(400).json({ message: 'Invalid buildingId' });
            filter.buildingId = buildingObjectId;
        }

        const floors = await db.collection('floors').aggregate([
            { $match: filter },
            { $sort: { floorNumber: 1 } },
            {
                $lookup: {
                    from: 'buildings',
                    localField: 'buildingId',
                    foreignField: '_id',
                    as: 'building'
                }
            },
            { $unwind: { path: '$building', preserveNullAndEmptyArrays: true } }
        ]).toArray();

        res.json({ total: floors.length, floors });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createFloor = async (req, res) => {
    try {
        const db = getDB();
        const { buildingId, floorNumber } = req.body;
        if (!buildingId || floorNumber === undefined) {
            return res.status(400).json({ message: 'buildingId and floorNumber are required' });
        }

        const buildingObjectId = toObjectId(buildingId);
        if (!buildingObjectId) return res.status(400).json({ message: 'Invalid buildingId' });

        const building = await db.collection('buildings').findOne({ _id: buildingObjectId });
        if (!building) return res.status(404).json({ message: 'Building not found' });

        const payload = {
            buildingId: buildingObjectId,
            floorNumber: parseNumber(floorNumber),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const created = await db.collection('floors').insertOne(payload);
        res.status(201).json({ message: 'Floor created', floor: { ...payload, _id: created.insertedId } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getUnits = async (req, res) => {
    try {
        const db = getDB();
        const filter = {};

        if (req.query.floorId) {
            const floorObjectId = toObjectId(String(req.query.floorId));
            if (!floorObjectId) return res.status(400).json({ message: 'Invalid floorId' });
            filter.floorId = floorObjectId;
        }

        const units = await db.collection('units').aggregate([
            { $match: filter },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: 'floors',
                    localField: 'floorId',
                    foreignField: '_id',
                    as: 'floor'
                }
            },
            { $unwind: { path: '$floor', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'flatOwnerId',
                    foreignField: '_id',
                    as: 'flatOwner'
                }
            },
            { $unwind: { path: '$flatOwner', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    unitNumber: 1,
                    size: 1,
                    bedrooms: 1,
                    bathrooms: 1,
                    type: 1,
                    price: 1,
                    status: 1,
                    createdAt: 1,
                    floor: { _id: '$floor._id', floorNumber: '$floor.floorNumber', buildingId: '$floor.buildingId' },
                    flatOwner: { _id: '$flatOwner._id', fullName: '$flatOwner.fullName', email: '$flatOwner.email' }
                }
            }
        ]).toArray();

        res.json({ total: units.length, units });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createUnit = async (req, res) => {
    try {
        const db = getDB();
        const { floorId, flatOwnerId, unitNumber, size, bedrooms, bathrooms, type, price } = req.body;

        if (!floorId || !flatOwnerId || !unitNumber) {
            return res.status(400).json({ message: 'floorId, flatOwnerId, and unitNumber are required' });
        }

        const floorObjectId = toObjectId(floorId);
        const flatOwnerObjectId = toObjectId(flatOwnerId);
        if (!floorObjectId) return res.status(400).json({ message: 'Invalid floorId' });
        if (!flatOwnerObjectId) return res.status(400).json({ message: 'Invalid flatOwnerId' });

        const [floor, flatOwner] = await Promise.all([
            db.collection('floors').findOne({ _id: floorObjectId }),
            db.collection('users').findOne({ _id: flatOwnerObjectId, role: 'flat_owner' })
        ]);

        if (!floor) return res.status(404).json({ message: 'Floor not found' });
        if (!flatOwner) return res.status(404).json({ message: 'Flat owner not found' });

        const payload = {
            floorId: floorObjectId,
            flatOwnerId: flatOwnerObjectId,
            unitNumber: String(unitNumber).trim(),
            size: parseNumber(size),
            bedrooms: parseNumber(bedrooms),
            bathrooms: parseNumber(bathrooms),
            type: String(type || 'Rent').trim(),
            price: parseNumber(price),
            status: 'Draft',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const created = await db.collection('units').insertOne(payload);
        res.status(201).json({ message: 'Unit created', unit: { ...payload, _id: created.insertedId } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAdminOverview = async (_req, res) => {
    try {
        const db = getDB();

        const [
            totalTenants,
            totalLandOwners,
            totalFlatOwners,
            pendingOwnerApprovals,
            blockedUsers,
            totalZones,
            totalBlocks,
            totalPlots,
            totalBuildings,
            totalFloors,
            totalUnits,
            totalBookings
        ] = await Promise.all([
            db.collection('users').countDocuments({ role: 'tenant' }),
            db.collection('users').countDocuments({ role: 'land_owner' }),
            db.collection('users').countDocuments({ role: 'flat_owner' }),
            db.collection('users').countDocuments({ role: { $in: ['land_owner', 'flat_owner'] }, status: 'Pending' }),
            db.collection('users').countDocuments({ status: { $in: ['Blocked', 'Suspended'] } }),
            db.collection('zones').countDocuments().catch(() => 0),
            db.collection('blocks').countDocuments().catch(() => 0),
            db.collection('plots').countDocuments().catch(() => 0),
            db.collection('buildings').countDocuments().catch(() => 0),
            db.collection('floors').countDocuments().catch(() => 0),
            db.collection('units').countDocuments().catch(() => 0),
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
                totalTenants,
                totalLandOwners,
                totalFlatOwners,
                pendingOwnerApprovals,
                blockedUsers,
                totalZones,
                totalBlocks,
                totalPlots,
                totalBuildings,
                totalFloors,
                totalUnits,
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
    getAdminOverview,
    getZones,
    createZone,
    getBlocks,
    createBlock,
    getPlots,
    createPlot,
    getBuildings,
    createBuilding,
    getFloors,
    createFloor,
    getUnits,
    createUnit
};
