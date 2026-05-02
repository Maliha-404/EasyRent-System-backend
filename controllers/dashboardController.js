const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db');

const toObjectId = (id) => (ObjectId.isValid(id) ? new ObjectId(id) : null);

const loadUnitRowsByMatch = async (db, match) => db.collection('units').aggregate([
    { $match: match },
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
            from: 'buildings',
            localField: 'floor.buildingId',
            foreignField: '_id',
            as: 'building'
        }
    },
    { $unwind: { path: '$building', preserveNullAndEmptyArrays: true } },
    {
        $lookup: {
            from: 'plots',
            localField: 'building.plotId',
            foreignField: '_id',
            as: 'plot'
        }
    },
    { $unwind: { path: '$plot', preserveNullAndEmptyArrays: true } },
    {
        $project: {
            _id: 1,
            unitNumber: 1,
            type: 1,
            status: 1,
            price: 1,
            size: 1,
            bedrooms: 1,
            bathrooms: 1,
            floorNumber: '$floor.floorNumber',
            buildingId: '$building._id',
            buildingName: '$building.name',
            buildingAddress: '$plot.address'
        }
    }
]).toArray();

const getOwnerDashboard = async (req, res) => {
    try {
        const db = getDB();
        const userId = req.user?.id;
        const userRole = req.user?.role;

        const ownerObjectId = toObjectId(userId);
        if (!ownerObjectId) return res.status(401).json({ message: 'Invalid token payload' });

        if (userRole !== 'owner') {
            return res.status(403).json({ message: 'Owner dashboard is only available for owner role' });
        }

        // Fetch plots owned by this user
        const plots = await db.collection('plots').find({ primaryLandOwnerId: ownerObjectId }).toArray();
        const plotIds = plots.map((plot) => plot._id);
        
        // Fetch buildings on those plots
        const buildings = await db.collection('buildings').find({ plotId: { $in: plotIds } }).toArray();
        const buildingIds = buildings.map((building) => building._id);
        
        // Fetch floors on those buildings
        const floors = await db.collection('floors').find({ buildingId: { $in: buildingIds } }).toArray();
        const floorIds = floors.map((floor) => floor._id);
        
        // Fetch units: either on their floors OR directly owned by them
        const units = await loadUnitRowsByMatch(db, {
            $or: [
                { floorId: { $in: floorIds } },
                { flatOwnerId: ownerObjectId }
            ]
        });

        const unitIds = units.map((unit) => unit._id);
        const bookings = await db.collection('bookings').find({ unitId: { $in: unitIds } }).toArray();
        const bookingIds = bookings.map((item) => item._id);
        const payments = await db.collection('payments').find({ bookingId: { $in: bookingIds } }).toArray();
        const notices = await db.collection('notices').find({ ownerId: ownerObjectId }).sort({ createdAt: -1 }).toArray();

        const buildingsMap = new Map();
        units.forEach((unit) => {
            if (!unit.buildingId) return;
            if (!buildingsMap.has(String(unit.buildingId))) {
                buildingsMap.set(String(unit.buildingId), {
                    id: String(unit.buildingId),
                    name: unit.buildingName,
                    address: unit.buildingAddress,
                    units: []
                });
            }
            buildingsMap.get(String(unit.buildingId)).units.push({
                id: String(unit._id),
                unitNumber: unit.unitNumber,
                type: unit.type,
                status: unit.status,
                price: unit.price,
                size: unit.size,
                floor: unit.floorNumber
            });
        });

        res.json({
            buildings: Array.from(buildingsMap.values()),
            units: units.map((unit) => ({
                id: String(unit._id),
                unitNumber: unit.unitNumber,
                type: unit.type,
                status: unit.status,
                price: unit.price,
                size: unit.size,
                floor: unit.floorNumber,
                buildingName: unit.buildingName
            })),
            bookings: bookings.map((booking) => ({
                id: String(booking._id),
                unitId: String(booking.unitId),
                date: booking.date,
                status: booking.status,
                advanceAmount: booking.advanceAmount
            })),
            payments: payments.map((payment) => ({
                id: String(payment._id),
                bookingId: payment.bookingId ? String(payment.bookingId) : '',
                amount: payment.amount,
                purpose: payment.purpose,
                status: payment.status,
                date: payment.date
            })),
            notices: notices.map((notice) => ({
                id: String(notice._id),
                title: notice.title,
                content: notice.content,
                date: notice.date,
                buildingId: notice.buildingId ? String(notice.buildingId) : ''
            })),
            plots: plots.map((plot) => ({
                id: String(plot._id),
                plotNumber: plot.plotNumber,
                address: plot.address
            }))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getTenantDashboard = async (req, res) => {
    try {
        const db = getDB();
        const userId = req.user?.id;
        const tenantObjectId = toObjectId(userId);
        if (!tenantObjectId) return res.status(401).json({ message: 'Invalid token payload' });

        const bookings = await db.collection('bookings').find({ tenantId: tenantObjectId }).sort({ createdAt: -1 }).toArray();
        const bookingIds = bookings.map((item) => item._id);
        const unitIds = bookings.map((item) => item.unitId);

        const [payments, units] = await Promise.all([
            db.collection('payments').find({ bookingId: { $in: bookingIds } }).sort({ createdAt: -1 }).toArray(),
            db.collection('units').find({ _id: { $in: unitIds } }).toArray()
        ]);

        const unitMap = new Map(units.map((unit) => [String(unit._id), unit]));

        res.json({
            bookings: bookings.map((booking) => ({
                id: String(booking._id),
                unitId: String(booking.unitId),
                date: booking.date,
                status: booking.status,
                advanceAmount: booking.advanceAmount,
                unitNumber: unitMap.get(String(booking.unitId))?.unitNumber || ''
            })),
            payments: payments.map((payment) => ({
                id: String(payment._id),
                bookingId: payment.bookingId ? String(payment.bookingId) : '',
                date: payment.date,
                amount: payment.amount,
                purpose: payment.purpose,
                status: payment.status
            }))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createOwnerBuilding = async (req, res) => {
    try {
        const db = getDB();
        const userId = req.user?.id;
        const ownerObjectId = toObjectId(userId);
        if (req.user?.role !== 'owner' || !ownerObjectId) return res.status(403).json({ message: 'Unauthorized' });

        const { plotId, name, totalFloors } = req.body;
        if (!plotId || !name) return res.status(400).json({ message: 'plotId and name are required' });

        const plotObjectId = toObjectId(plotId);
        if (!plotObjectId) return res.status(400).json({ message: 'Invalid plotId' });

        // Ensure owner owns the plot
        const plot = await db.collection('plots').findOne({ _id: plotObjectId, primaryLandOwnerId: ownerObjectId });
        if (!plot) return res.status(403).json({ message: 'Plot not found or not owned by you' });

        const floorsCount = parseInt(totalFloors, 10) || 1;
        const payload = {
            plotId: plotObjectId,
            name: String(name).trim(),
            totalFloors: floorsCount,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const created = await db.collection('buildings').insertOne(payload);
        
        // Auto-generate floors
        if (floorsCount > 0) {
            const floors = [];
            for (let i = 1; i <= floorsCount; i++) {
                floors.push({
                    buildingId: created.insertedId,
                    floorNumber: i,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
            await db.collection('floors').insertMany(floors);
        }

        res.status(201).json({ message: 'Building created', building: { ...payload, _id: created.insertedId } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createOwnerUnit = async (req, res) => {
    try {
        const db = getDB();
        const userId = req.user?.id;
        const ownerObjectId = toObjectId(userId);
        if (req.user?.role !== 'owner' || !ownerObjectId) return res.status(403).json({ message: 'Unauthorized' });

        const { buildingId, floorNumber, unitNumber, size, bedrooms, bathrooms, type, price } = req.body;
        if (!buildingId || !floorNumber || !unitNumber) return res.status(400).json({ message: 'buildingId, floorNumber, and unitNumber are required' });

        const buildingObjectId = toObjectId(buildingId);
        if (!buildingObjectId) return res.status(400).json({ message: 'Invalid buildingId' });

        // Check if building exists and we can access it (for safety, we check if floor exists)
        const floor = await db.collection('floors').findOne({ buildingId: buildingObjectId, floorNumber: parseInt(floorNumber, 10) });
        if (!floor) return res.status(404).json({ message: 'Floor not found in this building' });

        const payload = {
            floorId: floor._id,
            flatOwnerId: ownerObjectId,
            unitNumber: String(unitNumber).trim(),
            size: parseFloat(size) || 0,
            bedrooms: parseInt(bedrooms, 10) || 0,
            bathrooms: parseInt(bathrooms, 10) || 0,
            type: String(type || 'Rent').trim(),
            price: parseFloat(price) || 0,
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

const createOwnerNotice = async (req, res) => {
    try {
        const db = getDB();
        const userId = req.user?.id;
        const ownerObjectId = toObjectId(userId);
        if (req.user?.role !== 'owner' || !ownerObjectId) return res.status(403).json({ message: 'Unauthorized' });

        const { buildingId, title, content } = req.body;
        if (!title || !content) return res.status(400).json({ message: 'title and content are required' });

        const buildingObjectId = buildingId ? toObjectId(buildingId) : null;
        
        const payload = {
            ownerId: ownerObjectId,
            buildingId: buildingObjectId,
            title: String(title).trim(),
            content: String(content).trim(),
            date: new Date().toISOString().split('T')[0],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const created = await db.collection('notices').insertOne(payload);
        res.status(201).json({ message: 'Notice published', notice: { ...payload, _id: created.insertedId } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getOwnerDashboard,
    getTenantDashboard,
    createOwnerBuilding,
    createOwnerUnit,
    createOwnerNotice
};
