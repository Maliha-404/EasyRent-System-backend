const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/adminController');
const { authenticate, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(authenticate, authorizeRoles('admin'));

router.get('/overview', getAdminOverview);
router.get('/users', getAllUsersForAdmin);
router.patch('/users/:id/status', updateUserStatusByAdmin);

router.get('/zones', getZones);
router.post('/zones', createZone);

router.get('/blocks', getBlocks);
router.post('/blocks', createBlock);

router.get('/plots', getPlots);
router.post('/plots', createPlot);

router.get('/buildings', getBuildings);
router.post('/buildings', createBuilding);

router.get('/floors', getFloors);
router.post('/floors', createFloor);

router.get('/units', getUnits);
router.post('/units', createUnit);

module.exports = router;
