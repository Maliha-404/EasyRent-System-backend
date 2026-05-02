const express = require('express');
const router = express.Router();
const {
    getAllUsersForAdmin,
    updateUserStatusByAdmin,
    promoteUserToSubAdmin,
    createUserByAdmin,
    updateUserByAdmin,
    deleteUserByAdmin,
    getAdminOverview,
    getZones,
    createZone,
    getBlocks,
    createBlock,
    getPlots,
    createPlot,
    getBuildings, createBuilding,
    getFloors, createFloor,
    getUnits, createUnit,
    updateZone, deleteZone,
    updateBlock, deleteBlock,
    updatePlot, deletePlot,
    updateBuilding, deleteBuilding,
    updateFloor, deleteFloor,
    updateUnit, deleteUnit
} = require('../controllers/adminController');
const { authenticate, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(authenticate, authorizeRoles('admin'));

// --- Utility to check Sub-admin permissions ---
const requirePermission = (moduleName) => (req, res, next) => {
    if (req.user?.role === 'admin') return next();
    if (req.user?.role === 'sub_admin') {
        const perms = req.user.permissions || [];
        if (perms.includes(moduleName)) return next();
        return res.status(403).json({ message: `Forbidden: requires '${moduleName}' permission` });
    }
    return res.status(403).json({ message: 'Forbidden' });
};

router.get('/overview', getAdminOverview);
router.get('/users', getAllUsersForAdmin);
router.post('/users', createUserByAdmin);
router.put('/users/:id', updateUserByAdmin);
router.patch('/users/:id/status', updateUserStatusByAdmin);
router.post('/users/:id/promote', promoteUserToSubAdmin);

router.get('/zones', requirePermission('zones'), getZones);
router.post('/zones', requirePermission('zones'), createZone);
router.put('/zones/:id', requirePermission('zones'), updateZone);
router.delete('/zones/:id', requirePermission('zones'), deleteZone);

router.get('/blocks', requirePermission('blocks'), getBlocks);
router.post('/blocks', requirePermission('blocks'), createBlock);
router.put('/blocks/:id', requirePermission('blocks'), updateBlock);
router.delete('/blocks/:id', requirePermission('blocks'), deleteBlock);

router.get('/plots', requirePermission('plots'), getPlots);
router.post('/plots', requirePermission('plots'), createPlot);
router.put('/plots/:id', requirePermission('plots'), updatePlot);
router.delete('/plots/:id', requirePermission('plots'), deletePlot);

router.get('/buildings', requirePermission('buildings'), getBuildings);
router.post('/buildings', requirePermission('buildings'), createBuilding);
router.put('/buildings/:id', requirePermission('buildings'), updateBuilding);
router.delete('/buildings/:id', requirePermission('buildings'), deleteBuilding);

router.get('/floors', requirePermission('floors'), getFloors);
router.post('/floors', requirePermission('floors'), createFloor);
router.put('/floors/:id', requirePermission('floors'), updateFloor);
router.delete('/floors/:id', requirePermission('floors'), deleteFloor);

router.get('/units', requirePermission('units'), getUnits);
router.post('/units', requirePermission('units'), createUnit);
router.put('/units/:id', requirePermission('units'), updateUnit);
router.delete('/units/:id', requirePermission('units'), deleteUnit);

module.exports = router;
