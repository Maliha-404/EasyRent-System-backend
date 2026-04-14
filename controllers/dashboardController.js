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

        let units = [];

        if (userRole === 'flat_owner') {
            units = await loadUnitRowsByMatch(db, { flatOwnerId: ownerObjectId });
        } else if (userRole === 'land_owner') {
            const plots = await db.collection('plots').find({ primaryLandOwnerId: ownerObjectId }).toArray();
            const plotIds = plots.map((plot) => plot._id);
            const buildings = await db.collection('buildings').find({ plotId: { $in: plotIds } }).toArray();
            const buildingIds = buildings.map((building) => building._id);
            const floors = await db.collection('floors').find({ buildingId: { $in: buildingIds } }).toArray();
            const floorIds = floors.map((floor) => floor._id);
            units = await loadUnitRowsByMatch(db, { floorId: { $in: floorIds } });
        } else {
            return res.status(403).json({ message: 'Owner dashboard is only available for land_owner or flat_owner roles' });
        }

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

module.exports = {
    getOwnerDashboard,
    getTenantDashboard
};
