const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db');

const toPropertyProjection = {
    _id: 1,
    unitNumber: 1,
    size: 1,
    price: 1,
    type: 1,
    status: 1,
    bedrooms: 1,
    bathrooms: 1,
    image: 1,
    availabilityDate: 1,
    floorNumber: '$floor.floorNumber',
    buildingName: '$building.name',
    buildingAddress: '$plot.address',
    blockName: '$block.name',
    zoneName: '$zone.name',
    zoneId: '$zone._id',
    plotNumber: '$plot.plotNumber'
};

const getPropertyPipeline = (match = {}) => ([
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
        $lookup: {
            from: 'blocks',
            localField: 'plot.blockId',
            foreignField: '_id',
            as: 'block'
        }
    },
    { $unwind: { path: '$block', preserveNullAndEmptyArrays: true } },
    {
        $lookup: {
            from: 'zones',
            localField: 'block.zoneId',
            foreignField: '_id',
            as: 'zone'
        }
    },
    { $unwind: { path: '$zone', preserveNullAndEmptyArrays: true } },
    { $project: toPropertyProjection }
]);

const mapProperty = (doc) => ({
    id: String(doc._id),
    flat_number: doc.unitNumber,
    size: doc.size || 0,
    price: doc.price || 0,
    type: doc.type || 'Rent',
    status: doc.status || 'Draft',
    floor: doc.floorNumber || 0,
    bedrooms: doc.bedrooms || 0,
    bathrooms: doc.bathrooms || 0,
    image: doc.image || '',
    availability_date: doc.availabilityDate || 'N/A',
    buildingName: doc.buildingName || '',
    buildingAddress: doc.buildingAddress || '',
    plotNumber: doc.plotNumber || '',
    blockName: doc.blockName || '',
    zoneName: doc.zoneName || '',
    zoneId: doc.zoneId ? String(doc.zoneId) : ''
});

const getHomeData = async (_req, res) => {
    try {
        const db = getDB();

        const [zones, units] = await Promise.all([
            db.collection('zones').find({}).sort({ name: 1 }).toArray(),
            db.collection('units').aggregate(getPropertyPipeline({})).toArray()
        ]);

        const properties = units.map(mapProperty);
        const featuredFlats = properties.slice(0, 6);

        res.json({
            zones: zones.map((zone) => ({ id: String(zone._id), name: zone.name, city: zone.city, description: zone.description || '' })),
            featuredFlats
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getProperties = async (req, res) => {
    try {
        const db = getDB();
        const { type, zoneId, q } = req.query;

        const baseMatch = {};
        if (type && type !== 'All') {
            baseMatch.type = String(type);
        }

        const units = await db.collection('units').aggregate(getPropertyPipeline(baseMatch)).toArray();
        let properties = units.map(mapProperty);

        if (zoneId && zoneId !== 'All') {
            properties = properties.filter((item) => item.zoneId === String(zoneId));
        }

        if (q) {
            const search = String(q).trim().toLowerCase();
            properties = properties.filter((item) =>
                item.flat_number.toLowerCase().includes(search) ||
                item.buildingName.toLowerCase().includes(search) ||
                item.zoneName.toLowerCase().includes(search) ||
                item.blockName.toLowerCase().includes(search)
            );
        }

        const zones = await db.collection('zones').find({}).sort({ name: 1 }).toArray();

        res.json({
            total: properties.length,
            properties,
            zones: zones.map((zone) => ({ id: String(zone._id), name: zone.name, city: zone.city, description: zone.description || '' }))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getPropertyById = async (req, res) => {
    try {
        const db = getDB();
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid property id' });
        }

        const results = await db.collection('units').aggregate(getPropertyPipeline({ _id: new ObjectId(id) })).toArray();
        if (!results.length) {
            return res.status(404).json({ message: 'Property not found' });
        }

        res.json({ property: mapProperty(results[0]) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getHomeData,
    getProperties,
    getPropertyById
};
