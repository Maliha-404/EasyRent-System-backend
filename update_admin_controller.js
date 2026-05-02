const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'controllers', 'adminController.js');
let content = fs.readFileSync(targetPath, 'utf-8');

const crudString = `
// --- GENERATED UPDATE/DELETE FUNCTIONS ---

// Zones
const updateZone = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, city, description } = req.body;
        if (!toObjectId(id)) return res.status(400).json({ message: 'Invalid id' });
        const updateDoc = { updatedAt: new Date() };
        if (name !== undefined) updateDoc.name = String(name).trim();
        if (city !== undefined) updateDoc.city = String(city).trim();
        if (description !== undefined) updateDoc.description = String(description).trim();
        await getDB().collection('zones').updateOne({ _id: toObjectId(id) }, { $set: updateDoc });
        res.json({ message: 'Zone updated' });
    } catch (e) { res.status(500).json({ message: e.message }); }
};
const deleteZone = async (req, res) => {
    try {
        if (!toObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
        await getDB().collection('zones').deleteOne({ _id: toObjectId(req.params.id) });
        res.json({ message: 'Zone deleted' });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

// Blocks
const updateBlock = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, zoneId } = req.body;
        if (!toObjectId(id)) return res.status(400).json({ message: 'Invalid id' });
        const updateDoc = { updatedAt: new Date() };
        if (name !== undefined) updateDoc.name = String(name).trim();
        if (type !== undefined) updateDoc.type = String(type).trim();
        if (zoneId) updateDoc.zoneId = toObjectId(zoneId);
        await getDB().collection('blocks').updateOne({ _id: toObjectId(id) }, { $set: updateDoc });
        res.json({ message: 'Block updated' });
    } catch (e) { res.status(500).json({ message: e.message }); }
};
const deleteBlock = async (req, res) => {
    try {
        if (!toObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
        await getDB().collection('blocks').deleteOne({ _id: toObjectId(req.params.id) });
        res.json({ message: 'Block deleted' });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

// Plots
const updatePlot = async (req, res) => {
    try {
        const { id } = req.params;
        const { plotNumber, address, size, blockId, primaryLandOwnerId } = req.body;
        if (!toObjectId(id)) return res.status(400).json({ message: 'Invalid id' });
        const updateDoc = { updatedAt: new Date() };
        if (plotNumber !== undefined) updateDoc.plotNumber = String(plotNumber).trim();
        if (address !== undefined) updateDoc.address = String(address).trim();
        if (size !== undefined) updateDoc.size = parseNumber(size);
        if (blockId) updateDoc.blockId = toObjectId(blockId);
        if (primaryLandOwnerId) updateDoc.primaryLandOwnerId = toObjectId(primaryLandOwnerId);
        await getDB().collection('plots').updateOne({ _id: toObjectId(id) }, { $set: updateDoc });
        res.json({ message: 'Plot updated' });
    } catch (e) { res.status(500).json({ message: e.message }); }
};
const deletePlot = async (req, res) => {
    try {
        if (!toObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
        await getDB().collection('plots').deleteOne({ _id: toObjectId(req.params.id) });
        res.json({ message: 'Plot deleted' });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

// Buildings
const updateBuilding = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, totalFloors, plotId } = req.body;
        if (!toObjectId(id)) return res.status(400).json({ message: 'Invalid id' });
        const updateDoc = { updatedAt: new Date() };
        if (name !== undefined) updateDoc.name = String(name).trim();
        if (totalFloors !== undefined) updateDoc.totalFloors = parseNumber(totalFloors);
        if (plotId) updateDoc.plotId = toObjectId(plotId);
        await getDB().collection('buildings').updateOne({ _id: toObjectId(id) }, { $set: updateDoc });
        res.json({ message: 'Building updated' });
    } catch (e) { res.status(500).json({ message: e.message }); }
};
const deleteBuilding = async (req, res) => {
    try {
        if (!toObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
        await getDB().collection('buildings').deleteOne({ _id: toObjectId(req.params.id) });
        res.json({ message: 'Building deleted' });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

// Floors
const updateFloor = async (req, res) => {
    try {
        const { id } = req.params;
        const { floorNumber, buildingId } = req.body;
        if (!toObjectId(id)) return res.status(400).json({ message: 'Invalid id' });
        const updateDoc = { updatedAt: new Date() };
        if (floorNumber !== undefined) updateDoc.floorNumber = parseNumber(floorNumber);
        if (buildingId) updateDoc.buildingId = toObjectId(buildingId);
        await getDB().collection('floors').updateOne({ _id: toObjectId(id) }, { $set: updateDoc });
        res.json({ message: 'Floor updated' });
    } catch (e) { res.status(500).json({ message: e.message }); }
};
const deleteFloor = async (req, res) => {
    try {
        if (!toObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
        await getDB().collection('floors').deleteOne({ _id: toObjectId(req.params.id) });
        res.json({ message: 'Floor deleted' });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

// Units
const updateUnit = async (req, res) => {
    try {
        const { id } = req.params;
        const { unitNumber, type, status, price, size, bedrooms, bathrooms, floorId, flatOwnerId } = req.body;
        if (!toObjectId(id)) return res.status(400).json({ message: 'Invalid id' });
        const updateDoc = { updatedAt: new Date() };
        if (unitNumber !== undefined) updateDoc.unitNumber = String(unitNumber).trim();
        if (type !== undefined) updateDoc.type = String(type).trim();
        if (status !== undefined) updateDoc.status = String(status).trim();
        if (price !== undefined) updateDoc.price = parseNumber(price);
        if (size !== undefined) updateDoc.size = parseNumber(size);
        if (bedrooms !== undefined) updateDoc.bedrooms = parseNumber(bedrooms);
        if (bathrooms !== undefined) updateDoc.bathrooms = parseNumber(bathrooms);
        if (floorId) updateDoc.floorId = toObjectId(floorId);
        if (flatOwnerId) updateDoc.flatOwnerId = toObjectId(flatOwnerId);
        
        await getDB().collection('units').updateOne({ _id: toObjectId(id) }, { $set: updateDoc });
        res.json({ message: 'Unit updated' });
    } catch (e) { res.status(500).json({ message: e.message }); }
};
const deleteUnit = async (req, res) => {
    try {
        if (!toObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
        await getDB().collection('units').deleteOne({ _id: toObjectId(req.params.id) });
        res.json({ message: 'Unit deleted' });
    } catch (e) { res.status(500).json({ message: e.message }); }
};
`;

// Insert crudString before module.exports
content = content.replace(/module\.exports\s*=\s*\{/, crudString + '\nmodule.exports = {');

// Update exports to include the new functions
const exportReplacements = `
    updateZone, deleteZone,
    updateBlock, deleteBlock,
    updatePlot, deletePlot,
    updateBuilding, deleteBuilding,
    updateFloor, deleteFloor,
    updateUnit, deleteUnit,
`;
content = content.replace(/module\.exports\s*=\s*\{/, 'module.exports = {' + exportReplacements);

// Also add a permission check middleware logic wrapper for admin routes, but wait, the prompt says "Ensure both Central Admin and Sub-admin (with permission) can perform these operations."
// We can do this in the router or controller. We will just overwrite adminController.js first.

fs.writeFileSync(targetPath, content);
console.log('Successfully updated adminController.js');
